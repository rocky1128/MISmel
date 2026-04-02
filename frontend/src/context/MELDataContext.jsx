import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { evidenceBucket, supabase } from "../lib/supabaseClient";
import { derivePillar, getPerformanceScore, slugify } from "../lib/melAnalytics";
import {
  runIndicatorEngine,
  computeAssetScores,
  buildSignalBlocks,
  buildDomainSummary
} from "../lib/indicatorEngine";

const MELDataContext = createContext(null);

export function MELDataProvider({ children }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [objectives, setObjectives] = useState([]);
  const [activities, setActivities] = useState([]);
  const [indicators, setIndicators] = useState([]);
  const [evidence, setEvidence] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [periods, setPeriods] = useState([]);
  const [users, setUsers] = useState([]);
  const [assets, setAssets] = useState([]);
  const [metrics, setMetrics] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [activePeriodId, setActivePeriodId] = useState(null);

  // NEW: Multi-source data
  const [participants, setParticipants] = useState([]);
  const [episodes, setEpisodes] = useState([]);
  const [surveyResponses, setSurveyResponses] = useState([]);
  const [followUpData, setFollowUpData] = useState([]);
  const [governedIndicators, setGovernedIndicators] = useState([]);
  const [indicatorResults, setIndicatorResults] = useState([]);
  const [assetScoresData, setAssetScoresData] = useState([]);
  const [indicatorApprovals, setIndicatorApprovals] = useState([]);
  // Strategic layer
  const [goals, setGoals] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [learningLogs, setLearningLogs] = useState([]);
  const [indicatorDisaggregation, setIndicatorDisaggregation] = useState([]);

  const loadAll = useCallback(async () => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [
        actRes, objRes, profRes, deptRes, indRes, evRes,
        checkinRes, ivRes, perRes, assetRes, metRes, subRes,
        // NEW data sources
        partRes, epRes, surveyRes, followRes,
        govIndRes, indResultsRes, assetScoresRes, approvalsRes,
        // Strategic layer (014)
        goalsRes, programsRes, learningRes, disaggRes
      ] = await Promise.all([
        supabase.from("activities").select("*"),
        supabase.from("objectives").select("id, code, title, goal_id, description, weight"),
        supabase.from("profiles").select("id, full_name, email, role, department_id"),
        supabase.from("departments").select("id, name, type"),
        supabase.from("indicators").select("*"),
        supabase.from("evidence_items").select("*"),
        supabase.from("monthly_checkins").select("*"),
        supabase.from("indicator_values").select("*"),
        supabase.from("reporting_periods").select("*").order("start_date", { ascending: false }),
        supabase.from("assets").select("*"),
        supabase.from("metrics").select("*").order("date", { ascending: false }).limit(2000),
        supabase.from("submissions_log").select("*").order("created_at", { ascending: false }).limit(200),
        // NEW tables
        supabase.from("participants").select("*").order("registration_date", { ascending: false }),
        supabase.from("episodes").select("*").order("air_date", { ascending: false }),
        supabase.from("survey_responses").select("*").order("survey_date", { ascending: false }),
        supabase.from("follow_up_data").select("*").order("follow_up_date", { ascending: false }),
        supabase.from("governed_indicators").select("*").order("created_at", { ascending: false }),
        supabase.from("indicator_results").select("*").order("computed_at", { ascending: false }),
        supabase.from("asset_scores").select("*").order("computed_at", { ascending: false }),
        supabase.from("indicator_approvals").select("*").order("created_at", { ascending: false }),
        // Strategic layer (migration 014 — graceful if not migrated yet)
        supabase.from("goals").select("*").order("code"),
        supabase.from("programs").select("*").order("name"),
        supabase.from("learning_logs").select("*").order("created_at", { ascending: false }),
        supabase.from("indicator_disaggregation").select("*").order("created_at", { ascending: false }).limit(500)
      ]);

      // Check original tables for errors (new tables may not exist yet — handle gracefully)
      const coreResults = [actRes, objRes, profRes, deptRes, indRes, evRes, checkinRes, ivRes, perRes, assetRes, metRes, subRes];
      const failed = coreResults.find((result) => result.error);
      if (failed?.error) {
        setError(failed.error.message);
        setLoading(false);
        return;
      }

      const objectivesMap = new Map((objRes.data ?? []).map((o) => [o.id, o]));
      const profilesMap = new Map((profRes.data ?? []).map((p) => [p.id, p.full_name]));
      const departmentsMap = new Map((deptRes.data ?? []).map((d) => [d.id, d.name]));
      const assetsMap = new Map((assetRes.data ?? []).map((a) => [a.id, a.name]));

      const latestCheckin = new Map();
      for (const checkin of checkinRes.data ?? []) {
        const current = latestCheckin.get(checkin.activity_id);
        if (!current || new Date(checkin.submitted_at) > new Date(current.submitted_at)) {
          latestCheckin.set(checkin.activity_id, checkin);
        }
      }

      const indicatorValuesMap = new Map();
      for (const value of ivRes.data ?? []) {
        indicatorValuesMap.set(value.indicator_id, value.actual_value);
      }

      const normalizedAssets = (assetRes.data ?? []).map((asset) => ({
        id: asset.id,
        name: asset.name,
        type: asset.type,
        description: asset.description,
        slug: slugify(asset.name)
      }));
      setAssets(normalizedAssets);

      const openPeriod = (perRes.data ?? []).find((p) => p.status === "open");
      setActivePeriodId(openPeriod?.id ?? null);

      setObjectives((objRes.data ?? []).map((o) => ({
        id: o.id,
        code: o.code,
        title: o.title ?? o.code,
        goalId: o.goal_id,
        description: o.description,
        weight: o.weight
      })));

      setGoals((goalsRes.data ?? []).map((g) => ({
        id: g.id,
        code: g.code,
        title: g.title,
        description: g.description,
        weight: g.weight,
        startYear: g.start_year,
        endYear: g.end_year,
        createdAt: g.created_at
      })));

      setPrograms((programsRes.data ?? []).map((p) => ({
        id: p.id,
        name: p.name,
        code: p.code,
        description: p.description,
        model: p.model,
        status: p.status,
        startDate: p.start_date,
        endDate: p.end_date
      })));

      setLearningLogs((learningRes.data ?? []).map((l) => ({
        id: l.id,
        type: l.type,
        title: l.title,
        content: l.content,
        goalId: l.goal_id,
        programId: l.program_id,
        tags: l.tags ?? [],
        submittedBy: profilesMap.get(l.submitted_by) ?? "Unknown",
        submittedById: l.submitted_by,
        createdAt: l.created_at,
        updatedAt: l.updated_at
      })));

      setIndicatorDisaggregation(disaggRes.data ?? []);

      const normalizedActivities = (actRes.data ?? []).map((activity) => {
        const objective = objectivesMap.get(activity.objective_id);
        const collaboration = activity.collaboration_text ?? departmentsMap.get(activity.department_id) ?? "";
        const normalized = {
          id: activity.id,
          objectiveId: activity.objective_id,
          objectiveCode: objective?.code ?? "",
          title: activity.title,
          description: activity.description,
          collaboration,
          weight: Number(activity.weight) > 1 ? Number(activity.weight) / 100 : Number(activity.weight),
          status: activity.status,
          statusLabel: formatStatus(activity.status),
          progress: latestCheckin.get(activity.id)?.percent_complete ?? 0,
          owner: profilesMap.get(activity.owner_id) ?? "Unassigned",
          startMonth: activity.planned_start_month,
          endMonth: activity.planned_end_month,
          year: activity.planned_year
        };
        return {
          ...normalized,
          pillar: derivePillar({
            code: normalized.objectiveCode,
            title: normalized.title,
            description: normalized.description,
            department: normalized.collaboration
          })
        };
      });
      setActivities(normalizedActivities);

      const normalizedIndicators = (indRes.data ?? []).map((indicator) => {
        const actual = indicatorValuesMap.get(indicator.id) ?? null;
        const assetName = indicator.asset_id ? assetsMap.get(indicator.asset_id) : null;
        const normalized = {
          id: indicator.id,
          code: indicator.code,
          name: indicator.name,
          frequency: indicator.frequency,
          baseline: indicator.baseline_value,
          target: indicator.target_value,
          actual,
          owner: profilesMap.get(indicator.owner_id) ?? "Unassigned",
          kpiCategory: indicator.kpi_category ?? "institutional",
          indicatorType: indicator.indicator_type ?? "output",
          unit: indicator.unit ?? "count",
          assetId: indicator.asset_id,
          assetName,
          entryMethod: indicator.entry_method ?? "manual",
          department: indicator.department,
          indicatorStatus: indicator.indicator_status ?? "active",
          formula: indicator.formula
        };
        return {
          ...normalized,
          pillar: derivePillar({
            code: normalized.code,
            name: normalized.name,
            assetName,
            department: normalized.department,
            kpiCategory: normalized.kpiCategory,
            indicatorType: normalized.indicatorType
          }),
          performanceScore: getPerformanceScore(actual, normalized.target)
        };
      });
      setIndicators(normalizedIndicators);

      setDepartments((deptRes.data ?? []).map((d) => ({
        id: d.id, name: d.name, type: d.type
      })));

      setPeriods((perRes.data ?? []).map((p) => ({
        id: p.id, name: p.name, startDate: p.start_date, endDate: p.end_date, status: p.status
      })));

      setUsers((profRes.data ?? []).map((p) => ({
        id: p.id, fullName: p.full_name, email: p.email, role: p.role,
        department: departmentsMap.get(p.department_id) ?? "Unassigned"
      })));

      setMetrics((metRes.data ?? []).map((m) => ({
        id: m.id, name: m.name, source: m.source, assetId: m.asset_id,
        assetName: m.asset_id ? assetsMap.get(m.asset_id) : null,
        date: m.date, value: Number(m.value), metadata: m.metadata, contentKey: m.content_key ?? m.metadata?.video_id ?? null
      })));

      setSubmissions((subRes.data ?? []).map((s) => ({
        id: s.id, userId: s.user_id, userName: profilesMap.get(s.user_id) ?? "Unknown",
        action: s.action, entityType: s.entity_type, entityId: s.entity_id,
        changes: s.changes, approvalStatus: s.approval_status ?? "pending",
        approvedBy: s.approved_by ? profilesMap.get(s.approved_by) : null,
        notes: s.notes, createdAt: s.created_at
      })));

      const activityTitles = new Map((actRes.data ?? []).map((a) => [a.id, a.title]));
      const indicatorNames = new Map((indRes.data ?? []).map((i) => [i.id, i.name]));

      setEvidence((evRes.data ?? []).map((item) => ({
        id: item.id,
        title: item.title,
        description: item.description ?? "",
        linkedTo: activityTitles.get(item.activity_id) ?? indicatorNames.get(item.indicator_id) ?? "Unlinked",
        type: item.evidence_type,
        period: openPeriod?.name ?? "",
        submittedBy: profilesMap.get(item.submitted_by) ?? "Unknown",
        verificationStatus: item.verification_status === "verified" ? "Verified" : item.verification_status === "rejected" ? "Rejected" : "Pending"
      })));

      // NEW: Set multi-source data (gracefully handle missing tables)
      setParticipants(partRes.data ?? []);
      setEpisodes(epRes.data ?? []);
      setSurveyResponses(surveyRes.data ?? []);
      setFollowUpData(followRes.data ?? []);
      setGovernedIndicators((govIndRes.data ?? []).map((gi) => ({
        ...gi,
        asset_name: gi.asset_id ? assetsMap.get(gi.asset_id) : null,
        created_by_name: gi.created_by ? profilesMap.get(gi.created_by) : null,
        approved_by_name: gi.approved_by ? profilesMap.get(gi.approved_by) : null
      })));
      setIndicatorResults(indResultsRes.data ?? []);
      setAssetScoresData(assetScoresRes.data ?? []);
      setIndicatorApprovals(approvalsRes.data ?? []);

    } catch (caughtError) {
      setError(caughtError.message);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // ===== DATA SOURCES BUNDLE (for indicator engine) =====
  const dataSources = useMemo(() => ({
    episodes,
    participants,
    survey_responses: surveyResponses,
    follow_up_data: followUpData
  }), [episodes, participants, surveyResponses, followUpData]);

  // ===== COMPUTED: Run indicator engine on governed indicators =====
  const computedResults = useMemo(() => {
    const activeGov = governedIndicators.filter((i) => i.status === "active" || i.status === "approved");
    if (!activeGov.length) return [];
    const currentPeriodName = periods.find((p) => p.status === "open")?.name ?? "unconfigured period";
    return runIndicatorEngine(activeGov, dataSources, currentPeriodName);
  }, [governedIndicators, dataSources, periods]);

  // ===== COMPUTED: Asset scores =====
  const computedAssetScores = useMemo(
    () => computeAssetScores(computedResults, assets),
    [computedResults, assets]
  );

  // ===== COMPUTED: Signal blocks for executive dashboard =====
  const signalBlocks = useMemo(
    () => buildSignalBlocks(computedResults, dataSources),
    [computedResults, dataSources]
  );

  // ===== COMPUTED: Domain summary =====
  const domainSummary = useMemo(
    () => buildDomainSummary(computedResults),
    [computedResults]
  );

  // ===== MUTATIONS =====

  async function submitIndicatorValue(payload) {
    const periodId = payload.reporting_period_id ?? activePeriodId;
    if (!periodId) return { success: false, error: { message: "No active reporting period. Create one in Settings first." } };
    const { error: submitError } = await supabase
      .from("indicator_values")
      .upsert(
        {
          indicator_id: payload.indicator_id,
          reporting_period_id: periodId,
          actual_value: Number(payload.actual_value),
          comment: payload.comment ?? null
        },
        { onConflict: "indicator_id,reporting_period_id" }
      );
    if (submitError) return { success: false, error: submitError };
    await loadAll();
    return { success: true };
  }

  async function submitBulkMetrics(data) {
    const { error: insertError } = await supabase
      .from("metrics")
      .upsert(data, { onConflict: "name,source,asset_id,date,content_key" });
    if (insertError) return { success: false, error: insertError };
    await loadAll();
    return { success: true };
  }

  async function submitMediaMetrics(data) {
    return submitBulkMetrics(data);
  }

  async function createActivity(payload) {
    const { data, error: insertError } = await supabase.from("activities").insert(payload).select("id").single();
    if (insertError) return { success: false, error: insertError };
    await loadAll();
    return { success: true, id: data.id };
  }

  async function submitCheckin(payload) {
    const { error: upsertError } = await supabase.from("monthly_checkins").upsert(payload, { onConflict: "activity_id,month,year" });
    if (upsertError) return { success: false, error: upsertError };
    await loadAll();
    return { success: true };
  }

  async function addEvidence(payload) {
    const periodId = payload.reporting_period_id ?? activePeriodId;
    if (!periodId) return { success: false, error: { message: "No active reporting period. Create one in Settings first." } };
    const insert = { ...payload, reporting_period_id: periodId };
    if (payload.file) {
      const path = `${periodId}/${Date.now()}-${payload.file.name.replace(/[^a-zA-Z0-9._-]/g, "-")}`;
      const { error: uploadError } = await supabase.storage.from(evidenceBucket).upload(path, payload.file);
      if (uploadError) return { success: false, error: uploadError };
      insert.file_path = path;
    }
    delete insert.file;
    const { error: insertError } = await supabase.from("evidence_items").insert(insert);
    if (insertError) return { success: false, error: insertError };
    await loadAll();
    return { success: true };
  }

  async function addSubmissionLog(payload) {
    await supabase.from("submissions_log").insert({
      action: payload.action,
      entity_type: payload.entityType,
      entity_id: payload.entityId ?? null,
      changes: payload.changes ?? {},
      notes: payload.notes ?? null
    });
    await loadAll();
  }

  async function createDepartment(payload) {
    const { error: insertError } = await supabase.from("departments").insert({ name: payload.name, type: payload.type ?? null });
    if (insertError) return { success: false, error: insertError };
    await loadAll();
    return { success: true };
  }

  async function createReportingPeriod(payload) {
    if (payload.status === "open") {
      await supabase.from("reporting_periods").update({ status: "locked" }).eq("status", "open");
    }
    const { error: insertError } = await supabase.from("reporting_periods").insert(payload);
    if (insertError) return { success: false, error: insertError };
    await loadAll();
    return { success: true };
  }

  async function updateUserRole(payload) {
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ role: payload.role, department_id: payload.department_id ?? null })
      .eq("id", payload.user_id);
    if (updateError) return { success: false, error: updateError };
    await loadAll();
    return { success: true };
  }

  // ===== NEW MUTATIONS =====

  async function createGovernedIndicator(payload) {
    const { data, error: insertError } = await supabase
      .from("governed_indicators")
      .insert({
        ...payload,
        status: "draft",
        version: 1
      })
      .select("id")
      .single();
    if (insertError) return { success: false, error: insertError };
    await addSubmissionLog({
      action: "created_indicator",
      entityType: "governed_indicator",
      entityId: data.id,
      changes: payload
    });
    await loadAll();
    return { success: true, id: data.id };
  }

  async function submitIndicatorForApproval(indicatorId) {
    const { error: updateError } = await supabase
      .from("governed_indicators")
      .update({ status: "submitted" })
      .eq("id", indicatorId);
    if (updateError) return { success: false, error: updateError };
    await supabase.from("indicator_approvals").insert({
      indicator_id: indicatorId,
      action: "submitted",
      from_status: "draft",
      to_status: "submitted"
    });
    await loadAll();
    return { success: true };
  }

  async function approveIndicator(indicatorId) {
    const { error: updateError } = await supabase
      .from("governed_indicators")
      .update({ status: "active", approved_at: new Date().toISOString() })
      .eq("id", indicatorId);
    if (updateError) return { success: false, error: updateError };
    await supabase.from("indicator_approvals").insert({
      indicator_id: indicatorId,
      action: "approved",
      from_status: "submitted",
      to_status: "active"
    });
    await loadAll();
    return { success: true };
  }

  async function rejectIndicator(indicatorId, reason) {
    const { error: updateError } = await supabase
      .from("governed_indicators")
      .update({ status: "draft", rejection_reason: reason })
      .eq("id", indicatorId);
    if (updateError) return { success: false, error: updateError };
    await supabase.from("indicator_approvals").insert({
      indicator_id: indicatorId,
      action: "rejected",
      from_status: "submitted",
      to_status: "draft",
      reason
    });
    await loadAll();
    return { success: true };
  }

  async function deprecateIndicator(indicatorId) {
    const { error: updateError } = await supabase
      .from("governed_indicators")
      .update({ status: "deprecated", deprecated_at: new Date().toISOString() })
      .eq("id", indicatorId);
    if (updateError) return { success: false, error: updateError };
    await supabase.from("indicator_approvals").insert({
      indicator_id: indicatorId,
      action: "deprecated",
      from_status: "active",
      to_status: "deprecated"
    });
    await loadAll();
    return { success: true };
  }

  async function submitSurveyResponse(payload) {
    const { error: insertError } = await supabase.from("survey_responses").insert(payload);
    if (insertError) return { success: false, error: insertError };
    await loadAll();
    return { success: true };
  }

  async function submitBulkSurveys(data) {
    const { error: insertError } = await supabase.from("survey_responses").insert(data);
    if (insertError) return { success: false, error: insertError };
    await loadAll();
    return { success: true };
  }

  async function submitFollowUp(payload) {
    const { error: insertError } = await supabase.from("follow_up_data").insert(payload);
    if (insertError) return { success: false, error: insertError };
    await loadAll();
    return { success: true };
  }

  async function submitParticipant(payload) {
    const { error: insertError } = await supabase.from("participants").insert(payload);
    if (insertError) return { success: false, error: insertError };
    await loadAll();
    return { success: true };
  }

  async function submitBulkParticipants(data) {
    const { error: insertError } = await supabase.from("participants").insert(data);
    if (insertError) return { success: false, error: insertError };
    await loadAll();
    return { success: true };
  }

  // ===== LEARNING LOG MUTATIONS =====

  async function createLearningLog(payload) {
    const { data, error: insertError } = await supabase
      .from("learning_logs")
      .insert({
        type: payload.type,
        title: payload.title,
        content: payload.content,
        goal_id: payload.goalId ?? null,
        program_id: payload.programId ?? null,
        tags: payload.tags ?? []
      })
      .select("id")
      .single();
    if (insertError) return { success: false, error: insertError };
    await loadAll();
    return { success: true, id: data.id };
  }

  async function updateLearningLog(id, payload) {
    const { error: updateError } = await supabase
      .from("learning_logs")
      .update({
        type: payload.type,
        title: payload.title,
        content: payload.content,
        goal_id: payload.goalId ?? null,
        program_id: payload.programId ?? null,
        tags: payload.tags ?? []
      })
      .eq("id", id);
    if (updateError) return { success: false, error: updateError };
    await loadAll();
    return { success: true };
  }

  async function deleteLearningLog(id) {
    const { error: deleteError } = await supabase.from("learning_logs").delete().eq("id", id);
    if (deleteError) return { success: false, error: deleteError };
    await loadAll();
    return { success: true };
  }

  // ===== PROGRAM MUTATIONS =====

  async function createProgram(payload) {
    const { data, error: insertError } = await supabase
      .from("programs")
      .insert({
        name: payload.name,
        code: payload.code ?? null,
        description: payload.description ?? null,
        model: payload.model ?? null,
        status: payload.status ?? "active",
        start_date: payload.startDate ?? null,
        end_date: payload.endDate ?? null
      })
      .select("id")
      .single();
    if (insertError) return { success: false, error: insertError };
    await loadAll();
    return { success: true, id: data.id };
  }

  async function submitBulkEpisodes(data) {
    const { error: insertError } = await supabase.from("episodes").insert(data);
    if (insertError) return { success: false, error: insertError };
    await loadAll();
    return { success: true };
  }

  // ===== PERSIST COMPUTED RESULTS TO DB =====
  async function persistIndicatorResults(results) {
    if (!results.length) return { success: true };
    const rows = results.map((r) => ({
      indicator_id: r.indicator_id,
      version_id: r.version_id,
      period: r.period,
      value: r.value,
      numerator: r.numerator,
      denominator: r.denominator,
      target: r.target,
      performance: r.performance,
      status: r.status,
      data_points_used: r.data_points_used,
      data_coverage: r.data_coverage
    }));
    const { error: upsertError } = await supabase
      .from("indicator_results")
      .upsert(rows, { onConflict: "indicator_id,period" });
    if (upsertError) return { success: false, error: upsertError };
    await loadAll();
    return { success: true };
  }

  const value = useMemo(
    () => ({
      loading, error,
      // Original data
      objectives, activities, indicators, evidence, departments, periods, users,
      assets, metrics, submissions, activePeriodId,
      currentPeriod: periods.find((p) => p.status === "open")?.name ?? "No active reporting period",
      // NEW: Multi-source data
      participants, episodes, surveyResponses, followUpData,
      governedIndicators, indicatorResults: indicatorResults, assetScoresData,
      indicatorApprovals,
      // NEW: Computed engine outputs
      dataSources, computedResults, computedAssetScores, signalBlocks, domainSummary,
      // Strategic layer (014)
      goals, programs, learningLogs, indicatorDisaggregation,
      // Original mutations
      submitIndicatorValue, submitBulkMetrics, createActivity, submitCheckin,
      submitMediaMetrics,
      addEvidence, addSubmissionLog, createDepartment, createReportingPeriod, updateUserRole,
      // NEW mutations
      createGovernedIndicator, submitIndicatorForApproval, approveIndicator,
      rejectIndicator, deprecateIndicator,
      submitSurveyResponse, submitBulkSurveys, submitFollowUp,
      submitParticipant, submitBulkParticipants, submitBulkEpisodes,
      persistIndicatorResults,
      // Learning + program mutations (014)
      createLearningLog, updateLearningLog, deleteLearningLog, createProgram,
      reload: loadAll
    }),
    [
      loading, error, objectives, activities, indicators, evidence, departments, periods, users,
      assets, metrics, submissions, activePeriodId,
      participants, episodes, surveyResponses, followUpData,
      governedIndicators, indicatorResults, assetScoresData, indicatorApprovals,
      dataSources, computedResults, computedAssetScores, signalBlocks, domainSummary,
      goals, programs, learningLogs, indicatorDisaggregation,
      loadAll
    ]
  );

  return <MELDataContext.Provider value={value}>{children}</MELDataContext.Provider>;
}

export function useMELDataContext() {
  const context = useContext(MELDataContext);
  if (!context) {
    throw new Error("useMELDataContext must be used within MELDataProvider");
  }
  return context;
}

function formatStatus(status) {
  return (status || "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
