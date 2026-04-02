import { useState } from "react";
import { BookOpen, Lightbulb, AlertTriangle, CheckCircle, Plus, Trash2, X } from "lucide-react";
import useMELData from "../hooks/useMELData";
import PageHeader from "../components/layout/PageHeader";
import SectionContainer from "../components/ui/SectionContainer";
import { EmptyPanel, PageError, PageLoading } from "../components/ui/PageStates";

// ===== Constants =====

const LOG_TYPES = [
  { key: "insight", label: "Insight", icon: Lightbulb, color: "var(--purple-600)", bg: "var(--purple-100)" },
  { key: "lesson", label: "Lesson learned", icon: BookOpen, color: "var(--blue-500)", bg: "var(--blue-100)" },
  { key: "recommendation", label: "Recommendation", icon: CheckCircle, color: "var(--green-600)", bg: "var(--green-100)" }
];

function typeConfig(type) {
  return LOG_TYPES.find((t) => t.key === type) ?? LOG_TYPES[0];
}

function formatDate(iso) {
  if (!iso) return "";
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(new Date(iso));
}

// ===== Log Card =====

function LogCard({ log, goals, programs, onDelete, canDelete }) {
  const cfg = typeConfig(log.type);
  const Icon = cfg.icon;
  const linkedGoal = goals.find((g) => g.id === log.goalId);
  const linkedProgram = programs.find((p) => p.id === log.programId);

  return (
    <div className="learning-card">
      <div className="learning-card-header">
        <div className="learning-type-badge" style={{ background: cfg.bg, color: cfg.color }}>
          <Icon size={12} />
          <span>{cfg.label}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 12, color: "var(--gray-400)" }}>{formatDate(log.createdAt)}</span>
          {canDelete && (
            <button
              onClick={() => onDelete(log.id)}
              style={{
                border: "none", background: "transparent", cursor: "pointer",
                color: "var(--gray-400)", padding: 4, borderRadius: 4
              }}
              title="Delete"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>
      <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>{log.title}</div>
      <p style={{ fontSize: 13, color: "var(--gray-600)", lineHeight: 1.6, marginBottom: 10 }}>
        {log.content}
      </p>
      {(linkedGoal || linkedProgram || log.tags?.length > 0) && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
          {linkedGoal && (
            <span className="badge badge-purple">Goal: {linkedGoal.title}</span>
          )}
          {linkedProgram && (
            <span className="badge badge-purple">Programme: {linkedProgram.name}</span>
          )}
          {log.tags?.map((tag) => (
            <span key={tag} className="badge" style={{ background: "var(--gray-100)", color: "var(--gray-600)" }}>
              {tag}
            </span>
          ))}
        </div>
      )}
      <div style={{ marginTop: 10, fontSize: 12, color: "var(--gray-400)" }}>
        Logged by {log.submittedBy}
      </div>
    </div>
  );
}

// ===== New Log Form =====

