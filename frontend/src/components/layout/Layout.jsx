import { NavLink, useLocation } from "react-router-dom";
import {
  BarChart3,
  Building2,
  ClipboardList,
  Database,
  Gauge,
  PanelLeft,
  Settings,
  ShieldCheck,
  Tv
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import useMELData from "../../hooks/useMELData";

export default function Layout({ children }) {
  const { profile, signOut } = useAuth();
  const { assets } = useMELData();
  const location = useLocation();
  const routeMeta = getRouteMeta(location.pathname, assets);
  const todayLabel = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date());

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
      title: "Main",
      items: [
        { to: "/dashboard", label: "Overview", icon: Gauge },
        { to: "/strategic-performance", label: "Performance", icon: BarChart3 }
      ]
    },
    {
      title: "Workflows",
      items: [
        { to: "/data-collection", label: "Data Entry", icon: Database },
        { to: "/indicators", label: "Indicators", icon: PanelLeft },
        { to: "/surveys", label: "Surveys", icon: ClipboardList },
        { to: "/data-quality", label: "Checks", icon: ShieldCheck }
      ]
    },
    {
      title: "Assets",
      items: assetItems,
      emptyText: "Add an asset in Settings to see it here."
    },
    {
      title: "Admin",
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
            <div className="sidebar-brand-text">Monitoring and reporting</div>
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
        <div className="page-wrapper">
          <div className="shell-topbar">
            <div>
              <div className="shell-kicker">{routeMeta.kicker}</div>
              <div className="shell-heading">{routeMeta.title}</div>
            </div>
            <div className="shell-topbar-meta">
              <div className="shell-status-pill">
                <span className="shell-status-dot" />
                {routeMeta.note}
              </div>
              <div className="shell-date">{todayLabel}</div>
            </div>
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}

function getRouteMeta(pathname, assets) {
  if (pathname === "/dashboard") {
    return { kicker: "Home", title: "Overview", note: "Leadership view" };
  }

  if (pathname === "/strategic-performance") {
    return { kicker: "Performance", title: "Delivery and follow-up", note: "Operations view" };
  }

  if (pathname === "/data-collection") {
    return { kicker: "Workflow", title: "Data entry", note: "Capture results" };
  }

  if (pathname === "/indicators") {
    return { kicker: "Setup", title: "Indicators", note: "Define measures" };
  }

  if (pathname === "/surveys") {
    return { kicker: "Workflow", title: "Surveys", note: "Collect responses" };
  }

  if (pathname === "/data-quality") {
    return { kicker: "Review", title: "Data checks", note: "Find gaps" };
  }

  if (pathname === "/settings") {
    return { kicker: "Admin", title: "Settings", note: "Manage workspace" };
  }

  if (pathname.startsWith("/assets/")) {
    const assetName = assets.find((asset) => pathname === `/assets/${asset.slug}`)?.name || "Asset";
    return { kicker: "Asset", title: assetName, note: "View performance" };
  }

  return { kicker: "Workspace", title: "Springboard MIS", note: "Reporting workspace" };
}
