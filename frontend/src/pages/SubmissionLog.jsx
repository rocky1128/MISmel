import { useMemo, useState } from "react";
import { ClipboardList } from "lucide-react";
import useMELData from "../hooks/useMELData";
import { EmptyPanel, PageLoading } from "../components/ui/PageStates";

const ACTION_LABELS = {
  manual_entry: "Manual Entry",
  bulk_upload: "Bulk Upload",
  evidence_upload: "Evidence Upload"
};

export default function SubmissionLog() {
  const { submissions, loading } = useMELData();
  const [filterAction, setFilterAction] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  const filtered = useMemo(
    () =>
      submissions.filter((submission) => {
        if (filterAction && submission.action !== filterAction) return false;
        if (filterStatus && submission.approvalStatus !== filterStatus) return false;
        return true;
      }),
    [filterAction, filterStatus, submissions]
  );

  const summary = useMemo(
    () => ({
      total: submissions.length,
      pending: submissions.filter((submission) => submission.approvalStatus === "pending").length,
      approved: submissions.filter((submission) => submission.approvalStatus === "approved").length,
      rejected: submissions.filter((submission) => submission.approvalStatus === "rejected").length
    }),
    [submissions]
  );

  if (loading) {
    return (
      <PageLoading
        title="Loading submission log"
        description="Compiling the audit trail for manual entries, uploads, and evidence activity."
      />
    );
  }

  return (
    <div className="page-stack">
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <div className="page-breadcrumb">Validation</div>
            <h1 className="page-title">Submission Log</h1>
            <p className="page-subtitle">
              Review the full audit trail for data entry, evidence uploads, and approval outcomes.
            </p>
          </div>
        </div>
      </div>

      <div className="summary-strip">
        <SummaryTile label="Total Entries" value={summary.total} text="All logged submissions to date" />
        <SummaryTile label="Pending" value={summary.pending} text="Awaiting approval or review" />
        <SummaryTile label="Approved" value={summary.approved} text="Accepted submission records" />
        <SummaryTile label="Rejected" value={summary.rejected} text="Entries that were declined" />
      </div>

      <div className="toolbar">
        <select className="filter-select" value={filterAction} onChange={(event) => setFilterAction(event.target.value)}>
          <option value="">All Actions</option>
          <option value="manual_entry">Manual Entry</option>
          <option value="bulk_upload">Bulk Upload</option>
          <option value="evidence_upload">Evidence Upload</option>
        </select>
        <select className="filter-select" value={filterStatus} onChange={(event) => setFilterStatus(event.target.value)}>
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
        <div className="toolbar-spacer" />
        <span className="toolbar-note">{filtered.length} entries in view</span>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="section-copy">
            <div className="section-title">Audit Trail</div>
            <div className="section-text">
              Each row shows who changed what, when it happened, and the current approval state.
            </div>
          </div>
        </div>
        <div className="card-body flush">
          {filtered.length ? (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>User</th>
                    <th>Action</th>
                    <th>Entity</th>
                    <th>Changes</th>
                    <th>Approval</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((submission) => (
                    <tr key={submission.id}>
                      <td className="table-detail" style={{ marginTop: 0, whiteSpace: "nowrap" }}>
                        {formatDate(submission.createdAt)}
                      </td>
                      <td style={{ fontWeight: 700 }}>{submission.userName}</td>
                      <td>
                        <span className="badge badge-purple">{ACTION_LABELS[submission.action] || submission.action}</span>
                      </td>
                      <td>{submission.entityType}</td>
                      <td>
                        <div className="audit-change-list">
                          {formatChanges(submission.changes).map((change) => (
                            <div key={change} className="audit-change-item">{change}</div>
                          ))}
                        </div>
                      </td>
                      <td><ApprovalBadge status={submission.approvalStatus} /></td>
                      <td className={submission.notes ? "" : "muted-placeholder"}>{submission.notes || "--"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyPanel
              icon={ClipboardList}
              title="No submissions in this view"
              text="Manual entries, uploads, and evidence submissions will appear here once users start interacting with the system."
            />
          )}
        </div>
      </div>
    </div>
  );
}

function ApprovalBadge({ status }) {
  const map = { approved: "badge-green", rejected: "badge-red", pending: "badge-amber" };
  return (
    <span className={`badge ${map[status] || "badge-gray"}`}>
      <span className="badge-dot" />
      {(status || "pending").replace(/\b\w/g, (char) => char.toUpperCase())}
    </span>
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

function formatDate(timestamp) {
  if (!timestamp) return "--";
  return new Date(timestamp).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function formatChanges(changes) {
  if (!changes || typeof changes !== "object") return ["--"];
  return Object.entries(changes).map(([key, value]) => `${key.replace(/_/g, " ")}: ${value}`);
}
