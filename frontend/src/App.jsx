import { Suspense, lazy } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { MELDataProvider } from "./context/MELDataContext";
import Layout from "./components/layout/Layout";

const Login = lazy(() => import("./pages/Login"));
const ExecutiveDashboard = lazy(() => import("./pages/ExecutiveDashboard"));
const OperationsDashboard = lazy(() => import("./pages/OperationsDashboard"));
const AssetPerformance = lazy(() => import("./pages/AssetPerformance"));
const DataEntry = lazy(() => import("./pages/DataEntry"));
const IndicatorRegistry = lazy(() => import("./pages/IndicatorRegistry"));
const DataQuality = lazy(() => import("./pages/DataQuality"));
const AdminSettings = lazy(() => import("./pages/AdminSettings"));
const SurveyModule = lazy(() => import("./pages/SurveyModule"));

function ProtectedRoutes() {
  const { isAuthenticated, isConfigured, loading } = useAuth();

  if (loading) {
    return <FullScreenLoader title="Loading MEL MIS" description="Authenticating your workspace and preparing the decision-support dashboards." />;
  }

  if (!isConfigured || !isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <MELDataProvider>
      <Layout>
        <Suspense fallback={<RouteLoader />}>
          <Routes>
            <Route path="/dashboard" element={<ExecutiveDashboard />} />
            <Route path="/strategic-performance" element={<OperationsDashboard />} />
            <Route path="/assets/:assetSlug" element={<AssetPerformance />} />
            <Route path="/data-collection" element={<DataEntry />} />
            <Route path="/indicators" element={<IndicatorRegistry />} />
            <Route path="/surveys" element={<SurveyModule />} />
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
        </Suspense>
      </Layout>
    </MELDataProvider>
  );
}

function LoginRoute() {
  const { isAuthenticated, isConfigured, loading } = useAuth();
  if (isConfigured && isAuthenticated) return <Navigate to="/dashboard" replace />;
  if (loading && !isAuthenticated) {
    return (
      <Suspense fallback={<FullScreenLoader title="Loading sign-in" description="Preparing authentication and workspace access." />}>
        <Login />
      </Suspense>
    );
  }
  return (
    <Suspense fallback={<FullScreenLoader title="Loading sign-in" description="Preparing authentication and workspace access." />}>
      <Login />
    </Suspense>
  );
}

function FullScreenLoader({ title, description }) {
  return (
    <div style={{ display: "grid", placeItems: "center", minHeight: "100vh", background: "#f8fafc" }}>
      <div className="state-panel state-panel-centered" style={{ minHeight: 260, minWidth: 320 }}>
        <div className="spinner" />
        <h2 className="state-panel-title">{title}</h2>
        <p className="state-panel-text">{description}</p>
      </div>
    </div>
  );
}

function RouteLoader() {
  return (
    <div className="state-panel state-panel-centered" style={{ minHeight: 320 }}>
      <div className="spinner" />
      <h2 className="state-panel-title">Loading workspace module</h2>
      <p className="state-panel-text">
        Fetching the next screen and its reporting tools on demand to keep the workspace fast.
      </p>
    </div>
  );
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
