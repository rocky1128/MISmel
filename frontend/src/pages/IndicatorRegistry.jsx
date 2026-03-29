import { useMemo, useState } from "react";
import { Check, Eye, Plus, Search, Send, Target, X } from "lucide-react";
import useMELData from "../hooks/useMELData";
import { calculatePerformance, getBadgeClass, getPerformanceLabel, getPerformanceStatus } from "../lib/scoreUtils";
import { MEL_DOMAINS, DATA_SOURCE_FIELDS } from "../lib/indicatorEngine";
import PageHeader from "../components/layout/PageHeader";
import SectionContainer from "../components/ui/SectionContainer";
import SearchSelect from "../components/ui/SearchSelect";
import { EmptyPanel, PageError, PageLoading } from "../components/ui/PageStates";

const LIFECYCLE_LABELS = {
  draft: { label: "Draft", badge: "badge-muted" },
  submitted: { label: "Submitted", badge: "badge-amber" },
  approved: { label: "Approved", badge: "badge-purple" },
  active: { label: "Active", badge: "badge-green" },
  deprecated: { label: "Deprecated", badge: "badge-red" }
};

const CALCULATION_TYPES = [
  { value: "sum", label: "Sum" },
  { value: "average", label: "Average" },
  { value: "count", label: "Count" },
  { value: "ratio", label: "Ratio (Numerator / Denominator \u00d7 100)" }
];

const AGGREGATION_LEVELS = [
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "yearly", label: "Yearly" }
];

const EMPTY_FORM = {
  name: "",
  description: "",
  code: "",
  asset_id: "",
  domain: "",
  data_source: "",
  aggregation: "monthly",
  calculation: "sum",
  numerator_fields: [],
  denominator_fields: [],
  filters: {},
  target: "",
  weight: "1",
  unit: "count"
};

