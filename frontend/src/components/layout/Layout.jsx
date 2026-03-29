import { NavLink, useLocation } from "react-router-dom";
import {
  BarChart3,
  Building2,
  ChevronRight,
  Database,
  Gauge,
  PanelLeft,
  Settings,
  ShieldCheck,
  Sparkles,
  Tv
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";

const navSections = [
  {
    title: "Executive",
    items: [
      { to: "/dashboard", label: "Dashboard", icon: Gauge },
      { to: "/strategic-performance", label: "Strategic Performance", icon: Sparkles }
    ]
  },
  {
    title: "Institutional Assets",
    items: [
      { to: "/assets/virtual-university", label: "Virtual University", icon: Building2 },
      { to: "/assets/hangout", label: "Hangout", icon: BarChart3 },
      { to: "/assets/springboard-tv", label: "Springboard TV", icon: Tv }
    ]
  },
  {
    title: "MEL Operations",
    items: [
      { to: "/data-collection", label: "Data Collection", icon: Database },
      { to: "/indicators", label: "Indicators", icon: PanelLeft },
      { to: "/data-quality", label: "Data Quality", icon: ShieldCheck }
    ]
  },
  {
    title: "Settings",
    items: [
      { to: "/settings", label: "Settings", icon: Settings }
    ]
  }
];

export default function Layout({ children }) {
  const { profile, signOut } = useAuth();
  const location = useLocation();
  const initials = (profile?.full_name || "User")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-brand-mark sidebar-brand-logo">
            <img src="/springboard-logo.png" alt="Springboard Road Show Foundation" />
          </div>
          <div>
            <div className="sidebar-brand-title">Springboard MIS</div>
            <div className="sidebar-brand-text">SRF decision support system</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navSections.map((section) => (
            <div key={section.title} className="sidebar-section">
              <div className="nav-group-label">{section.title}</div>
              <div className="sidebar-section-list">
                {section.items.map((item) => {
                  const isActive = location.pathname === item.to || location.pathname.startsWith(`${item.to}/`);
                  const Icon = item.icon;
                  return (
                    <NavLink key={item.to} to={item.to} className={`nav-item ${isActive ? "active" : ""}`}>
                      <span className="nav-item-main">
                        <Icon className="nav-icon" size={18} />
                        <span>{item.label}</span>
                      </span>
                      <ChevronRight size={14} className="nav-chevron" />
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-avatar">{initials}</div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">{profile?.full_name || "User"}</div>
              <div className="sidebar-user-role">{profile?.role || "Contributor"}</div>
            </div>
          </div>
          <button className="sidebar-signout" onClick={() => signOut()}>
            Sign out
          </button>
        </div>
      </aside>

      <main className="main-content">
        <div className="page-wrapper">{children}</div>
      </main>
    </div>
  );
}
