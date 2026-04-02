import { useState } from "react";
import { ChevronDown, ChevronRight, Target, TrendingUp, AlertCircle } from "lucide-react";
import useMELData from "../hooks/useMELData";
import PageHeader from "../components/layout/PageHeader";
import SectionContainer from "../components/ui/SectionContainer";
import { EmptyPanel, PageError, PageLoading } from "../components/ui/PageStates";
import { Link } from "react-router-dom";

// ===== Helpers =====

function calcPerformance(actual, target) {
  if (actual == null || !target) return null;
  return Math.round((actual / target) * 100);
}

function getStatus(performance) {
  if (performance == null) return "no-data";
  if (performance >= 90) return "good";
  if (performance >= 70) return "warning";
  return "critical";
}

function StatusBadge({ performance }) {
  const status = getStatus(performance);
  const labels = { good: "On track", warning: "Warning", critical: "At risk", "no-data": "No data" };
  const cls = { good: "badge-green", warning: "badge-amber", critical: "badge-red", "no-data": "badge-gray" };
  return (
    <span className={`badge ${cls[status]}`}>
      <span className="badge-dot" />
      {labels[status]}
    </span>
  );
}

function ProgressBar({ value }) {
  if (value == null) return <span style={{ fontSize: 12, color: "var(--gray-400)" }}>—</span>;
  const pct = Math.min(value, 100);
  const status = getStatus(value);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div className="progress-bar" style={{ width: 80, flexShrink: 0 }}>
        <div className={`progress-fill ${status}`} style={{ width: `${pct}%` }} />
      </div>
      <span style={{ fontSize: 12, fontWeight: 700, minWidth: 32 }}>{value}%</span>
    </div>
  );
}

// ===== Indicator Row =====

function IndicatorRow({ indicator }) {
  const performance = calcPerformance(indicator.actual, indicator.target);
  return (
    <div className="goal-indicator-row">
      <div style={{ flex: 1, minWidth: 0 }}>
        <Link to={`/indicators/${indicator.id}`} className="goal-indicator-name">
          {indicator.name}
        </Link>
        {indicator.code && <span className="table-detail">{indicator.code}</span>}
      </div>
      <div style={{ minWidth: 80, textAlign: "right" }}>
        <span style={{ fontSize: 13, fontWeight: 600 }}>
          {indicator.actual != null ? indicator.actual : "—"}
          {indicator.unit ? ` ${indicator.unit}` : ""}
        </span>
        <div style={{ fontSize: 11, color: "var(--gray-500)" }}>
          Target: {indicator.target != null ? indicator.target : "—"}
        </div>
      </div>
      <div style={{ minWidth: 140 }}>
        <ProgressBar value={performance} />
      </div>
      <div style={{ minWidth: 90 }}>
        <StatusBadge performance={performance} />
      </div>
    </div>
  );
}

// ===== Objective (Outcome) Row =====

function ObjectiveRow({ objective, indicators }) {
  const [open, setOpen] = useState(false);
  const myIndicators = indicators.filter((i) => i.objectiveId === objective.id);

  const performances = myIndicators
    .map((i) => calcPerformance(i.actual, i.target))
    .filter((p) => p != null);
  const avgPerformance = performances.length
    ? Math.round(performances.reduce((a, b) => a + b, 0) / performances.length)
    : null;

  const onTrack = performances.filter((p) => p >= 90).length;
  const atRisk = performances.filter((p) => p < 70).length;

  return (
    <div className="goal-objective">
      <button className="goal-objective-header" onClick={() => setOpen((v) => !v)}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 0 }}>
          {open ? <ChevronDown size={14} className="goal-chevron" /> : <ChevronRight size={14} className="goal-chevron" />}
          <div>
            <div style={{ fontWeight: 600, fontSize: 13 }}>{objective.title}</div>
            {objective.code && <div className="table-detail">{objective.code}</div>}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16, flexShrink: 0 }}>
          <span style={{ fontSize: 12, color: "var(--gray-500)" }}>
            {myIndicators.length} indicator{myIndicators.length !== 1 ? "s" : ""}
          </span>
          {myIndicators.length > 0 && (
            <div style={{ display: "flex", gap: 6 }}>
              {onTrack > 0 && (
                <span style={{ fontSize: 11, fontWeight: 600, color: "var(--green-600)", background: "var(--green-50)", padding: "2px 8px", borderRadius: 4 }}>
                  {onTrack} on track
                </span>
              )}
              {atRisk > 0 && (
                <span style={{ fontSize: 11, fontWeight: 600, color: "var(--red-500)", background: "var(--red-100)", padding: "2px 8px", borderRadius: 4 }}>
                  {atRisk} at risk
                </span>
              )}
            </div>
          )}
          <ProgressBar value={avgPerformance} />
        </div>
      </button>
      {open && (
        <div className="goal-objective-body">
          {myIndicators.length ? (
            myIndicators.map((ind) => <IndicatorRow key={ind.id} indicator={ind} />)
          ) : (
            <div className="goal-empty-note">No indicators linked to this outcome yet.</div>
          )}
        </div>
      )}
    </div>
  );
}

