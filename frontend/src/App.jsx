import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { MELDataProvider } from "./context/MELDataContext";
import Layout from "./components/layout/Layout";
import Login from "./pages/Login";
import ExecutiveDashboard from "./pages/ExecutiveDashboard";
import OperationsDashboard from "./pages/OperationsDashboard";
import AssetPerformance from "./pages/AssetPerformance";
import DataEntry from "./pages/DataEntry";
import IndicatorRegistry from "./pages/IndicatorRegistry";
import DataQuality from "./pages/DataQuality";
import AdminSettings from "./pages/AdminSettings";

function ProtectedRoutes() {
  const { isAuthenticated, isConfigured, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display: "grid", placeItems: "center", minHeight: "100vh", background: "#f8fafc" }}>
        <div className="state-panel state-panel-centered" style={{ minHeight: 260, minWidth: 320 }}>
          <div className="spinner" />
          <h2 className="state-panel-title">Loading MEL MIS</h2>
          <p className="state-panel-text">
            Authenticating your workspace and preparing the decision-support dashboards.
          </p>
        </div>
      </div>
    );
  }

  if (!isConfigured || !isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <MELDataProvider>
      <Layout>
        <Routes>
          <Route path="/dashboard" element={<ExecutiveDashboard />} />
          <Route path="/strategic-performance" element={<OperationsDashboard />} />
          <Route path="/assets/:assetSlug" element={<AssetPerformance />} />
          <Route path="/data-collection" element={<DataEntry />} />
          <Route path="/indicators" element={<IndicatorRegistry />} />
          <Route path="/data-quality" element={<DataQuality />} />
          <Route path="/settings" element={<AdminSettings />} />
          <Route path="/assets" element={<Navigate to="/assets/virtual-university" replace />} />
          <Route path="/data-entry" element={<Navigate to="/data-collection" replace />} />
          <Route path="/workplan" element={<Navigate to="/strategic-performance" replace />} />
          <Route path="/media" element={<Navigate to="/assets/virtual-university" replace />} />
          <Route path="/evidence" element={<Navigate to="/data-quality" replace />} />
          <Route path="/submissions" element={<Navigate to="/data-quality" replace />} />
          <Route path="/admin" element={<Navigate to="/settings" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Layout>
    </MELDataProvider>
  );
}

function LoginRoute() {
  const { isAuthenticated, isConfigured, loading } = useAuth();
  if (loading) return null;
  if (isConfigured && isAuthenticated) return <Navigate to="/dashboard" replace />;
  return <Login />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginRoute />} />
          <Route path="/*" element={<ProtectedRoutes />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