function NewLogModal({ goals, programs, onSave, onClose, saving, error }) {
  const [form, setForm] = useState({
    type: "insight",
    title: "",
    content: "",
    goalId: "",
    programId: "",
    tagsRaw: ""
  });

  function set(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.title.trim() || !form.content.trim()) return;
    onSave({
      type: form.type,
      title: form.title.trim(),
      content: form.content.trim(),
      goalId: form.goalId || null,
      programId: form.programId || null,
      tags: form.tagsRaw.split(",").map((t) => t.trim()).filter(Boolean)
    });
  }

  return (
    <div className="modal-backdrop">
      <div className="modal" style={{ maxWidth: 580 }}>
        <div className="modal-header">
          <div style={{ fontWeight: 700, fontSize: 16 }}>Add learning entry</div>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && (
              <div className="inline-error" style={{ marginBottom: 16 }}>
                <AlertTriangle size={14} /> {error}
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Type</label>
              <div style={{ display: "flex", gap: 8 }}>
                {LOG_TYPES.map((t) => {
                  const Icon = t.icon;
                  const active = form.type === t.key;
                  return (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => set("type", t.key)}
                      style={{
                        flex: 1, padding: "8px 12px", borderRadius: 6, cursor: "pointer",
                        border: active ? `2px solid ${t.color}` : "1px solid var(--gray-200)",
                        background: active ? t.bg : "#fff",
                        color: active ? t.color : "var(--gray-600)",
                        fontWeight: 600, fontSize: 12,
                        display: "flex", alignItems: "center", justifyContent: "center", gap: 6
                      }}
                    >
                      <Icon size={13} />{t.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Title <span className="form-required">*</span></label>
              <input
                className="form-input"
                value={form.title}
                onChange={(e) => set("title", e.target.value)}
                placeholder="Short, descriptive title"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Content <span className="form-required">*</span></label>
              <textarea
                className="form-input"
                value={form.content}
                onChange={(e) => set("content", e.target.value)}
                placeholder="Describe the insight, lesson or recommendation in detail..."
                rows={5}
                style={{ resize: "vertical" }}
                required
              />
            </div>

            <div className="form-grid-2">
              <div className="form-group">
                <label className="form-label">Link to goal (optional)</label>
                <select className="form-input" value={form.goalId} onChange={(e) => set("goalId", e.target.value)}>
                  <option value="">— None —</option>
                  {goals.map((g) => (
                    <option key={g.id} value={g.id}>{g.title}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Link to programme (optional)</label>
                <select className="form-input" value={form.programId} onChange={(e) => set("programId", e.target.value)}>
                  <option value="">— None —</option>
                  {programs.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Tags (comma-separated)</label>
              <input
                className="form-input"
                value={form.tagsRaw}
                onChange={(e) => set("tagsRaw", e.target.value)}
                placeholder="e.g. youth, employment, Q1"
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving || !form.title || !form.content}>
              {saving ? "Saving…" : "Save entry"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ===== Main Page =====

export default function LearningPage() {
  const { loading, error, learningLogs, goals, programs, createLearningLog, deleteLearningLog } = useMELData();
  const [filterType, setFilterType] = useState("all");
  const [filterGoal, setFilterGoal] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  if (loading) return <PageLoading title="Loading learning module" description="Fetching learning logs and insights." />;
  if (error) return <PageError title="Could not load learning module" message={error} />;

  const filtered = learningLogs.filter((log) => {
    if (filterType !== "all" && log.type !== filterType) return false;
    if (filterGoal !== "all" && log.goalId !== filterGoal) return false;
    return true;
  });

  const typeCounts = {
    insight: learningLogs.filter((l) => l.type === "insight").length,
    lesson: learningLogs.filter((l) => l.type === "lesson").length,
    recommendation: learningLogs.filter((l) => l.type === "recommendation").length
  };

  async function handleSave(payload) {
    setSaving(true);
    setSaveError(null);
    const result = await createLearningLog(payload);
    setSaving(false);
    if (!result.success) {
      setSaveError(result.error?.message ?? "Failed to save.");
      return;
    }
    setShowModal(false);
  }

  async function handleDelete(id) {
    setDeleteConfirm(id);
  }

  async function confirmDelete() {
    if (!deleteConfirm) return;
    await deleteLearningLog(deleteConfirm);
    setDeleteConfirm(null);
  }

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Learning"
        title="Learning module"
        description="Log insights, lessons learned, and recommendations. Link them to goals and programmes."
        meta={
          <button className="btn btn-primary" onClick={() => setShowModal(true)} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Plus size={14} /> Add entry
          </button>
        }
      />

      {/* Summary strip */}
      <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
        {LOG_TYPES.map((t) => {
          const Icon = t.icon;
          const active = filterType === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setFilterType(active ? "all" : t.key)}
              className="card card-body"
              style={{
                padding: "16px 20px", textAlign: "left", cursor: "pointer",
                border: active ? `2px solid ${t.color}` : "1px solid var(--gray-200)",
                background: active ? t.bg : "#fff"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <Icon size={14} color={t.color} />
                <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: t.color }}>
                  {t.label}s
                </span>
              </div>
              <div style={{ fontSize: 28, fontWeight: 800, color: t.color }}>{typeCounts[t.key]}</div>
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          style={{ padding: "8px 12px", borderRadius: 6, border: "1px solid var(--gray-200)", fontSize: 13, background: "#fff" }}
        >
          <option value="all">All types</option>
          {LOG_TYPES.map((t) => (
            <option key={t.key} value={t.key}>{t.label}</option>
          ))}
        </select>
        {goals.length > 0 && (
          <select
            value={filterGoal}
            onChange={(e) => setFilterGoal(e.target.value)}
            style={{ padding: "8px 12px", borderRadius: 6, border: "1px solid var(--gray-200)", fontSize: 13, background: "#fff" }}
          >
            <option value="all">All goals</option>
            {goals.map((g) => (
              <option key={g.id} value={g.id}>{g.title}</option>
            ))}
          </select>
        )}
        {(filterType !== "all" || filterGoal !== "all") && (
          <button
            onClick={() => { setFilterType("all"); setFilterGoal("all"); }}
            style={{ padding: "8px 12px", borderRadius: 6, border: "1px solid var(--gray-200)", fontSize: 12, background: "#fff", cursor: "pointer", color: "var(--gray-600)" }}
          >
            Clear filters
          </button>
        )}
        <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--gray-500)" }}>
          Showing {filtered.length} of {learningLogs.length}
        </span>
      </div>

      {/* Log list */}
      {filtered.length === 0 ? (
        <div className="card">
          <EmptyPanel
            title={learningLogs.length === 0 ? "No learning entries yet" : "No entries match your filter"}
            text={learningLogs.length === 0
              ? "Add your first insight, lesson learned, or recommendation using the button above."
              : "Try removing the filter to see all entries."}
            actions={learningLogs.length === 0 ? [{ label: "Add entry", onClick: () => setShowModal(true) }] : []}
          />
        </div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {filtered.map((log) => (
            <LogCard
              key={log.id}
              log={log}
              goals={goals}
              programs={programs}
              onDelete={handleDelete}
              canDelete={true}
            />
          ))}
        </div>
      )}

      {showModal && (
        <NewLogModal
          goals={goals}
          programs={programs}
          onSave={handleSave}
          onClose={() => { setShowModal(false); setSaveError(null); }}
          saving={saving}
          error={saveError}
        />
      )}

      {deleteConfirm && (
        <div className="modal-backdrop">
          <div className="modal" style={{ maxWidth: 400 }}>
            <div className="modal-header">
              <div style={{ fontWeight: 700, fontSize: 16 }}>Delete entry?</div>
              <button className="modal-close" onClick={() => setDeleteConfirm(null)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: 13, color: "var(--gray-600)" }}>
                This will permanently delete the learning entry. This action cannot be undone.
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setDeleteConfirm(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={confirmDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