// ===== Goal Card =====

function GoalCard({ goal, objectives, indicators }) {
  const [open, setOpen] = useState(true);
  const myObjectives = objectives.filter((o) => o.goalId === goal.id);
  const myIndicators = indicators.filter(
    (i) => myObjectives.some((o) => o.id === i.objectiveId)
  );

  const performances = myIndicators
    .map((i) => calcPerformance(i.actual, i.target))
    .filter((p) => p != null);
  const avgPerformance = performances.length
    ? Math.round(performances.reduce((a, b) => a + b, 0) / performances.length)
    : null;
  const status = getStatus(avgPerformance);

  const statusColors = {
    good: { border: "var(--green-500)", bg: "var(--green-50)", text: "var(--green-800)" },
    warning: { border: "var(--amber-500)", bg: "var(--amber-100)", text: "var(--gray-800)" },
    critical: { border: "var(--red-500)", bg: "var(--red-100)", text: "var(--gray-800)" },
    "no-data": { border: "var(--gray-300)", bg: "var(--gray-50)", text: "var(--gray-600)" }
  };
  const colors = statusColors[status];

  const onTrack = performances.filter((p) => p >= 90).length;
  const warning = performances.filter((p) => p >= 70 && p < 90).length;
  const atRisk = performances.filter((p) => p < 70).length;

  return (
    <div className="goal-card" style={{ borderLeftColor: colors.border }}>
      <button className="goal-card-header" onClick={() => setOpen((v) => !v)}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12, flex: 1, minWidth: 0 }}>
          <div className="goal-icon" style={{ background: colors.bg, color: colors.border }}>
            <Target size={16} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 15 }}>{goal.title}</div>
            <div style={{ fontSize: 12, color: "var(--gray-500)", marginTop: 2 }}>
              {goal.code} · {goal.startYear}–{goal.endYear}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16, flexShrink: 0 }}>
          {/* Status summary pills */}
          <div style={{ display: "flex", gap: 6 }}>
            {onTrack > 0 && (
              <span className="goal-stat-pill" style={{ background: "var(--green-50)", color: "var(--green-700)" }}>
                {onTrack} ✓
              </span>
            )}
            {warning > 0 && (
              <span className="goal-stat-pill" style={{ background: "var(--amber-100)", color: "#92400e" }}>
                {warning} ~
              </span>
            )}
            {atRisk > 0 && (
              <span className="goal-stat-pill" style={{ background: "var(--red-100)", color: "var(--red-500)" }}>
                {atRisk} ✗
              </span>
            )}
          </div>
          <ProgressBar value={avgPerformance} />
          <StatusBadge performance={avgPerformance} />
          <div style={{ color: "var(--gray-400)", marginLeft: 4 }}>
            {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </div>
        </div>
      </button>

      {open && (
        <div className="goal-card-body">
          {goal.description && (
            <p style={{ fontSize: 13, color: "var(--gray-600)", marginBottom: 16, paddingLeft: 4 }}>
              {goal.description}
            </p>
          )}
          {myObjectives.length ? (
            myObjectives.map((obj) => (
              <ObjectiveRow key={obj.id} objective={obj} indicators={myIndicators} />
            ))
          ) : (
            <div className="goal-empty-note">No outcomes linked to this goal yet.</div>
          )}
        </div>
      )}
    </div>
  );
}

// ===== Page =====

