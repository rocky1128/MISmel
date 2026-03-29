import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import AppShell from "./components/layout/AppShell";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import IndicatorRegistry from "./pages/IndicatorRegistry";
import DataEntry from "./pages/DataEntry";
import AssetPerformance from "./pages/AssetPerformance";
import MediaAnalytics from "./pages/MediaAnalytics";
import WorkplanTracker from "./pages/WorkplanTracker";
import EvidenceLibrary from "./pages/EvidenceLibrary";
import SubmissionLog from "./pages/SubmissionLog";
import AdminSettings from "./pages/AdminSettings";

function ProtectedRoutes() {
  const { isAuthenticated, isConfigured, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display: "grid", placeItems: "center", height: "100vh", background: "#F8F8FC" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ width: 40, height: 40, border: "3px solid #E8E5F0", borderTopColor: "#5B2D86", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 16px" }} />
          <div style={{ color: "#5B2D86", fontWeight: 600, fontSize: 14 }}>Loading MEL MIS...</div>
        </div>
      </div>
    );
  }

  if (!isConfigured || !isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <AppShell>
      <Routes>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/indicators" element={<IndicatorRegistry />} />
        <Route path="/data-entry" element={<DataEntry />} />
        <Route path="/assets" element={<AssetPerformance />} />
        <Route path="/media" element={<MediaAnalytics />} />
        <Route path="/workplan" element={<WorkplanTracker />} />
        <Route path="/evidence" element={<EvidenceLibrary />} />
        <Route path="/submissions" element={<SubmissionLog />} />
        <Route path="/admin" element={<AdminSettings />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AppShell>
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
