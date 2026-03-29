import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { evidenceBucket, supabase } from "../lib/supabaseClient";
import { derivePillar, getPerformanceScore, slugify } from "../lib/melAnalytics";

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

  const loadAll = useCallback(async () => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [
        actRes,
        objRes,
        profRes,
        deptRes,
        indRes,
        evRes,
        checkinRes,
        ivRes,
        perRes,
        assetRes,
        metRes,
        subRes
      ] = await Promise.all([
        supabase.from("activities").select("*"),
        supabase.from("objectives").select("id, code, title"),
        supabase.from("profiles").select("id, full_name, email, role, department_id"),
        supabase.from("departments").select("id, name, type"),
        supabase.from("indicators").select("*"),
        supabase.from("evidence_items").select("*"),
        supabase.from("monthly_checkins").select("*"),
        supabase.from("indicator_values").select("*"),
        supabase.from("reporting_periods").select("*").order("start_date", { ascending: false }),
        supabase.from("assets").select("*"),
        supabase.from("metrics").select("*").order("date", { ascending: false }).limit(2000),
        supabase.from("submissions_log").select("*").order("created_at", { ascending: false }).limit(200)
      ]);

      const allResults = [actRes, objRes, profRes, deptRes, indRes, evRes, checkinRes, ivRes, perRes, assetRes, metRes, subRes];
      const failed = allResults.find((result) => result.error);
      if (failed?.error) {
        setError(failed.error.message);
        setLoading(false);
        return;
      }

      const objectivesMap = new Map((objRes.data ?? []).map((objective) => [objective.id, objective]));
      const profilesMap = new Map((profRes.data ?? []).map((profile) => [profile.id, profile.full_name]));
      const departmentsMap = new Map((deptRes.data ?? []).map((department) => [department.id, department.name]));
      const assetsMap = new Map((assetRes.data ?? []).map((asset) => [asset.id, asset.name]));

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

      const openPeriod = (perRes.data ?? []).find((period) => period.status === "open");
      setActivePeriodId(openPeriod?.id ?? null);

      const normalizedObjectives = (objRes.data ?? []).map((objective) => ({
        id: objective.id,
        code: objective.code,
        title: objective.title ?? objective.code
      }));
      setObjectives(normalizedObjectives);

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

      setDepartments((deptRes.data ?? []).map((department) => ({
        id: department.id,
        name: department.name,
        type: department.type
      })));

      setPeriods((perRes.data ?? []).map((period) => ({
        id: period.id,
        name: period.name,
        startDate: period.start_date,
        endDate: period.end_date,
        status: period.status
      })));

      setUsers((profRes.data ?? []).map((profile) => ({
        id: profile.id,
        fullName: profile.full_name,
        email: profile.email,
        role: profile.role,
        department: departmentsMap.get(profile.department_id) ?? "Unassigned"
      })));

      setMetrics((metRes.data ?? []).map((metric) => ({
        id: metric.id,
        name: metric.name,
        source: metric.source,
        assetId: metric.asset_id,
        assetName: metric.asset_id ? assetsMap.get(metric.asset_id) : null,
        date: metric.date,
        value: Number(metric.value),
        metadata: metric.metadata
      })));

      setSubmissions((subRes.data ?? []).map((submission) => ({
        id: submission.id,
        userId: submission.user_id,
        userName: profilesMap.get(submission.user_id) ?? "Unknown",
        action: submission.action,
        entityType: submission.entity_type,
        entityId: submission.entity_id,
        changes: submission.changes,
        approvalStatus: submission.approval_status ?? "pending",
        approvedBy: submission.approved_by ? profilesMap.get(submission.approved_by) : null,
        notes: submission.notes,
        createdAt: submission.created_at
      })));

      const activityTitles = new Map((actRes.data ?? []).map((activity) => [activity.id, activity.title]));
      const indicatorNames = new Map((indRes.data ?? []).map((indicator) => [indicator.id, indicator.name]));

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
    } catch (caughtError) {
      setError(caughtError.message);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  async function submitIndicatorValue(payload) {
    const periodId = payload.reporting_period_id ?? activePeriodId;
    if (!periodId) return { success: false, error: { message: "No open reporting period." } };
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
    const { error: insertError } = await supabase.from("metrics").insert(data);
    if (insertError) return { success: false, error: insertError };
    await loadAll();
    return { success: true };
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
    if (!periodId) return { success: false, error: { message: "No open reporting period." } };
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

  const value = useMemo(
    () => ({
      loading,
      error,
      objectives,
      activities,
      indicators,
      evidence,
      departments,
      periods,
      users,
      assets,
      metrics,
      submissions,
      activePeriodId,
      currentPeriod: periods.find((period) => period.status === "open")?.name ?? "No open period",
      submitIndicatorValue,
      submitBulkMetrics,
      createActivity,
      submitCheckin,
      addEvidence,
      addSubmissionLog,
      createDepartment,
      createReportingPeriod,
      updateUserRole,
      reload: loadAll
    }),
    [activities, activePeriodId, assets, departments, error, evidence, indicators, loading, objectives, periods, submissions, users, metrics, loadAll]
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
  return (status || "").replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}
