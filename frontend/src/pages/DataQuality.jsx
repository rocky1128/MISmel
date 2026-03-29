import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import useMELData from "../hooks/useMELData";
import PageHeader from "../components/layout/PageHeader";
import SectionContainer from "../components/ui/SectionContainer";
import AlertCard from "../components/ui/AlertCard";
import { EmptyPanel, PageError, PageLoading } from "../components/ui/PageStates";
import { MEL_DOMAINS } from "../lib/indicatorEngine";

export default function DataQuality() {
  const {
    loading, error, currentPeriod, evidence, submissions, indicators,
    governedIndicators, computedResults, surveyResponses, followUpData,
    participants, episodes, assets
  } = useMELData();
  const [evidenceQuery, setEvidenceQuery] = useState("");
  const [submissionQuery, setSubmissionQuery] = useState("");

  if (loading) {
    return (
      <PageLoading
        title="Loading data quality"
        description="Reviewing completeness, verification, and data coverage across all sources."
      />
    );
  }

  if (error) {
    return (
      <PageError
        title="Data quality view could not load"
        description="This page depends on evidence, submissions, and multi-source data completeness."
        message={error}
      />
    );
  }

  const missingActuals = indicators.filter((i) => i.actual === null || i.actual === undefined);
  const pendingEvidence = evidence.filter((i) => i.verificationStatus === "Pending");
  const pendingApprovals = submissions.filter((s) => s.approvalStatus === "pending");
  const verifiedEvidence = evidence.filter((i) => i.verificationStatus === "Verified");

  // Governed indicator quality
  const govActive = governedIndicators.filter((i) => i.status === "active" || i.status === "approved");
  const govWithoutTarget = governedIndicators.filter((i) => !i.target || Number(i.target) <= 0);
  const govNoData = computedResults.filter((r) => r.value === null);
  const lowCoverage = computedResults.filter((r) => r.data_coverage < 50);

  // Data source coverage
  const dataSources = [
    { name: "Episodes", count: episodes.length, icon: "media", hasData: episodes.length > 0 },
    { name: "Participants", count: participants.length, icon: "people", hasData: participants.length > 0 },
    { name: "Survey Responses", count: surveyResponses.length, icon: "survey", hasData: surveyResponses.length > 0 },
    { name: "Follow-up Data", count: followUpData.length, icon: "outcome", hasData: followUpData.length > 0 }
  ];
  const activeSources = dataSources.filter((s) => s.hasData).length;

  // Domain coverage
  const domainCoverage = useMemo(() => MEL_DOMAINS.map((d) => {
    const domainIndicators = govActive.filter((i) => i.domain === d.key);
    const domainResults = computedResults.filter((r) => r.domain === d.key);
    const withData = domainResults.filter((r) => r.value !== null).length;
    return {
      ...d,
      indicatorCount: domainIndicators.length,
      withData,
      coverage: domainResults.length > 0 ? Math.round((withData / domainResults.length) * 100) : 0
    };
  }).sort((left, right) => right.coverage - left.coverage || right.indicatorCount - left.indicatorCount), [computedResults, govActive]);

  const filteredEvidence = useMemo(() => {
    const query = evidenceQuery.trim().toLowerCase();
    return evidence.filter((item) => {
      if (!query) return true;
      return [item.title, item.linkedTo, item.submittedBy, item.verificationStatus]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [evidence, evidenceQuery]);

  const filteredSubmissions = useMemo(() => {
    const query = submissionQuery.trim().toLowerCase();
    return submissions.filter((item) => {
      if (!query) return true;
      return [item.userName, item.entityType, item.action, item.approvalStatus]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [submissions, submissionQuery]);

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="MEL Operations"
        title="Data Quality & Validation"
        description="Multi-source data completeness, indicator coverage, and validation status across the MEL framework."
        meta={
          <div className="badge badge-purple">
            <span className="badge-dot" style={{ background: "var(--purple-500)" }} />
            {currentPeriod}
          </div>
        }
      />

      <div className="summary-strip">
        <SummaryTile label="Missing Actuals" value={missingActuals.length} text="Legacy indicators without values" />
        <SummaryTile label="Low Coverage" value={lowCoverage.length} text="Governed indicators <50% data" />
        <SummaryTile label="Pending Evidence" value={pendingEvidence.length} text="Awaiting verification" />
        <SummaryTile label="Active Sources" value={`${activeSources}/4`} text="Data pipelines with data" />
      </div>

      {/* DATA SOURCE COVERAGE */}
      <SectionContainer
        title="Data Source Coverage"
        description="Status of each data pipeline feeding the indicator engine."
      >
        <div className="card">
          <div className="card-body flush">
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Data Source</th>
                    <th>Records</th>
                    <th>Status</th>
                    <th>Coverage</th>
                  </tr>
                </thead>
                <tbody>
                  {dataSources.map((src) => (
                    <tr key={src.name}>
                      <td style={{ fontWeight: 600 }}>{src.name}</td>
                      <td style={{ fontWeight: 700 }}>{src.count.toLocaleString()}</td>
                      <td>
                        <span className={`badge ${src.hasData ? "badge-green" : "badge-red"}`}>
                          <span className="badge-dot" />
                          {src.hasData ? "Active" : "No Data"}
                        </span>
                      </td>
                      <td>
                        <div className="dashboard-value-inline">
                          <div className="progress-bar" style={{ width: 80 }}>
                            <div
                              className={`progress-fill ${src.hasData ? "green" : "red"}`}
                              style={{ width: src.hasData ? "100%" : "0%" }}
                            />
                          </div>
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

      {/* DOMAIN COVERAGE */}
      {govActive.length > 0 && (
        <SectionContainer
          title="Domain Data Completeness"
          description="How much data is available for each MEL domain's governed indicators."
        >
          <div className="card">
            <div className="card-body flush">
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Domain</th>
                      <th>Indicators</th>
                      <th>With Data</th>
                      <th>Coverage</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {domainCoverage.map((d) => (
                      <tr key={d.key}>
                        <td style={{ fontWeight: 600 }}>{d.label}</td>
                        <td>{d.indicatorCount}</td>
                        <td style={{ fontWeight: 700 }}>{d.withData}</td>
                        <td>
                          <div className="dashboard-value-inline">
                            <div className="progress-bar" style={{ width: 80 }}>
                              <div
                                className={`progress-fill ${d.coverage >= 80 ? "green" : d.coverage >= 50 ? "amber" : "red"}`}
                                style={{ width: `${d.coverage}%` }}
                              />
                            </div>
                            <span style={{ fontSize: 12, fontWeight: 700 }}>{d.coverage}%</span>
                          </div>
                        </td>
                        <td>
                          <span className={`badge ${d.coverage >= 80 ? "badge-green" : d.coverage >= 50 ? "badge-amber" : d.indicatorCount ? "badge-red" : "badge-muted"}`}>
                            <span className="badge-dot" />
                            {d.coverage >= 80 ? "Good" : d.coverage >= 50 ? "Partial" : d.indicatorCount ? "Critical" : "No Indicators"}
                          </span>
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

      {/* QUALITY ALERTS */}
      <SectionContainer
        title="Quality Alerts"
        description="The highest-value data issues to resolve before leadership reporting."
      >
        <div className="alert-grid">
          {govWithoutTarget.slice(0, 2).map((i) => (
            <AlertCard
              key={i.id}
              title={`${i.name} has no target`}
              detail="Indicators without targets cannot compute performance. Add a target value."
              tone="critical"
            />
          ))}
          {govNoData.slice(0, 3).map((r) => (
            <AlertCard
              key={r.indicator_id}
              title={`${r.indicator_name} has no computed value`}
              detail={`Data source: ${r.domain}. Ensure the relevant data pipeline has records.`}
              tone="warning"
            />
          ))}
          {missingActuals.slice(0, 3).map((i) => (
            <AlertCard
              key={i.id}
              title={`${i.code} needs data`}
              detail={`${i.name} does not have a submitted actual value.`}
              tone="warning"
            />
          ))}
          {pendingEvidence.slice(0, 2).map((item) => (
            <AlertCard
              key={item.id}
              title={`${item.title} is pending verification`}
              detail={`Submitted by ${item.submittedBy}. Review before the next cycle.`}
              tone="warning"
            />
          ))}
          {!govWithoutTarget.length && !govNoData.length && !missingActuals.length && !pendingEvidence.length && (
            <div className="empty-alert">No critical quality issues. All data pipelines are within expected parameters.</div>
          )}
        </div>
      </SectionContainer>

      {/* EVIDENCE & SUBMISSIONS */}
      <div className="two-column-grid">
        <SectionContainer title="Recent Evidence" description="Latest evidence items and verification state.">
          {evidence.length ? (
            <>
              <div className="toolbar toolbar-compact" style={{ marginBottom: 14 }}>
                <div className="toolbar-search">
                  <Search size={14} />
                  <input
                    className="search-input"
                    value={evidenceQuery}
                    onChange={(e) => setEvidenceQuery(e.target.value)}
                    placeholder="Search evidence, owner, link..."
                  />
                </div>
                <div className="toolbar-note">{filteredEvidence.length} items in view</div>
              </div>
            <table className="list-table">
              <tbody>
                {filteredEvidence.slice(0, 8).map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div style={{ fontWeight: 700 }}>{item.title}</div>
                      <div className="table-detail">{item.linkedTo}</div>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <span className={`badge ${item.verificationStatus === "Verified" ? "badge-green" : item.verificationStatus === "Rejected" ? "badge-red" : "badge-amber"}`}>
                        <span className="badge-dot" />
                        {item.verificationStatus}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </>
          ) : (
            <EmptyPanel
              title="No evidence yet"
              text="Evidence will surface here as soon as uploads begin."
              actions={[
                { label: "Collect Data", to: "/data-collection" }
              ]}
            />
          )}
        </SectionContainer>

        <SectionContainer title="Recent Submissions" description="Latest data submission activity.">
          {submissions.length ? (
            <>
              <div className="toolbar toolbar-compact" style={{ marginBottom: 14 }}>
                <div className="toolbar-search">
                  <Search size={14} />
                  <input
                    className="search-input"
                    value={submissionQuery}
                    onChange={(e) => setSubmissionQuery(e.target.value)}
                    placeholder="Search user, entity, action..."
                  />
                </div>
                <div className="toolbar-note">{filteredSubmissions.length} items in view</div>
              </div>
            <table className="list-table">
              <tbody>
                {filteredSubmissions.slice(0, 8).map((s) => (
                  <tr key={s.id}>
                    <td>
                      <div style={{ fontWeight: 700 }}>{s.userName}</div>
                      <div className="table-detail">{s.entityType} - {s.action}</div>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <span className={`badge ${s.approvalStatus === "approved" ? "badge-green" : s.approvalStatus === "rejected" ? "badge-red" : "badge-amber"}`}>
                        <span className="badge-dot" />
                        {s.approvalStatus}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </>
          ) : (
            <EmptyPanel
              title="No submissions yet"
              text="Submission records will appear once data starts flowing."
              actions={[
                { label: "Collect Data", to: "/data-collection" }
              ]}
            />
          )}
        </SectionContainer>
      </div>
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
