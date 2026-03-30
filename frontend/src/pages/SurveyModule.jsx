import { useMemo, useState } from "react";
import { ClipboardList, Download, Plus, Upload } from "lucide-react";
import useMELData from "../hooks/useMELData";
import PageHeader from "../components/layout/PageHeader";
import SectionContainer from "../components/ui/SectionContainer";
import { EmptyPanel, PageError, PageLoading } from "../components/ui/PageStates";
import SelectField from "../components/ui/SelectField";

const SURVEY_MEASURES = [
  { key: "confidence_score", label: "Confidence", max: 10 },
  { key: "job_readiness_score", label: "Job Readiness", max: 10 },
  { key: "leadership_score", label: "Leadership", max: 10 },
  { key: "skills_application_score", label: "Skills Application", max: 10 },
  { key: "knowledge_score", label: "Knowledge", max: 10 },
  { key: "satisfaction_score", label: "Satisfaction", max: 10 }
];

const EMPTY_FORM = {
  survey_type: "pre",
  asset_id: "",
  program_name: "",
  confidence_score: "",
  job_readiness_score: "",
  leadership_score: "",
  skills_application_score: "",
  knowledge_score: "",
  satisfaction_score: ""
};

export default function SurveyModule() {
  const {
    loading, error, assets, surveyResponses, currentPeriod,
    submitSurveyResponse, submitBulkSurveys
  } = useMELData();

  const [tab, setTab] = useState("overview");
  const [formData, setFormData] = useState({ ...EMPTY_FORM });
  const [formMsg, setFormMsg] = useState(null);
  const [saving, setSaving] = useState(false);

  const stats = useMemo(() => {
    const pre = surveyResponses.filter((s) => s.survey_type === "pre");
    const post = surveyResponses.filter((s) => s.survey_type === "post");

    const avgScore = (list, key) => {
      const vals = list.map((s) => s[key]).filter((v) => v != null);
      return vals.length ? Math.round((vals.reduce((a, b) => a + Number(b), 0) / vals.length) * 10) / 10 : null;
    };

    const measures = SURVEY_MEASURES.map((m) => ({
      ...m,
      preAvg: avgScore(pre, m.key),
      postAvg: avgScore(post, m.key),
      change: (() => {
        const preVal = avgScore(pre, m.key);
        const postVal = avgScore(post, m.key);
        if (preVal && postVal) return Math.round((postVal - preVal) * 10) / 10;
        return null;
      })()
    }));

    return {
      total: surveyResponses.length,
      preCount: pre.length,
      postCount: post.length,
      measures,
      byAsset: groupByAsset(surveyResponses, assets)
    };
  }, [surveyResponses, assets]);
  const surveyTypeOptions = [
    { value: "pre", label: "Pre-Assessment" },
    { value: "post", label: "Post-Assessment" }
  ];
  const assetOptions = assets.map((asset) => ({ value: asset.id, label: asset.name }));

  if (loading) {
    return (
      <PageLoading
        title="Loading survey module"
        description="Collecting survey responses and computing learning indicators."
      />
    );
  }

  if (error) {
    return (
      <PageError
        title="Survey module could not load"
        description="The survey module depends on survey_responses and asset data."
        message={error}
      />
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setFormMsg(null);

    const payload = {
      survey_type: formData.survey_type,
      asset_id: formData.asset_id || null,
      program_name: formData.program_name || null
    };
    for (const m of SURVEY_MEASURES) {
      payload[m.key] = formData[m.key] !== "" ? Number(formData[m.key]) : null;
    }

    const result = await submitSurveyResponse(payload);
    if (result.success) {
      setFormMsg({ type: "success", text: "Survey response saved." });
      setFormData({ ...EMPTY_FORM });
    } else {
      setFormMsg({ type: "error", text: result.error?.message || "Failed to save." });
    }
    setSaving(false);
  }

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="MEL Operations"
        title="Survey Module"
        description="Pre/post assessment surveys linked to assets and programs. Measures confidence, job readiness, leadership, and skills application."
        meta={
          <div className="badge badge-purple">
            <span className="badge-dot" style={{ background: "var(--purple-500)" }} />
            {currentPeriod}
          </div>
        }
      />

      <div className="summary-strip">
        <SummaryTile label="Total Responses" value={stats.total} text="All survey submissions" />
        <SummaryTile label="Pre-Assessments" value={stats.preCount} text="Baseline surveys" />
        <SummaryTile label="Post-Assessments" value={stats.postCount} text="Follow-up surveys" />
        <SummaryTile
          label="Paired Coverage"
          value={`${Math.min(stats.preCount, stats.postCount)} pairs`}
          text="Matched pre/post"
        />
      </div>

      <div className="tab-strip">
        {[
          { key: "overview", label: "Overview" },
          { key: "entry", label: "New Survey" },
          { key: "responses", label: "All Responses" }
        ].map((t) => (
          <button key={t.key} className={`tab-pill ${tab === t.key ? "active" : ""}`} onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <>
          <SectionContainer
            title="Learning Measures — Pre vs Post"
            description="Compare average scores across all survey measures to identify learning gains."
          >
            {stats.measures.some((m) => m.preAvg || m.postAvg) ? (
              <div className="card">
                <div className="card-body flush">
                  <div className="table-container">
                    <table>
                      <thead>
                        <tr>
                          <th>Measure</th>
                          <th>Pre-Assessment Avg</th>
                          <th>Post-Assessment Avg</th>
                          <th>Change</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stats.measures.map((m) => (
                          <tr key={m.key}>
                            <td style={{ fontWeight: 600 }}>{m.label}</td>
                            <td>{m.preAvg !== null ? `${m.preAvg}/10` : "--"}</td>
                            <td style={{ fontWeight: 700 }}>{m.postAvg !== null ? `${m.postAvg}/10` : "--"}</td>
                            <td>
                              {m.change !== null ? (
                                <span className={`trend-badge ${m.change > 0 ? "trend-up" : m.change < 0 ? "trend-down" : ""}`}>
                                  {m.change > 0 ? "+" : ""}{m.change}
                                </span>
                              ) : "--"}
                            </td>
                            <td>
                              {m.change !== null ? (
                                <span className={`badge ${m.change > 0 ? "badge-green" : m.change < 0 ? "badge-red" : "badge-amber"}`}>
                                  <span className="badge-dot" />
                                  {m.change > 0 ? "Improved" : m.change < 0 ? "Declined" : "No Change"}
                                </span>
                              ) : (
                                <span className="badge badge-muted">
                                  <span className="badge-dot" />
                                  Insufficient Data
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : (
              <div className="card">
                <EmptyPanel
                  icon={ClipboardList}
                  title="No survey data yet"
                  text="Submit pre and post assessments to see learning gains across measures."
                />
              </div>
            )}
          </SectionContainer>

          {stats.byAsset.length > 0 && (
            <SectionContainer
              title="Survey Coverage by Asset"
              description="View response distribution across institutional assets."
            >
              <div className="card">
                <div className="card-body flush">
                  <div className="table-container">
                    <table>
                      <thead>
                        <tr>
                          <th>Asset</th>
                          <th>Pre</th>
                          <th>Post</th>
                          <th>Total</th>
                          <th>Coverage</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stats.byAsset.map((row) => (
                          <tr key={row.name}>
                            <td style={{ fontWeight: 600 }}>{row.name}</td>
                            <td>{row.pre}</td>
                            <td>{row.post}</td>
                            <td style={{ fontWeight: 700 }}>{row.total}</td>
                            <td>
                              <div className="dashboard-value-inline">
                                <div className="progress-bar" style={{ width: 72 }}>
                                  <div
                                    className={`progress-fill ${row.coverage >= 80 ? "green" : row.coverage >= 50 ? "amber" : "red"}`}
                                    style={{ width: `${Math.min(row.coverage, 100)}%` }}
                                  />
                                </div>
                                <span style={{ fontSize: 12, fontWeight: 700 }}>{row.coverage}%</span>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </SectionContainer>
          )}
        </>
      )}

      {tab === "entry" && (
        <div className="card">
          <div className="card-body">
            <div className="form-panel">
              <div className="form-panel-head">
                <div className="section-copy">
                  <div className="section-kicker">Capture</div>
                  <div className="section-title">Submit Survey Response</div>
                  <div className="section-text">
                    Record pre or post assessment scores for a participant. All scores are on a 0-10 scale.
                  </div>
                </div>
              </div>
              <form className="form-grid" onSubmit={handleSubmit} style={{ maxWidth: 720 }}>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Survey Type</label>
                    <SelectField
                      value={formData.survey_type}
                      onChange={(nextValue) => setFormData((c) => ({ ...c, survey_type: nextValue }))}
                      options={surveyTypeOptions}
                      required
                      name="survey_type"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Asset / Program</label>
                    <SelectField
                      value={formData.asset_id}
                      onChange={(nextValue) => setFormData((c) => ({ ...c, asset_id: nextValue }))}
                      options={assetOptions}
                      placeholder="Select asset (optional)"
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Program Name</label>
                  <input
                    className="form-input"
                    type="text"
                    value={formData.program_name}
                    onChange={(e) => setFormData((c) => ({ ...c, program_name: e.target.value }))}
                    placeholder="e.g. Leadership Cohort 2026"
                  />
                </div>

                <div className="form-section-divider">Assessment Scores (0-10)</div>

                <div className="form-row form-row-3">
                  {SURVEY_MEASURES.map((m) => (
                    <div className="form-group" key={m.key}>
                      <label className="form-label">{m.label}</label>
                      <input
                        className="form-input"
                        type="number"
                        min="0"
                        max="10"
                        step="0.1"
                        value={formData[m.key]}
                        onChange={(e) => setFormData((c) => ({ ...c, [m.key]: e.target.value }))}
                        placeholder="0-10"
                      />
                    </div>
                  ))}
                </div>

                {formMsg && (
                  <div className={`callout callout-${formMsg.type === "success" ? "success" : "error"}`}>
                    {formMsg.text}
                  </div>
                )}
                <div className="form-panel-actions">
                  <button className="btn btn-primary" type="submit" disabled={saving}>
                    {saving ? "Saving..." : "Submit Response"}
                  </button>
                  <button type="button" className="btn btn-ghost" onClick={() => setFormData({ ...EMPTY_FORM })}>
                    Reset
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {tab === "responses" && (
        <div className="card">
          <div className="card-header">
            <div className="section-copy">
              <div className="section-title">All Survey Responses</div>
              <div className="section-text">
                {surveyResponses.length} total responses across all assets and programs.
              </div>
            </div>
          </div>
          <div className="card-body flush">
            {surveyResponses.length ? (
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Type</th>
                      <th>Asset</th>
                      <th>Program</th>
                      <th>Confidence</th>
                      <th>Job Ready</th>
                      <th>Leadership</th>
                      <th>Skills</th>
                    </tr>
                  </thead>
                  <tbody>
                    {surveyResponses.slice(0, 50).map((s) => {
                      const assetName = s.asset_id
                        ? assets.find((a) => a.id === s.asset_id)?.name ?? "--"
                        : "--";
                      return (
                        <tr key={s.id}>
                          <td>{s.survey_date || "--"}</td>
                          <td>
                            <span className={`badge ${s.survey_type === "pre" ? "badge-amber" : "badge-green"}`}>
                              <span className="badge-dot" />
                              {s.survey_type === "pre" ? "Pre" : "Post"}
                            </span>
                          </td>
                          <td>{assetName}</td>
                          <td>{s.program_name || "--"}</td>
                          <td style={{ fontWeight: 600 }}>{s.confidence_score ?? "--"}</td>
                          <td style={{ fontWeight: 600 }}>{s.job_readiness_score ?? "--"}</td>
                          <td style={{ fontWeight: 600 }}>{s.leadership_score ?? "--"}</td>
                          <td style={{ fontWeight: 600 }}>{s.skills_application_score ?? "--"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyPanel
                icon={ClipboardList}
                title="No survey responses"
                text="Submit survey responses using the New Survey tab."
              />
            )}
          </div>
        </div>
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

function groupByAsset(responses, assets) {
  const map = new Map();
  for (const r of responses) {
    const key = r.asset_id || "unlinked";
    if (!map.has(key)) {
      const asset = assets.find((a) => a.id === key);
      map.set(key, { name: asset?.name || "Unlinked", pre: 0, post: 0, total: 0 });
    }
    const entry = map.get(key);
    entry.total++;
    if (r.survey_type === "pre") entry.pre++;
    else entry.post++;
  }
  return [...map.values()].map((row) => ({
    ...row,
    coverage: row.total > 0 ? Math.min(Math.round((Math.min(row.pre, row.post) * 2 / row.total) * 100), 100) : 0
  }));
}
