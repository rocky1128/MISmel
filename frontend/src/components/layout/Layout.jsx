import { NavLink, useLocation } from "react-router-dom";
import {
  BarChart3,
  Building2,
  ChevronRight,
  ClipboardList,
  Database,
  Gauge,
  PanelLeft,
  Settings,
  ShieldCheck,
  Sparkles,
  Tv
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import useMELData from "../../hooks/useMELData";

export default function Layout({ children }) {
  const { profile, signOut } = useAuth();
  const { assets } = useMELData();
  const location = useLocation();

  const initials = (profile?.full_name || "User")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  // Build dynamic asset nav items
  const assetItems = (assets || []).map((asset) => ({
    to: `/assets/${asset.slug}`,
    label: asset.name,
    icon: asset.slug === "springboard-tv" ? Tv : asset.slug === "hangout" ? BarChart3 : Building2
  }));

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
      items: assetItems,
      emptyText: "Assets will appear after you add them."
    },
    {
      title: "MEL Operations",
      items: [
        { to: "/data-collection", label: "Data Collection", icon: Database },
        { to: "/indicators", label: "Indicators", icon: PanelLeft },
        { to: "/surveys", label: "Surveys", icon: ClipboardList },
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

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-brand-mark sidebar-brand-logo">
            <img src="/springboard-logo.png" alt="Springboard Road Show Foundation" />
          </div>
          <div>
            <div className="sidebar-brand-title">Springboard MIS</div>
            <div className="sidebar-brand-text">MEL decision support</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navSections.map((section) => (
            <div key={section.title} className="sidebar-section">
              <div className="nav-group-label">{section.title}</div>
              <div className="sidebar-section-list">
                {section.items.length ? (
                  section.items.map((item) => {
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
                  })
                ) : (
                  <div className="sidebar-empty">{section.emptyText || "Nothing here yet."}</div>
                )}
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
