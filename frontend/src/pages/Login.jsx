import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import {
  BarChart3, Shield, Database, FileCheck, AlertTriangle
} from "lucide-react";

export default function Login() {
  const { signIn, signUp, isConfigured } = useAuth();
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSubmitting(true);

    let result;
    if (mode === "login") {
      result = await signIn(email, password);
    } else {
      result = await signUp(email, password, fullName);
      if (result.success) {
        setSuccess("Account created. Check your email to confirm, then sign in.");
        setMode("login");
        setSubmitting(false);
        return;
      }
    }

    if (!result.success) {
      setError(result.error?.message || "Authentication failed.");
    }
    setSubmitting(false);
  }

  return (
    <div className="auth-page">
      <div className="auth-hero">
        <div className="auth-hero-content">
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 32 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 12,
              background: "linear-gradient(135deg, rgba(141,198,63,0.3), rgba(141,198,63,0.1))",
              display: "grid", placeItems: "center", fontWeight: 800, fontSize: 18, color: "#8DC63F"
            }}>
              MEL
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16, color: "#fff" }}>Springboard</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", fontWeight: 600, letterSpacing: "0.06em" }}>
                ROAD SHOW FOUNDATION
              </div>
            </div>
          </div>

          <h1 className="auth-hero-title">
            Monitoring, Evaluation & Learning MIS
          </h1>
          <p className="auth-hero-text">
            A comprehensive management information system for institutional MEL tracking,
            asset performance monitoring, media analytics, and evidence-based decision making.
          </p>

          <div className="auth-hero-features">
            <div className="auth-hero-feature">
              <div className="auth-hero-feature-icon"><BarChart3 size={16} /></div>
              Performance dashboards with real-time KPI tracking
            </div>
            <div className="auth-hero-feature">
              <div className="auth-hero-feature-icon"><Database size={16} /></div>
              Multi-channel data ingestion (manual, CSV, API)
            </div>
            <div className="auth-hero-feature">
              <div className="auth-hero-feature-icon"><FileCheck size={16} /></div>
              Evidence library with verification workflows
            </div>
            <div className="auth-hero-feature">
              <div className="auth-hero-feature-icon"><Shield size={16} /></div>
              Role-based access control and audit trails
            </div>
          </div>
        </div>
      </div>

      <div className="auth-form-side">
        <div className="auth-form-container">
          {!isConfigured && (
            <div style={{
              padding: 16, borderRadius: 10, marginBottom: 24,
              background: "#FEF3C7", border: "1px solid #FDE68A", fontSize: 13, lineHeight: 1.6
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700, color: "#92400E", marginBottom: 6 }}>
                <AlertTriangle size={16} />
                Supabase Not Configured
              </div>
              <div style={{ color: "#92400E" }}>
                Add <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> to
                your <code>.env</code> file and restart the dev server to enable authentication.
              </div>
            </div>
          )}

          <h2 className="auth-form-title">
            {mode === "login" ? "Welcome back" : "Create account"}
          </h2>
          <p className="auth-form-subtitle">
            {mode === "login"
              ? "Sign in to access the MEL dashboard"
              : "Set up your account to get started"}
          </p>

          {error && <div className="auth-error">{error}</div>}
          {success && (
            <div className="callout callout-success" style={{ marginBottom: 16 }}>
              {success}
            </div>
          )}

          <form className="form-grid" onSubmit={handleSubmit}>
            {mode === "signup" && (
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input
                  className="form-input"
                  type="text"
                  placeholder="Enter your full name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                className="form-input"
                type="email"
                placeholder="name@springboard.org"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                className="form-input"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>

            <button
              className="btn btn-primary"
              type="submit"
              disabled={submitting || !isConfigured}
              style={{ width: "100%", padding: "12px 18px", marginTop: 4 }}
            >
              {submitting
                ? "Please wait..."
                : mode === "login"
                  ? "Sign In"
                  : "Create Account"}
            </button>
          </form>

          <div style={{ textAlign: "center", marginTop: 20, fontSize: 13, color: "var(--gray-500)" }}>
            {mode === "login" ? (
              <>
                Don't have an account?{" "}
                <button
                  type="button"
                  onClick={() => { setMode("signup"); setError(null); }}
                  style={{
                    background: "none", border: "none", color: "var(--purple-600)",
                    fontWeight: 600, cursor: "pointer"
                  }}
                >
                  Sign up
                </button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => { setMode("login"); setError(null); }}
                  style={{
                    background: "none", border: "none", color: "var(--purple-600)",
                    fontWeight: 600, cursor: "pointer"
                  }}
                >
                  Sign in
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