export default function IndicatorRegistry() {
  const {
    indicators, assets, currentPeriod, loading, error,
    submitIndicatorValue, governedIndicators, computedResults,
    createGovernedIndicator, submitIndicatorForApproval,
    approveIndicator, rejectIndicator
  } = useMELData();

  const [tab, setTab] = useState("governed");
  const [filterDomain, setFilterDomain] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterAsset, setFilterAsset] = useState("");
  const [governedSearch, setGovernedSearch] = useState("");
  const [governedSort, setGovernedSort] = useState("name");
  const [showCreate, setShowCreate] = useState(false);
  const [createStep, setCreateStep] = useState("basics");
  const [formData, setFormData] = useState({ ...EMPTY_FORM });
  const [formMsg, setFormMsg] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showDetail, setShowDetail] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(null);

  // Legacy indicator filters
  const [filterCat, setFilterCat] = useState("");
  const [filterLegacyAsset, setFilterLegacyAsset] = useState("");
  const [filterLegacyStatus, setFilterLegacyStatus] = useState("");
  const [legacySearch, setLegacySearch] = useState("");
  const [legacySort, setLegacySort] = useState("performance-desc");
  const [showLegacyForm, setShowLegacyForm] = useState(false);
  const [legacyFormData, setLegacyFormData] = useState({ indicator_id: "", actual_value: "", comment: "" });
  const [legacyFormMsg, setLegacyFormMsg] = useState(null);
  const [legacySaving, setLegacySaving] = useState(false);

  const governedResultsById = useMemo(
    () => new Map(computedResults.map((result) => [result.indicator_id, result])),
    [computedResults]
  );

  // Governed indicator filtering
  const filteredGoverned = useMemo(() => {
    const query = governedSearch.trim().toLowerCase();
    const rows = governedIndicators.filter((gi) => {
      if (filterDomain && gi.domain !== filterDomain) return false;
      if (filterStatus && gi.status !== filterStatus) return false;
      if (filterAsset && gi.asset_id !== filterAsset) return false;
      if (query) {
        const haystack = [gi.name, gi.code, gi.asset_name, gi.data_source]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      return true;
    });

    return rows.sort((left, right) => {
      if (governedSort === "status") {
        return (LIFECYCLE_LABELS[left.status]?.label || left.status).localeCompare(LIFECYCLE_LABELS[right.status]?.label || right.status);
      }

      if (governedSort === "domain") {
        return (left.domain || "").localeCompare(right.domain || "");
      }

      if (governedSort === "version-desc") {
        return (right.version || 0) - (left.version || 0);
      }

      if (governedSort === "performance-desc") {
        const leftPerf = governedResultsById.get(left.id)?.performance ?? -1;
        const rightPerf = governedResultsById.get(right.id)?.performance ?? -1;
        return rightPerf - leftPerf;
      }

      return (left.name || "").localeCompare(right.name || "");
    });
  }, [governedIndicators, filterDomain, filterStatus, filterAsset, governedSearch, governedSort, governedResultsById]);

  // Legacy filtering
  const filteredLegacy = useMemo(() => {
    const query = legacySearch.trim().toLowerCase();
    const rows = indicators.filter((i) => {
      if (filterCat && i.kpiCategory !== filterCat) return false;
      if (filterLegacyAsset && i.assetId !== filterLegacyAsset) return false;
      if (filterLegacyStatus) {
        const status = getPerformanceStatus(calculatePerformance(i.actual, i.target));
        if (status !== filterLegacyStatus) return false;
      }
      if (query) {
        const haystack = [i.name, i.code, i.owner, i.assetName]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      return true;
    });

    return rows.sort((left, right) => {
      if (legacySort === "name") {
        return (left.name || "").localeCompare(right.name || "");
      }

      if (legacySort === "owner") {
        return (left.owner || "").localeCompare(right.owner || "");
      }

      if (legacySort === "performance-asc") {
        return calculatePerformance(left.actual, left.target) - calculatePerformance(right.actual, right.target);
      }

      return calculatePerformance(right.actual, right.target) - calculatePerformance(left.actual, left.target);
    });
  }, [indicators, filterCat, filterLegacyAsset, filterLegacyStatus, legacySearch, legacySort]);

  const govSummary = useMemo(() => ({
    total: governedIndicators.length,
    active: governedIndicators.filter((i) => i.status === "active").length,
    pending: governedIndicators.filter((i) => i.status === "submitted").length,
    draft: governedIndicators.filter((i) => i.status === "draft").length
  }), [governedIndicators]);

  const legacySummary = useMemo(() => ({
    total: indicators.length,
    onTrack: indicators.filter((i) => calculatePerformance(i.actual, i.target) >= 90).length,
    attention: indicators.filter((i) => { const p = calculatePerformance(i.actual, i.target); return p >= 60 && p < 90; }).length,
    atRisk: indicators.filter((i) => calculatePerformance(i.actual, i.target) < 60).length
  }), [indicators]);

  if (loading) {
    return <PageLoading title="Loading indicator registry" description="Collecting indicator definitions, governance status, and computed results." />;
  }
  if (error) {
    return <PageError title="Indicator registry could not load" message={error} />;
  }

  const legacyIndicatorOptions = indicators.map((indicator) => ({
    value: indicator.id,
    label: `${indicator.code} - ${indicator.name}`,
    searchText: `${indicator.code} ${indicator.name} ${indicator.owner || ""} ${indicator.assetName || ""}`
  }));

  // Available fields for selected data source
  const availableFields = formData.data_source ? (DATA_SOURCE_FIELDS[formData.data_source] || []) : [];
  const basicsReady = Boolean(formData.name.trim() && formData.domain && formData.data_source);
  const formulaReady = Boolean(
    formData.numerator_fields.length &&
    (formData.calculation !== "ratio" || formData.denominator_fields.length)
  );
  const scoringReady = Boolean(formData.target && Number(formData.target) > 0);
  const stepOrder = ["basics", "formula", "review"];
  const currentStepIndex = stepOrder.indexOf(createStep);

  const createSteps = [
    {
      id: "basics",
      title: "Define indicator",
      text: basicsReady ? "Scope and source selected" : "Set the indicator name, domain, and source",
      state: createStep === "basics" ? "current" : basicsReady ? "complete" : "pending",
      enabled: true
    },
    {
      id: "formula",
      title: "Configure formula",
      text: formulaReady ? "Calculation structure is ready" : "Choose calculation logic and required fields",
      state: createStep === "formula" ? "current" : formulaReady ? "complete" : "pending",
      enabled: basicsReady
    },
    {
      id: "review",
      title: "Score and review",
      text: scoringReady ? "Draft can be created" : "Set the target and confirm the final definition",
      state: createStep === "review" ? "current" : scoringReady ? "complete" : "pending",
      enabled: basicsReady && formulaReady
    }
  ];

  async function handleCreateIndicator(e) {
    e.preventDefault();
    setSaving(true);
    setFormMsg(null);

    if (!formData.target || Number(formData.target) <= 0) {
      setFormMsg({ type: "error", text: "Target is mandatory and must be greater than 0." });
      setSaving(false);
      return;
    }

    const payload = {
      name: formData.name,
      description: formData.description || null,
      code: formData.code || null,
      asset_id: formData.asset_id || null,
      domain: formData.domain,
      data_source: formData.data_source,
      aggregation: formData.aggregation,
      calculation: formData.calculation,
      numerator_fields: formData.numerator_fields,
      denominator_fields: formData.denominator_fields,
      filters: formData.filters,
      target: Number(formData.target),
      weight: Number(formData.weight) || 1,
      unit: formData.unit || "count"
    };

    const result = await createGovernedIndicator(payload);
    if (result.success) {
      setFormMsg({ type: "success", text: "Indicator created as draft. Submit for approval when ready." });
      setFormData({ ...EMPTY_FORM });
      setCreateStep("basics");
    } else {
      setFormMsg({ type: "error", text: result.error?.message || "Failed to create." });
    }
    setSaving(false);
  }

  async function handleLegacySubmit(e) {
    e.preventDefault();
    setLegacySaving(true);
    setLegacyFormMsg(null);
    const result = await submitIndicatorValue(legacyFormData);
    if (result.success) {
      setLegacyFormMsg({ type: "success", text: "Value saved successfully." });
      setLegacyFormData((c) => ({ ...c, actual_value: "", comment: "" }));
    } else {
      setLegacyFormMsg({ type: "error", text: result.error?.message || "Failed to save." });
    }
    setLegacySaving(false);
  }

  function toggleField(fieldName, key) {
    setFormData((current) => {
      const list = current[key];
      return {
        ...current,
        [key]: list.includes(fieldName)
          ? list.filter((field) => field !== fieldName)
          : [...list, fieldName]
      };
    });
  }

  function goToCreateStep(stepId) {
    const step = createSteps.find((item) => item.id === stepId);
    if (step?.enabled) {
      setCreateStep(stepId);
    }
  }

  function openCreateFlow() {
    setShowCreate((current) => {
      const next = !current;
      if (next) {
        setCreateStep("basics");
        setFormMsg(null);
      }
      return next;
    });
  }

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="MEL Operations"
        title="Indicator Registry"
        description="Governed indicator definitions with structured formulas, approval workflows, and live computed results."
        meta={
          <div className="badge badge-purple">
            <span className="badge-dot" style={{ background: "var(--purple-500)" }} />
            {currentPeriod}
          </div>
        }
      />

      <div className="tab-strip">
        <button className={`tab-pill ${tab === "governed" ? "active" : ""}`} onClick={() => setTab("governed")}>
          Governed Indicators ({govSummary.total})
        </button>
        <button className={`tab-pill ${tab === "legacy" ? "active" : ""}`} onClick={() => setTab("legacy")}>
          Legacy Indicators ({legacySummary.total})
        </button>
      </div>

      {/* ========== GOVERNED INDICATORS TAB ========== */}
      {tab === "governed" && (
        <>
          <div className="summary-strip">
            <SummaryTile label="Total" value={govSummary.total} text="All governed indicators" />
            <SummaryTile label="Active" value={govSummary.active} text="Computing results" />
            <SummaryTile label="Pending Approval" value={govSummary.pending} text="Awaiting MEL Head review" />
            <SummaryTile label="Drafts" value={govSummary.draft} text="Not yet submitted" />
          </div>

          <div className="toolbar">
            <div className="toolbar-search">
              <Search size={14} />
              <input
                className="search-input"
                value={governedSearch}
                onChange={(e) => setGovernedSearch(e.target.value)}
                placeholder="Search code, name, source..."
              />
            </div>
            <select className="filter-select" value={filterDomain} onChange={(e) => setFilterDomain(e.target.value)}>
              <option value="">All Domains</option>
              {MEL_DOMAINS.map((d) => <option key={d.key} value={d.key}>{d.label}</option>)}
            </select>
            <select className="filter-select" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
              <option value="">All Statuses</option>
              {Object.entries(LIFECYCLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            <select className="filter-select" value={filterAsset} onChange={(e) => setFilterAsset(e.target.value)}>
              <option value="">All Assets</option>
              {assets.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
            <select className="filter-select" value={governedSort} onChange={(e) => setGovernedSort(e.target.value)}>
              <option value="name">Sort: Name</option>
              <option value="performance-desc">Sort: Performance</option>
              <option value="status">Sort: Status</option>
              <option value="domain">Sort: Domain</option>
              <option value="version-desc">Sort: Version</option>
            </select>
            <div className="toolbar-spacer" />
            <button className="btn btn-primary" onClick={openCreateFlow}>
              <Plus size={14} /> Create Indicator
            </button>
          </div>

          {/* CREATE FORM */}
          {showCreate && (
            <div className="card">
              <div className="card-body">
                <div className="form-panel">
                  <div className="form-panel-head">
                    <div className="section-copy">
                      <div className="section-kicker">Governance</div>
                      <div className="section-title">Create Governed Indicator</div>
                      <div className="section-text">
                        Define the indicator in stages so the governance team can verify scope, formula, and scoring
                        before the draft enters approval.
                      </div>
                    </div>
                  </div>
                  <RegistryWorkflowSteps steps={createSteps} currentStep={createStep} onSelect={goToCreateStep} />
                  <form className="form-grid" onSubmit={handleCreateIndicator}>
                    <div className="split-layout">
                      <div className="stack">
                        {createStep === "basics" ? (
                          <div className="workflow-panel">
                            <div className="workflow-panel-header">
                              <div>
                                <div className="workflow-panel-title">Step 1. Define Indicator</div>
                                <div className="workflow-panel-text">
                                  Capture the identity, scope, and source of the indicator before building the formula.
                                </div>
                              </div>
                            </div>

                            <div className="form-row">
                              <div className="form-group">
                                <label className="form-label">Indicator Name *</label>
                                <input
                                  className="form-input"
                                  type="text"
                                  required
                                  value={formData.name}
                                  onChange={(e) => setFormData((c) => ({ ...c, name: e.target.value }))}
                                  placeholder="e.g. Female participation rate"
                                />
                              </div>
                              <div className="form-group">
                                <label className="form-label">Code</label>
                                <input
                                  className="form-input"
                                  type="text"
                                  value={formData.code}
                                  onChange={(e) => setFormData((c) => ({ ...c, code: e.target.value }))}
                                  placeholder="e.g. INC-001"
                                />
                              </div>
                            </div>

                            <div className="form-group">
                              <label className="form-label">Description</label>
                              <textarea
                                className="form-textarea"
                                rows={2}
                                value={formData.description}
                                onChange={(e) => setFormData((c) => ({ ...c, description: e.target.value }))}
                                placeholder="What does this indicator measure?"
                              />
                            </div>

                            <div className="form-row form-row-3">
                              <div className="form-group">
                                <label className="form-label">Domain *</label>
                                <select
                                  className="form-select"
                                  required
                                  value={formData.domain}
                                  onChange={(e) => setFormData((c) => ({ ...c, domain: e.target.value }))}
                                >
                                  <option value="">Select domain</option>
                                  {MEL_DOMAINS.map((d) => <option key={d.key} value={d.key}>{d.label}</option>)}
                                </select>
                              </div>
                              <div className="form-group">
                                <label className="form-label">Data Source *</label>
                                <select
                                  className="form-select"
                                  required
                                  value={formData.data_source}
                                  onChange={(e) =>
                                    setFormData((c) => ({
                                      ...c,
                                      data_source: e.target.value,
                                      numerator_fields: [],
                                      denominator_fields: []
                                    }))
                                  }
                                >
                                  <option value="">Select source</option>
                                  <option value="episodes">Episodes (Media)</option>
                                  <option value="participants">Participants</option>
                                  <option value="survey_responses">Survey Responses</option>
                                  <option value="follow_up_data">Follow-up Data</option>
                                </select>
                              </div>
                              <div className="form-group">
                                <label className="form-label">Asset</label>
                                <select
                                  className="form-select"
                                  value={formData.asset_id}
                                  onChange={(e) => setFormData((c) => ({ ...c, asset_id: e.target.value }))}
                                >
                                  <option value="">All assets</option>
                                  {assets.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                                </select>
                              </div>
                            </div>
                          </div>
                        ) : null}

                        {createStep === "formula" ? (
                          <div className="workflow-panel">
                            <div className="workflow-panel-header">
                              <div>
                                <div className="workflow-panel-title">Step 2. Configure Formula</div>
                                <div className="workflow-panel-text">
                                  Define how the indicator should compute and which source fields should contribute.
                                </div>
                              </div>
                            </div>

                            <div className="form-row form-row-3">
                              <div className="form-group">
                                <label className="form-label">Calculation Type *</label>
                                <select
                                  className="form-select"
                                  required
                                  value={formData.calculation}
                                  onChange={(e) => setFormData((c) => ({ ...c, calculation: e.target.value }))}
                                >
                                  {CALCULATION_TYPES.map((ct) => <option key={ct.value} value={ct.value}>{ct.label}</option>)}
                                </select>
                              </div>
                              <div className="form-group">
                                <label className="form-label">Aggregation *</label>
                                <select
                                  className="form-select"
                                  required
                                  value={formData.aggregation}
                                  onChange={(e) => setFormData((c) => ({ ...c, aggregation: e.target.value }))}
                                >
                                  {AGGREGATION_LEVELS.map((al) => <option key={al.value} value={al.value}>{al.label}</option>)}
                                </select>
                              </div>
                              <div className="form-group">
                                <label className="form-label">Unit</label>
                                <input
                                  className="form-input"
                                  type="text"
                                  value={formData.unit}
                                  onChange={(e) => setFormData((c) => ({ ...c, unit: e.target.value }))}
                                  placeholder="count, %, score"
                                />
                              </div>
                            </div>

                            {formData.data_source ? (
                              <>
                                <div className="form-group">
                                  <label className="form-label">Numerator Fields *</label>
                                  <div className="field-picker">
                                    {availableFields.map((field) => (
                                      <button
                                        type="button"
                                        key={field}
                                        className={`field-chip ${formData.numerator_fields.includes(field) ? "active" : ""}`}
                                        onClick={() => toggleField(field, "numerator_fields")}
                                      >
                                        {field}
                                      </button>
                                    ))}
                                  </div>
                                </div>

                                {formData.calculation === "ratio" ? (
                                  <div className="form-group">
                                    <label className="form-label">Denominator Fields</label>
                                    <div className="field-picker">
                                      {availableFields.map((field) => (
                                        <button
                                          type="button"
                                          key={field}
                                          className={`field-chip ${formData.denominator_fields.includes(field) ? "active" : ""}`}
                                          onClick={() => toggleField(field, "denominator_fields")}
                                        >
                                          {field}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                ) : null}

                                <div className="formula-preview">
                                  <div className="formula-preview-label">Formula Preview</div>
                                  <div className="formula-preview-text">
                                    {formData.calculation.toUpperCase()}(
                                    {formData.numerator_fields.length ? formData.numerator_fields.join(" + ") : "..."}
                                    {formData.calculation === "ratio"
                                      ? ` / ${formData.denominator_fields.length ? formData.denominator_fields.join(" + ") : "..."} \u00d7 100`
                                      : ""}
                                    )
                                  </div>
                                </div>
                              </>
                            ) : (
                              <div className="callout callout-info">
                                Select a data source in the first step to unlock the available formula fields.
                              </div>
                            )}
                          </div>
                        ) : null}

                        {createStep === "review" ? (
                          <div className="workflow-panel">
                            <div className="workflow-panel-header">
                              <div>
                                <div className="workflow-panel-title">Step 3. Score and Review</div>
                                <div className="workflow-panel-text">
                                  Confirm the scoring inputs and review the draft definition before creating it.
                                </div>
                              </div>
                            </div>

                            <div className="form-row form-row-3">
                              <div className="form-group">
                                <label className="form-label">Target * (mandatory)</label>
                                <input
                                  className="form-input"
                                  type="number"
                                  step="any"
                                  required
                                  min="0.01"
                                  value={formData.target}
                                  onChange={(e) => setFormData((c) => ({ ...c, target: e.target.value }))}
                                  placeholder="Required"
                                />
                              </div>
                              <div className="form-group">
                                <label className="form-label">Weight (for scoring)</label>
                                <input
                                  className="form-input"
                                  type="number"
                                  step="0.1"
                                  min="0"
                                  max="10"
                                  value={formData.weight}
                                  onChange={(e) => setFormData((c) => ({ ...c, weight: e.target.value }))}
                                />
                              </div>
                            </div>

                            <div className="workflow-stat-list">
                              <div className="workflow-stat">
                                <span className="workflow-stat-label">Indicator</span>
                                <span className="workflow-stat-value">{formData.name || "--"}</span>
                              </div>
                              <div className="workflow-stat">
                                <span className="workflow-stat-label">Source</span>
                                <span className="workflow-stat-value">{formData.data_source || "--"}</span>
                              </div>
                              <div className="workflow-stat">
                                <span className="workflow-stat-label">Formula</span>
                                <span className="workflow-stat-value">
                                  {formData.calculation} / {formData.aggregation}
                                </span>
                              </div>
                              <div className="workflow-stat">
                                <span className="workflow-stat-label">Selected fields</span>
                                <span className="workflow-stat-value">{formData.numerator_fields.length}</span>
                              </div>
                            </div>

                            {formMsg ? <div className={`callout callout-${formMsg.type === "success" ? "success" : "error"}`}>{formMsg.text}</div> : null}
                          </div>
                        ) : null}

                        <div className="workflow-actions">
                          {currentStepIndex > 0 ? (
                            <button
                              type="button"
                              className="btn btn-outline"
                              onClick={() => setCreateStep(stepOrder[currentStepIndex - 1])}
                            >
                              Back
                            </button>
                          ) : null}

                          {createStep !== "review" ? (
                            <button
                              type="button"
                              className="btn btn-primary"
                              disabled={(createStep === "basics" && !basicsReady) || (createStep === "formula" && !formulaReady)}
                              onClick={() => setCreateStep(stepOrder[currentStepIndex + 1])}
                            >
                              Continue
                            </button>
                          ) : (
                            <button className="btn btn-primary" type="submit" disabled={saving || !scoringReady}>
                              {saving ? "Creating..." : "Create as Draft"}
                            </button>
                          )}

                          <button type="button" className="btn btn-ghost" onClick={() => setShowCreate(false)}>
                            Cancel
                          </button>
                        </div>
                      </div>

                      <div className="stack">
                        <RegistryWorkflowAside
                          title="Draft Summary"
                          items={[
                            { label: "Basics", value: basicsReady ? "Ready" : "Pending", tone: basicsReady ? "good" : "muted" },
                            { label: "Formula", value: formulaReady ? "Ready" : "Pending", tone: formulaReady ? "good" : "muted" },
                            { label: "Scoring", value: scoringReady ? "Ready" : "Pending", tone: scoringReady ? "good" : "muted" }
                          ]}
                          note="New indicators are created as drafts and still require MEL Head approval before activation."
                        />
                      </div>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}

          {/* GOVERNED INDICATOR TABLE */}
          <div className="card">
            <div className="card-header">
              <div className="section-copy">
                <div className="section-title">Governed Indicators</div>
                <div className="section-text">{filteredGoverned.length} indicators in view</div>
              </div>
            </div>
            <div className="card-body flush">
              {filteredGoverned.length ? (
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Code</th>
                        <th>Indicator</th>
                        <th>Domain</th>
                        <th>Source</th>
                        <th>Formula</th>
                        <th>Target</th>
                        <th>Status</th>
                        <th>Version</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredGoverned.map((gi) => {
                        const lifecycle = LIFECYCLE_LABELS[gi.status] || LIFECYCLE_LABELS.draft;
                        const result = governedResultsById.get(gi.id);
                        return (
                          <tr key={gi.id}>
                            <td style={{ fontWeight: 700, color: "var(--purple-700)" }}>{gi.code || "--"}</td>
                            <td>
                              <div style={{ fontWeight: 600 }}>{gi.name}</div>
                              {gi.asset_name && <div className="table-detail">{gi.asset_name}</div>}
                            </td>
                            <td>
                              <span className="badge badge-purple">
                                {MEL_DOMAINS.find((d) => d.key === gi.domain)?.label || gi.domain}
                              </span>
                            </td>
                            <td style={{ fontSize: 12 }}>{gi.data_source}</td>
                            <td style={{ fontSize: 11, fontFamily: "monospace" }}>
                              {gi.calculation}({(gi.numerator_fields || []).join("+")}{gi.calculation === "ratio" ? `/${(gi.denominator_fields || []).join("+")}` : ""})
                            </td>
                            <td style={{ fontWeight: 700 }}>{gi.target}</td>
                            <td>
                              <span className={`badge ${lifecycle.badge}`}>
                                <span className="badge-dot" />
                                {lifecycle.label}
                              </span>
                            </td>
                            <td style={{ textAlign: "center" }}>v{gi.version}</td>
                            <td>
                              <div className="action-buttons">
                                {gi.status === "draft" && (
                                  <button className="btn btn-sm btn-outline" title="Submit for approval"
                                    onClick={() => submitIndicatorForApproval(gi.id)}>
                                    <Send size={12} /> Submit
                                  </button>
                                )}
                                {gi.status === "submitted" && (
                                  <>
                                    <button className="btn btn-sm btn-success" title="Approve"
                                      onClick={() => approveIndicator(gi.id)}>
                                      <Check size={12} /> Approve
                                    </button>
                                    <button className="btn btn-sm btn-danger" title="Reject"
                                      onClick={() => { setShowRejectForm(gi.id); setRejectReason(""); }}>
                                      <X size={12} /> Reject
                                    </button>
                                  </>
                                )}
                                {gi.status === "active" && (
                                  <button className="btn btn-sm btn-outline" title="View result"
                                    onClick={() => setShowDetail(showDetail === gi.id ? null : gi.id)}>
                                    <Eye size={12} /> {result ? `${result.performance ?? "--"}%` : "No data"}
                                  </button>
                                )}
                              </div>
                              {showRejectForm === gi.id && (
                                <div className="inline-reject-form">
                                  <input className="form-input" placeholder="Rejection reason" value={rejectReason}
                                    onChange={(e) => setRejectReason(e.target.value)} />
                                  <button className="btn btn-sm btn-danger"
                                    onClick={() => { rejectIndicator(gi.id, rejectReason); setShowRejectForm(null); }}>
                                    Confirm Reject
                                  </button>
                                </div>
                              )}
                              {showDetail === gi.id && result && (
                                <div className="inline-detail">
                                  <div><strong>Value:</strong> {result.value ?? "N/A"}</div>
                                  <div><strong>Target:</strong> {result.target}</div>
                                  <div><strong>Performance:</strong> {result.performance ?? "N/A"}%</div>
                                  <div><strong>Data Points:</strong> {result.data_points_used}</div>
                                  <div><strong>Coverage:</strong> {result.data_coverage}%</div>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <EmptyPanel icon={Target} title="No governed indicators"
                  text="Create structured indicators with formulas, targets, and domain mappings using the button above." />
              )}
            </div>
          </div>
        </>
      )}

      {/* ========== LEGACY INDICATORS TAB ========== */}
      {tab === "legacy" && (
        <>
          <div className="summary-strip">
            <SummaryTile label="Total Indicators" value={legacySummary.total} text="All configured KPIs" />
            <SummaryTile label="On Track" value={legacySummary.onTrack} text="Performance at or above 90%" />
            <SummaryTile label="Attention" value={legacySummary.attention} text="Indicators in the warning band" />
            <SummaryTile label="At Risk" value={legacySummary.atRisk} text="Indicators below the expected pace" />
          </div>

          <div className="toolbar">
            <div className="toolbar-search">
              <Search size={14} />
              <input
                className="search-input"
                value={legacySearch}
                onChange={(e) => setLegacySearch(e.target.value)}
                placeholder="Search code, name, owner..."
              />
            </div>
            <select className="filter-select" value={filterCat} onChange={(e) => setFilterCat(e.target.value)}>
              <option value="">All Categories</option>
              <option value="institutional">Institutional</option>
              <option value="asset">Asset</option>
              <option value="process">Process</option>
              <option value="outcome">Outcome</option>
            </select>
            <select className="filter-select" value={filterLegacyAsset} onChange={(e) => setFilterLegacyAsset(e.target.value)}>
              <option value="">All Assets</option>
              {assets.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
            <select className="filter-select" value={filterLegacyStatus} onChange={(e) => setFilterLegacyStatus(e.target.value)}>
              <option value="">All Statuses</option>
              <option value="green">On Track</option>
              <option value="amber">Needs Attention</option>
              <option value="red">At Risk</option>
            </select>
            <select className="filter-select" value={legacySort} onChange={(e) => setLegacySort(e.target.value)}>
              <option value="performance-desc">Sort: Performance high-low</option>
              <option value="performance-asc">Sort: Performance low-high</option>
              <option value="name">Sort: Name</option>
              <option value="owner">Sort: Owner</option>
            </select>
            <div className="toolbar-spacer" />
            <button className="btn btn-primary" onClick={() => setShowLegacyForm(!showLegacyForm)}>
              <Plus size={14} /> Enter Value
            </button>
          </div>

          {showLegacyForm && (
            <div className="card">
              <div className="card-body">
                <div className="form-panel">
                  <div className="form-panel-head">
                    <div className="section-copy">
                      <div className="section-kicker">Capture</div>
                      <div className="section-title">Enter Indicator Value</div>
                      <div className="section-text">Submit the latest actual value for a legacy indicator.</div>
                    </div>
                  </div>
                  <form className="form-grid" onSubmit={handleLegacySubmit} style={{ maxWidth: 720 }}>
                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">Indicator</label>
                        <SearchSelect
                          value={legacyFormData.indicator_id}
                          onChange={(nextValue) => setLegacyFormData((c) => ({ ...c, indicator_id: nextValue }))}
                          options={legacyIndicatorOptions}
                          required
                          placeholder="Select indicator"
                          searchPlaceholder="Search indicators by code, name, or owner"
                          emptyText="No indicators matched your search"
                          name="legacy_indicator_id"
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Actual Value</label>
                        <input className="form-input" type="number" step="any" required value={legacyFormData.actual_value}
                          onChange={(e) => setLegacyFormData((c) => ({ ...c, actual_value: e.target.value }))} />
                      </div>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Comment</label>
                      <textarea className="form-textarea" rows={3} value={legacyFormData.comment}
                        onChange={(e) => setLegacyFormData((c) => ({ ...c, comment: e.target.value }))} placeholder="Optional note" />
                    </div>
                    {legacyFormMsg && <div className={`callout callout-${legacyFormMsg.type === "success" ? "success" : "error"}`}>{legacyFormMsg.text}</div>}
                    <div className="form-panel-actions">
                      <button className="btn btn-primary" type="submit" disabled={legacySaving}>{legacySaving ? "Saving..." : "Save Value"}</button>
                      <button type="button" className="btn btn-ghost" onClick={() => setShowLegacyForm(false)}>Cancel</button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}

          <div className="card">
            <div className="card-header">
              <div className="section-copy">
                <div className="section-title">Legacy Indicator Table</div>
                <div className="section-text">{filteredLegacy.length} indicators in view</div>
              </div>
            </div>
            <div className="card-body flush">
              {filteredLegacy.length ? (
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Code</th>
                        <th>Indicator</th>
                        <th>Category</th>
                        <th>Baseline</th>
                        <th>Target</th>
                        <th>Actual</th>
                        <th>Performance</th>
                        <th>Status</th>
                        <th>Owner</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredLegacy.map((i) => {
                        const perf = calculatePerformance(i.actual, i.target);
                        const status = getPerformanceStatus(perf);
                        return (
                          <tr key={i.id}>
                            <td style={{ fontWeight: 700, color: "var(--purple-700)" }}>{i.code}</td>
                            <td>
                              <div style={{ fontWeight: 600 }}>{i.name}</div>
                              {i.assetName && <div className="table-detail">{i.assetName}</div>}
                            </td>
                            <td><span className="badge badge-purple">{cap(i.kpiCategory)}</span></td>
                            <td>{fmtVal(i.baseline)}</td>
                            <td style={{ fontWeight: 700 }}>{fmtVal(i.target)}</td>
                            <td style={{ fontWeight: 700 }}>{fmtVal(i.actual)}</td>
                            <td>
                              <div className="dashboard-value-inline">
                                <div className="progress-bar" style={{ width: 72 }}>
                                  <div className={`progress-fill ${status}`} style={{ width: `${Math.min(perf, 100)}%` }} />
                                </div>
                                <span style={{ fontSize: 12, fontWeight: 700 }}>{perf}%</span>
                              </div>
                            </td>
                            <td>
                              <span className={`badge ${getBadgeClass(status)}`}>
                                <span className="badge-dot" />
                                {getPerformanceLabel(perf)}
                              </span>
                            </td>
                            <td>{i.owner}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <EmptyPanel icon={Target} title="No indicators matched this filter" text="Adjust the filters to see indicators." />
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function SummaryTile({ label, value, text }) {
  return (
    <div className="summary-tile">
      <div className="summary-tile-label">{label}</div>
      <div className="summary-tile-value">{value}</div>
      <div className="summary-tile-text">{text}</div>
    </div>
  );
}

function RegistryWorkflowSteps({ steps, currentStep, onSelect }) {
  return (
    <div className="workflow-steps">
      {steps.map((step, index) => (
        <button
          key={step.id}
          type="button"
          className={`workflow-step workflow-step-button ${step.state} ${currentStep === step.id ? "active" : ""}`}
          onClick={() => onSelect(step.id)}
          disabled={!step.enabled}
        >
          <div className="workflow-step-index">{index + 1}</div>
          <div>
            <div className="workflow-step-title">{step.title}</div>
            <div className="workflow-step-text">{step.text}</div>
          </div>
        </button>
      ))}
    </div>
  );
}

function RegistryWorkflowAside({ title, items, note }) {
  return (
    <div className="workflow-aside">
      <div className="workflow-aside-title">{title}</div>
      <div className="workflow-stat-list">
        {items.map((item) => (
          <div key={item.label} className="workflow-stat">
            <span className="workflow-stat-label">{item.label}</span>
            <span className={`workflow-stat-value ${item.tone || "muted"}`}>{item.value}</span>
          </div>
        ))}
      </div>
      {note ? <div className="workflow-note">{note}</div> : null}
    </div>
  );
}

function fmtVal(v) { return v === null || v === undefined || v === "" ? "--" : v; }
function cap(v) { return v ? v.charAt(0).toUpperCase() + v.slice(1) : ""; }
