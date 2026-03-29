import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  LayoutDashboard, ListChecks, Target, PenLine, Building2,
  BarChart3, FolderCheck, ClipboardList, Settings, LogOut
} from "lucide-react";

const navSections = [
  {
    label: "Overview",
    items: [
      { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    ]
  },
  {
    label: "Planning & Tracking",
    items: [
      { to: "/workplan", icon: ListChecks, label: "Workplan Tracker" },
      { to: "/indicators", icon: Target, label: "Indicator Registry" },
      { to: "/data-entry", icon: PenLine, label: "Data Entry" },
    ]
  },
  {
    label: "Performance",
    items: [
      { to: "/assets", icon: Building2, label: "Asset Performance" },
      { to: "/media", icon: BarChart3, label: "Media Analytics" },
    ]
  },
  {
    label: "Validation",
    items: [
      { to: "/evidence", icon: FolderCheck, label: "Evidence Library" },
      { to: "/submissions", icon: ClipboardList, label: "Submission Log" },
    ]
  },
  {
    label: "System",
    items: [
      { to: "/admin", icon: Settings, label: "Admin Settings" },
    ]
  }
];

const navItems = navSections.flatMap((section) =>
  section.items.map((item) => ({ ...item, section: section.label }))
);

export default function AppShell({ children }) {
  const { profile, signOut } = useAuth();
  const location = useLocation();
  const initials = (profile?.full_name || "U").split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  const activeNav = navItems.find(
    (item) => location.pathname === item.to || location.pathname.startsWith(`${item.to}/`)
  );
  const today = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date());

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 38, height: 38, borderRadius: 10,
              background: "linear-gradient(135deg, rgba(141,198,63,0.25), rgba(141,198,63,0.08))",
              display: "grid", placeItems: "center", fontWeight: 800, fontSize: 13,
              color: "#8DC63F", letterSpacing: "0.05em"
            }}>
              MEL
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>Springboard</div>
              <div className="sidebar-brand-text" style={{ marginTop: 0 }}>MEL MIS</div>
            </div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navSections.map((section) => (
            <div key={section.label}>
              <div className="nav-group-label">{section.label}</div>
              {section.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
                >
                  <item.icon className="nav-icon" size={18} />
                  {item.label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-avatar">{initials}</div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">{profile?.full_name || "User"}</div>
              <div className="sidebar-user-role">{profile?.role || "Authenticated"}</div>
            </div>
            <button
              onClick={() => signOut()}
              className="btn-ghost"
              style={{ padding: 6, borderRadius: 6, border: "none", cursor: "pointer", color: "rgba(255,255,255,0.5)" }}
              title="Sign out"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      <main className="main-content">
        <div className="page-wrapper">
          <div className="shell-topbar">
            <div>
              <div className="shell-kicker">{activeNav?.section || "Workspace"}</div>
              <div className="shell-heading">Springboard MEL MIS Workspace</div>
            </div>
            <div className="shell-topbar-meta">
              <div className="shell-status-pill">
                <span className="shell-status-dot" />
                Authenticated workspace
              </div>
              <div className="shell-date">{today}</div>
            </div>
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
