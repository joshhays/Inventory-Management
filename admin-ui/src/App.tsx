import { Routes, Route, Link } from "react-router-dom";
import AdminApprovalDashboard from "./components/AdminApprovalDashboard";
import TemplatesPage from "./pages/TemplatesPage";

export default function App() {
  return (
    <div style={{ minHeight: "100vh" }}>
      <nav style={{ padding: "1rem 2rem", background: "#1e293b", color: "#fff" }}>
        <Link to="/" style={{ color: "#fff", marginRight: "1.5rem" }}>
          Approval Dashboard
        </Link>
        <Link to="/templates" style={{ color: "#94a3b8" }}>
          Notification Templates
        </Link>
      </nav>
      <main style={{ padding: "2rem", maxWidth: 1200, margin: "0 auto" }}>
        <Routes>
          <Route path="/" element={<AdminApprovalDashboard />} />
          <Route path="/templates" element={<TemplatesPage />} />
        </Routes>
      </main>
    </div>
  );
}