export default function GoalsPage() {
  const { loading, error, goals, objectives, indicators, computedResults, governedIndicators } = useMELData();

  if (loading) return <PageLoading title="Loading goals" description="Building the strategic goal hierarchy." />;
  if (error) return <PageError title="Could not load goals" message={error} />;

  // Enrich legacy indicators with performance data
  const enrichedIndicators = indicators.map((ind) => ({
    ...ind,
    objectiveId: ind.objectiveId ?? ind.objective_id
  }));

  // Also map governed indicators linked to goals/objectives for cross-view
  // Count stats
  const totalGoals = goals.length;
  const allPerformances = indicators
    .map((i) => calcPerformance(i.actual, i.target))
    .filter((p) => p != null);
  const onTrackGoalCount = goals.filter((g) => {
    const myObjs = objectives.filter((o) => o.goalId === g.id);
    const myInds = indicators.filter((i) => myObjs.some((o) => o.id === i.objectiveId));
    const perfs = myInds.map((i) => calcPerformance(i.actual, i.target)).filter((p) => p != null);
    const avg = perfs.length ? perfs.reduce((a, b) => a + b, 0) / perfs.length : null;
    return avg != null && avg >= 90;
  }).length;

  const totalIndicators = indicators.length;
  const indicatorsWithData = indicators.filter((i) => i.actual != null).length;

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Strategic framework"
        title="Goals &amp; outcomes"
        description="Expand each goal to drill into outcomes and their linked indicators."
      />

      {/* Summary KPI strip */}
      <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
        <div className="card card-body" style={{ padding: "16px 20px" }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--gray-500)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Strategic Goals</div>
          <div style={{ fontSize: 28, fontWeight: 800, marginTop: 4 }}>{totalGoals}</div>
        </div>
        <div className="card card-body" style={{ padding: "16px 20px" }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--gray-500)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Objectives</div>
          <div style={{ fontSize: 28, fontWeight: 800, marginTop: 4 }}>{objectives.length}</div>
        </div>
        <div className="card card-body" style={{ padding: "16px 20px" }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--gray-500)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Indicators</div>
          <div style={{ fontSize: 28, fontWeight: 800, marginTop: 4 }}>{totalIndicators}</div>
          <div style={{ fontSize: 12, color: "var(--gray-500)", marginTop: 2 }}>{indicatorsWithData} have data</div>
        </div>
        <div className="card card-body" style={{ padding: "16px 20px" }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--gray-500)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Goals On Track</div>
          <div style={{ fontSize: 28, fontWeight: 800, marginTop: 4, color: onTrackGoalCount > 0 ? "var(--green-600)" : "var(--gray-400)" }}>
            {onTrackGoalCount}
            <span style={{ fontSize: 14, fontWeight: 500, color: "var(--gray-500)" }}>/{totalGoals}</span>
          </div>
        </div>
      </div>

      {goals.length === 0 ? (
        <div className="card">
          <EmptyPanel
            title="No goals configured"
            text="Add strategic goals in the database or via Settings to see the hierarchy here."
            actions={[{ label: "Go to Settings", to: "/settings" }]}
          />
        </div>
      ) : (
        <SectionContainer
          title="Goal hierarchy"
          description="Click a goal to expand outcomes and indicators. Status is based on actual vs target performance."
        >
          <div style={{ display: "grid", gap: 12 }}>
            {goals.map((goal) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                objectives={objectives}
                indicators={enrichedIndicators}
              />
            ))}
          </div>
        </SectionContainer>
      )}

      {/* Governed indicators linked to goals (new MEL engine) */}
      {computedResults.length > 0 && (
        <SectionContainer
          title="MEL engine indicators"
          description="Governed indicators with computed results from the MEL engine."
        >
          <div className="card">
            <div className="card-body flush">
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Indicator</th>
                      <th>Domain</th>
                      <th>Value</th>
                      <th>Target</th>
                      <th>Performance</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {computedResults.map((r) => (
                      <tr key={r.indicator_id}>
                        <td>
                          <Link to={`/indicators/${r.indicator_id}`} style={{ fontWeight: 600, color: "var(--purple-600)" }}>
                            {r.indicator_name}
                          </Link>
                          {r.indicator_code && <div className="table-detail">{r.indicator_code}</div>}
                        </td>
                        <td>
                          <span className="badge badge-purple">{r.domain?.replace(/_/g, " ")}</span>
                        </td>
                        <td style={{ fontWeight: 700 }}>{r.value ?? "—"}</td>
                        <td>{r.target ?? "—"}</td>
                        <td>
                          <ProgressBar value={r.performance} />
                        </td>
                        <td>
                          <StatusBadge performance={r.performance} />
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
    </div>
  );
}
