import { Routes, Route, Link } from "react-router-dom";
import AdminApprovalDashboard from "./components/AdminApprovalDashboard";
import TemplatesPage from "./pages/TemplatesPage";
import AdminGroupsPage from "./pages/AdminGroupsPage";
import AdminGroupDetailPage from "./pages/AdminGroupDetailPage";
import AdminAccessPage from "./pages/AdminAccessPage";

export default function App() {
  return (
    <div style={{ minHeight: "100vh" }}>
      <nav style={{ padding: "1rem 2rem", background: "#1e293b", color: "#fff", display: "flex", alignItems: "center", flexWrap: "wrap" }}>
        <Link to="/" style={{ color: "#fff", marginRight: "1.5rem" }}>
          Approval Dashboard
        </Link>
        <Link to="/templates" style={{ color: "#94a3b8", marginRight: "1.5rem" }}>
          Notification Templates
        </Link>
        <Link to="/groups" style={{ color: "#94a3b8", marginRight: "1.5rem" }}>
          Admin Groups
        </Link>
        <Link to="/admin-access" style={{ color: "#94a3b8", marginRight: "1.5rem" }}>
          Admin Access
        </Link>
        <a href="/dashboard.html" style={{ color: "#94a3b8", marginLeft: "auto" }} title="Switch deployment for groups & access">
          Switch
        </a>
      </nav>
      <main style={{ padding: "2rem", maxWidth: 1200, margin: "0 auto" }}>
        <Routes>
          <Route path="/" element={<AdminApprovalDashboard />} />
          <Route path="/templates" element={<TemplatesPage />} />
          <Route path="/groups" element={<AdminGroupsPage />} />
          <Route path="/groups/:id" element={<AdminGroupDetailPage />} />
          <Route path="/admin-access" element={<AdminAccessPage />} />
        </Routes>
      </main>
    </div>
  );
}
