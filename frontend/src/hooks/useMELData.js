import { useEffect, useMemo, useState } from "react";
import { supabase, evidenceBucket } from "../lib/supabaseClient";
import { calculateWeightedScore, countByStatus } from "../lib/scoreUtils";

export default function useMELData() {
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

  useEffect(() => {
    if (!supabase) { setLoading(false); return; }
    loadAll();
  }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const [
        actRes, objRes, profRes, deptRes, indRes, evRes,
        checkinRes, ivRes, perRes, assetRes, metRes, subRes
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

      const all = [actRes, objRes, profRes, deptRes, indRes, evRes, checkinRes, ivRes, perRes, assetRes, metRes, subRes];
      const fail = all.find(r => r.error);
      if (fail?.error) { setError(fail.error.message); setLoading(false); return; }

      const objMap = new Map((objRes.data ?? []).map(o => [o.id, o]));
      const profMap = new Map((profRes.data ?? []).map(p => [p.id, p.full_name]));
      const deptMap = new Map((deptRes.data ?? []).map(d => [d.id, d.name]));
      const assetMap = new Map((assetRes.data ?? []).map(a => [a.id, a.name]));

      const latestCheckin = new Map();
      for (const c of checkinRes.data ?? []) {
        const cur = latestCheckin.get(c.activity_id);
        if (!cur || new Date(c.submitted_at) > new Date(cur.submitted_at))
          latestCheckin.set(c.activity_id, c);
      }

      const ivMap = new Map();
      for (const v of ivRes.data ?? []) ivMap.set(v.indicator_id, v.actual_value);

      setActivities((actRes.data ?? []).map(a => ({
        id: a.id, objectiveId: a.objective_id,
        objectiveCode: objMap.get(a.objective_id)?.code ?? "",
        title: a.title, description: a.description,
        collaboration: a.collaboration_text ?? deptMap.get(a.department_id) ?? "",
        weight: Number(a.weight) > 1 ? Number(a.weight) / 100 : Number(a.weight),
        status: a.status,
        statusLabel: fmtStatus(a.status),
        progress: latestCheckin.get(a.id)?.percent_complete ?? 0,
        owner: profMap.get(a.owner_id) ?? "Unassigned",
        startMonth: a.planned_start_month, endMonth: a.planned_end_month,
        year: a.planned_year
      })));

      setObjectives((objRes.data ?? []).map(o => ({ id: o.id, code: o.code, title: o.title ?? o.code })));

      setIndicators((indRes.data ?? []).map(i => ({
        id: i.id, code: i.code, name: i.name, frequency: i.frequency,
        baseline: i.baseline_value, target: i.target_value,
        actual: ivMap.get(i.id) ?? null,
        owner: profMap.get(i.owner_id) ?? "Unassigned",
        kpiCategory: i.kpi_category ?? "institutional",
        indicatorType: i.indicator_type ?? "output",
        unit: i.unit ?? "count",
        assetId: i.asset_id, assetName: i.asset_id ? assetMap.get(i.asset_id) : null,
        entryMethod: i.entry_method ?? "manual",
        department: i.department, indicatorStatus: i.indicator_status ?? "active",
        formula: i.formula
      })));

      setDepartments((deptRes.data ?? []).map(d => ({ id: d.id, name: d.name, type: d.type })));

      const openPeriod = (perRes.data ?? []).find(p => p.status === "open");
      if (openPeriod) setActivePeriodId(openPeriod.id);

      setPeriods((perRes.data ?? []).map(p => ({
        id: p.id, name: p.name, startDate: p.start_date, endDate: p.end_date, status: p.status
      })));

      setUsers((profRes.data ?? []).map(p => ({
        id: p.id, fullName: p.full_name, email: p.email, role: p.role,
        department: deptMap.get(p.department_id) ?? "Unassigned"
      })));

      setAssets((assetRes.data ?? []).map(a => ({
        id: a.id, name: a.name, type: a.type, description: a.description
      })));

      setMetrics((metRes.data ?? []).map(m => ({
        id: m.id, name: m.name, source: m.source,
        assetId: m.asset_id, assetName: m.asset_id ? assetMap.get(m.asset_id) : null,
        date: m.date, value: Number(m.value), metadata: m.metadata
      })));

      setSubmissions((subRes.data ?? []).map(s => ({
        id: s.id, userId: s.user_id, userName: profMap.get(s.user_id) ?? "Unknown",
        action: s.action, entityType: s.entity_type, entityId: s.entity_id,
        changes: s.changes, approvalStatus: s.approval_status ?? "pending",
        approvedBy: s.approved_by ? profMap.get(s.approved_by) : null,
        notes: s.notes, createdAt: s.created_at
      })));

      const actTitleMap = new Map((actRes.data ?? []).map(a => [a.id, a.title]));
      const indNameMap = new Map((indRes.data ?? []).map(i => [i.id, i.name]));

      setEvidence((evRes.data ?? []).map(e => ({
        id: e.id, title: e.title, description: e.description ?? "",
        linkedTo: actTitleMap.get(e.activity_id) ?? indNameMap.get(e.indicator_id) ?? "Unlinked",
        type: e.evidence_type, period: openPeriod?.name ?? "",
        submittedBy: profMap.get(e.submitted_by) ?? "Unknown",
        verificationStatus: e.verification_status === "verified" ? "Verified"
          : e.verification_status === "rejected" ? "Rejected" : "Pending"
      })));
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  }

  const dashboard = useMemo(() => ({
    weightedScore: calculateWeightedScore(activities),
    activeActivities: countByStatus(activities, "in_progress"),
    overdueActivities: countByStatus(activities, "overdue"),
    completedActivities: countByStatus(activities, "completed"),
    totalActivities: activities.length,
    totalIndicators: indicators.length,
    evidenceCompleteness: evidence.length
      ? Math.round((evidence.filter(e => e.verificationStatus === "Verified").length / evidence.length) * 100)
      : 0,
    totalMetrics: metrics.length,
    totalAssets: assets.length
  }), [activities, indicators, evidence, metrics, assets]);

  const currentPeriod = useMemo(
    () => periods.find(p => p.status === "open")?.name ?? "No open period",
    [periods]
  );

  async function submitIndicatorValue(payload) {
    const periodId = payload.reporting_period_id ?? activePeriodId;
    if (!periodId) return { success: false, error: { message: "No open reporting period." } };
    const { error } = await supabase
      .from("indicator_values")
      .upsert({ indicator_id: payload.indicator_id, reporting_period_id: periodId, actual_value: Number(payload.actual_value), comment: payload.comment ?? null },
        { onConflict: "indicator_id,reporting_period_id" });
    if (error) return { success: false, error };
    setIndicators(cur => cur.map(i => i.id === payload.indicator_id ? { ...i, actual: Number(payload.actual_value) } : i));
    return { success: true };
  }

  async function submitBulkMetrics(data) {
    const { error } = await supabase.from("metrics").insert(data);
    if (error) return { success: false, error };
    await loadAll();
    return { success: true };
  }

  async function createActivity(payload) {
    const { data, error } = await supabase.from("activities").insert(payload).select("id").single();
    if (error) return { success: false, error };
    await loadAll();
    return { success: true, id: data.id };
  }

  async function submitCheckin(payload) {
    const { error } = await supabase.from("monthly_checkins")
      .upsert(payload, { onConflict: "activity_id,month,year" });
    if (error) return { success: false, error };
    await loadAll();
    return { success: true };
  }

  async function addEvidence(payload) {
    const periodId = payload.reporting_period_id ?? activePeriodId;
    if (!periodId) return { success: false, error: { message: "No open reporting period." } };
    const insert = { ...payload, reporting_period_id: periodId };
    if (payload.file) {
      const path = `${periodId}/${Date.now()}-${payload.file.name.replace(/[^a-zA-Z0-9._-]/g, "-")}`;
      const { error: upErr } = await supabase.storage.from(evidenceBucket).upload(path, payload.file);
      if (upErr) return { success: false, error: upErr };
      insert.file_path = path;
    }
    delete insert.file;
    const { error } = await supabase.from("evidence_items").insert(insert);
    if (error) return { success: false, error };
    await loadAll();
    return { success: true };
  }

  async function addSubmissionLog(payload) {
    await supabase.from("submissions_log").insert({
      action: payload.action, entity_type: payload.entityType,
      entity_id: payload.entityId ?? null, changes: payload.changes ?? {},
      notes: payload.notes ?? null
    });
    await loadAll();
  }

  async function createDepartment(payload) {
    const { error } = await supabase.from("departments").insert({ name: payload.name, type: payload.type ?? null });
    if (error) return { success: false, error };
    await loadAll();
    return { success: true };
  }

  async function createReportingPeriod(payload) {
    if (payload.status === "open") {
      await supabase.from("reporting_periods").update({ status: "locked" }).eq("status", "open");
    }
    const { error } = await supabase.from("reporting_periods").insert(payload);
    if (error) return { success: false, error };
    await loadAll();
    return { success: true };
  }

  async function updateUserRole(payload) {
    const { error } = await supabase.from("profiles")
      .update({ role: payload.role, department_id: payload.department_id ?? null })
      .eq("id", payload.user_id);
    if (error) return { success: false, error };
    await loadAll();
    return { success: true };
  }

  return {
    loading, error, dashboard, currentPeriod,
    objectives, activities, indicators, evidence,
    departments, periods, users, assets, metrics, submissions,
    submitIndicatorValue, submitBulkMetrics, createActivity,
    submitCheckin, addEvidence, addSubmissionLog,
    createDepartment, createReportingPeriod, updateUserRole,
    reload: loadAll
  };
}

function fmtStatus(s) {
  return (s || "").replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}
