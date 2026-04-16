import { useState, useEffect } from "react";
import toast from "react-hot-toast";

interface ProofUrl {
  itemId: number;
  productName: string;
  proofPdfUrl: string;
}

interface PendingOrder {
  id: number;
  customerName: string;
  customerEmail: string;
  total: number;
  createdAt: string;
  proofUrls: ProofUrl[];
}

export default function AdminApprovalDashboard() {
  const [orders, setOrders] = useState<PendingOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState<number | null>(null);
  const [rejecting, setRejecting] = useState<number | null>(null);

  async function fetchPending() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/pending-approvals", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load pending orders");
      const { orders: data } = await res.json();
      setOrders(data ?? []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load orders");
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchPending();
  }, []);

  async function handleApprove(orderId: number) {
    setApproving(orderId);
    try {
      const res = await fetch("/api/orders/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ orderId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Approval failed");
      toast.success(`Order #${orderId} approved. Tracking: ${data.trackingCode ?? "—"}`);
      await fetchPending();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to approve");
    } finally {
      setApproving(null);
    }
  }

  async function handleReject(orderId: number) {
    setRejecting(orderId);
    try {
      const res = await fetch("/api/orders/reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ orderId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Reject failed");
      toast.success(`Order #${orderId} rejected`);
      await fetchPending();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to reject");
    } finally {
      setRejecting(null);
    }
  }

  if (loading) return <p>Loading...</p>;
  if (orders.length === 0) return <p>No orders pending approval.</p>;

  return (
    <div>
      <h1>Pending Approvals</h1>
      <p style={{ color: "#64748b", marginBottom: "1rem" }}>
        Orders with custom print-on-demand items awaiting approval. Review the PDF proof, then Approve or Reject.
      </p>
      <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {orders.map((o) => (
          <li
            key={o.id}
            style={{
              border: "1px solid #e2e8f0",
              borderRadius: 8,
              padding: "1rem 1.25rem",
              marginBottom: "1rem",
              background: "#fff",
            }}
          >
            <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap" }}>
              <div style={{ flex: "1 1 200px" }}>
                <strong>{o.customerName}</strong>
                <br />
                <small style={{ color: "#64748b" }}>{o.customerEmail}</small>
                <br />
                <small>Order #{o.id} · ${Number(o.total).toFixed(2)}</small>
              </div>
              <div style={{ flex: "1 1 200px", minHeight: 200 }}>
                {o.proofUrls?.length > 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                    {o.proofUrls.map((p) => (
                      <div key={p.itemId}>
                        <div style={{ fontSize: "0.8rem", color: "#64748b", marginBottom: 4 }}>
                          {p.productName || `Item #${p.itemId}`}
                        </div>
                        <iframe
                          src={p.proofPdfUrl}
                          title={`Proof: ${p.productName || o.id}`}
                          style={{ width: "100%", height: 200, border: "1px solid #e2e8f0", borderRadius: 4 }}
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <span style={{ color: "#64748b" }}>No proof</span>
                )}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", justifyContent: "center" }}>
                <button
                  onClick={() => handleApprove(o.id)}
                  disabled={approving === o.id}
                  style={{
                    padding: "0.5rem 1rem",
                    background: "#22c55e",
                    color: "#fff",
                    border: "none",
                    borderRadius: 6,
                    cursor: approving === o.id ? "not-allowed" : "pointer",
                  }}
                >
                  {approving === o.id ? "Approving…" : "Approve"}
                </button>
                <button
                  onClick={() => handleReject(o.id)}
                  disabled={rejecting === o.id}
                  style={{
                    padding: "0.5rem 1rem",
                    background: "#ef4444",
                    color: "#fff",
                    border: "none",
                    borderRadius: 6,
                    cursor: rejecting === o.id ? "not-allowed" : "pointer",
                  }}
                >
                  {rejecting === o.id ? "Rejecting…" : "Reject"}
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
