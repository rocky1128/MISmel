import { useState } from "react";
import { ClipboardList } from "lucide-react";
import useMELData from "../hooks/useMELData";

const ACTION_LABELS = { manual_entry: "Manual Entry", bulk_upload: "Bulk Upload", evidence_upload: "Evidence Upload" };

export default function SubmissionLog() {
  const { submissions, loading } = useMELData();
  const [filterAction, setFilterAction] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  if (loading) return <div style={{ padding: 60, textAlign: "center", color: "var(--gray-400)" }}>Loading...</div>;

  const filtered = submissions.filter(s => {
    if (filterAction && s.action !== filterAction) return false;
    if (filterStatus && s.approvalStatus !== filterStatus) return false;
    return true;
  });

  return (
    <div>
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <div className="page-breadcrumb">Validation</div>
            <h1 className="page-title">Submission Log</h1>
            <p className="page-subtitle">Complete audit trail of all data submissions, changes, and approval statuses.</p>
          </div>
        </div>
      </div>

      <div className="toolbar">
        <select className="filter-select" value={filterAction} onChange={e => setFilterAction(e.target.value)}>
          <option value="">All Actions</option>
          <option value="manual_entry">Manual Entry</option>
          <option value="bulk_upload">Bulk Upload</option>
          <option value="evidence_upload">Evidence Upload</option>
        </select>
        <select className="filter-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
        <div className="toolbar-spacer" />
        <span style={{ fontSize: 13, color: "var(--gray-500)" }}>{filtered.length} entries</span>
      </div>

      <div className="card">
        <div className="card-body flush">
          {filtered.length ? (
            <div className="table-container">
              <table>
                <thead><tr><th>Timestamp</th><th>User</th><th>Action</th><th>Entity</th><th>Changes</th><th>Approval</th><th>Notes</th></tr></thead>
                <tbody>
                  {filtered.map(s => (
                    <tr key={s.id}>
                      <td style={{ whiteSpace: "nowrap", fontSize: 12, color: "var(--gray-500)" }}>{fmtDate(s.createdAt)}</td>
                      <td style={{ fontWeight: 600, fontSize: 13 }}>{s.userName}</td>
                      <td><span className="badge badge-purple">{ACTION_LABELS[s.action] || s.action}</span></td>
                      <td style={{ fontSize: 13 }}>{s.entityType}</td>
                      <td style={{ fontSize: 12, maxWidth: 200 }}>{fmtChanges(s.changes)}</td>
                      <td><ApprovalBadge status={s.approvalStatus} /></td>
                      <td style={{ fontSize: 12, color: "var(--gray-500)" }}>{s.notes || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state"><ClipboardList size={40} className="empty-state-icon" /><div className="empty-state-title">No submissions</div><div className="empty-state-text">Data entries and uploads will appear here as an audit trail.</div></div>
          )}
        </div>
      </div>
    </div>
  );
}

function ApprovalBadge({ status }) {
  const map = { approved: "badge-green", rejected: "badge-red", pending: "badge-amber" };
  return <span className={`badge ${map[status] || "badge-gray"}`}><span className="badge-dot" />{(status || "pending").replace(/\b\w/g, c => c.toUpperCase())}</span>;
}

function fmtDate(ts) {
  if (!ts) return "—";
  return new Date(ts).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function fmtChanges(c) {
  if (!c || typeof c !== "object") return "—";
  return Object.entries(c).map(([k, v]) => `${k.replace(/_/g, " ")}: ${v}`).join(", ");
}
