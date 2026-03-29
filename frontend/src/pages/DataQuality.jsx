import useMELData from "../hooks/useMELData";
import PageHeader from "../components/layout/PageHeader";
import SectionContainer from "../components/ui/SectionContainer";
import AlertCard from "../components/ui/AlertCard";
import { EmptyPanel, PageError, PageLoading } from "../components/ui/PageStates";

export default function DataQuality() {
  const { loading, error, currentPeriod, evidence, submissions, indicators } = useMELData();

  if (loading) {
    return (
      <PageLoading
        title="Loading data quality"
        description="Reviewing completeness, verification, and recent submission activity."
      />
    );
  }

  if (error) {
    return (
      <PageError
        title="Data quality view could not load"
        description="This page depends on evidence, submissions, and indicator completeness."
        message={error}
      />
    );
  }

  const missingActuals = indicators.filter((indicator) => indicator.actual === null || indicator.actual === undefined);
  const pendingEvidence = evidence.filter((item) => item.verificationStatus === "Pending");
  const pendingApprovals = submissions.filter((submission) => submission.approvalStatus === "pending");

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="MEL Operations"
        title="Data Quality"
        description="Track evidence verification, submission approvals, and the most visible data gaps across the system."
        meta={
          <div className="badge badge-purple">
            <span className="badge-dot" style={{ background: "var(--purple-500)" }} />
            {currentPeriod}
          </div>
        }
      />

      <div className="summary-strip">
        <SummaryTile label="Missing Actuals" value={missingActuals.length} text="Indicators without current values" />
        <SummaryTile label="Pending Evidence" value={pendingEvidence.length} text="Evidence waiting for verification" />
        <SummaryTile label="Pending Approvals" value={pendingApprovals.length} text="Submission records awaiting decision" />
        <SummaryTile label="Verified Evidence" value={evidence.filter((item) => item.verificationStatus === "Verified").length} text="Approved supporting documents" />
      </div>

      <SectionContainer
        title="Quality Alerts"
        description="The highest-value data issues to resolve before leadership reporting."
      >
        <div className="alert-grid">
          {missingActuals.slice(0, 4).map((indicator) => (
            <AlertCard
              key={indicator.id}
              title={`${indicator.code} needs data`}
              detail={`${indicator.name} does not have a submitted actual value for the current reporting view.`}
              tone="warning"
            />
          ))}
          {pendingEvidence.slice(0, 2).map((item) => (
            <AlertCard
              key={item.id}
              title={`${item.title} is pending verification`}
              detail={`Submitted by ${item.submittedBy}. Review the evidence before the next reporting cycle.`}
              tone="warning"
            />
          ))}
          {pendingApprovals.slice(0, 2).map((submission) => (
            <AlertCard
              key={submission.id}
              title={`${submission.userName} has a pending submission`}
              detail={`${submission.entityType} still needs an approval decision.`}
              tone="critical"
            />
          ))}
        </div>
      </SectionContainer>

      <div className="two-column-grid">
        <SectionContainer
          title="Recent Evidence"
          description="Most recent evidence items and their current verification state."
        >
          {evidence.length ? (
            <table className="list-table">
              <tbody>
                {evidence.slice(0, 6).map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div style={{ fontWeight: 700 }}>{item.title}</div>
                      <div className="table-detail">{item.linkedTo}</div>
                    </td>
                    <td style={{ textAlign: "right" }}>{item.verificationStatus}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <EmptyPanel title="No evidence yet" text="Evidence will surface here as soon as uploads begin." />
          )}
        </SectionContainer>

        <SectionContainer
          title="Recent Submissions"
          description="Latest log entries from manual entry, uploads, and evidence activity."
        >
          {submissions.length ? (
            <table className="list-table">
              <tbody>
                {submissions.slice(0, 6).map((submission) => (
                  <tr key={submission.id}>
                    <td>
                      <div style={{ fontWeight: 700 }}>{submission.userName}</div>
                      <div className="table-detail">{submission.entityType}</div>
                    </td>
                    <td style={{ textAlign: "right" }}>{submission.approvalStatus}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <EmptyPanel title="No submissions yet" text="Submission records will appear here once data starts flowing." />
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
