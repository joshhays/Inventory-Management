import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import toast from "react-hot-toast";

interface Member {
  userId: number;
  user?: { id: number; email: string; name?: string };
}

interface AdminGroup {
  id: number;
  name: string;
  members?: Member[];
}

interface Usage {
  templates: string[];
  inUse: boolean;
}

export default function AdminGroupDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [group, setGroup] = useState<AdminGroup | null>(null);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [users, setUsers] = useState<{ id: number; email: string; name?: string; isAdmin?: boolean }[]>([]);
  const [addingUser, setAddingUser] = useState<number | null>(null);
  const [removingUser, setRemovingUser] = useState<number | null>(null);

  async function fetchGroup() {
    if (!id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin-groups/${id}`, { credentials: "include" });
      if (!res.ok) throw new Error("Group not found");
      const data = await res.json();
      setGroup(data);
      setNewName(data.name || "");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load group");
      setGroup(null);
    } finally {
      setLoading(false);
    }
  }

  async function fetchUsage() {
    if (!id) return;
    try {
      const res = await fetch(`/api/admin-groups/${id}/usage`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setUsage(data);
      }
    } catch (_) {}
  }

  async function fetchUsers() {
    try {
      const res = await fetch("/api/users", { credentials: "include" });
      if (!res.ok) return;
      const data = await res.json();
      setUsers(Array.isArray(data) ? data.filter((u: { isAdmin?: boolean }) => u.isAdmin) : []);
    } catch (_) {}
  }

  useEffect(() => {
    fetchGroup();
    fetchUsage();
  }, [id]);

  useEffect(() => {
    if (showAddMember) fetchUsers();
  }, [showAddMember]);

  async function handleSaveName() {
    if (!group || !newName.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin-groups/${group.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: newName.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Save failed");
      toast.success("Name updated");
      setEditingName(false);
      setGroup((prev) => (prev ? { ...prev, name: newName.trim() } : null));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function handleAddMember(userId: number) {
    if (!id) return;
    setAddingUser(userId);
    try {
      const res = await fetch(`/api/admin-groups/${id}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ userId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Add failed");
      }
      toast.success("Member added");
      setShowAddMember(false);
      await fetchGroup();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to add");
    } finally {
      setAddingUser(null);
    }
  }

  async function handleRemoveMember(userId: number) {
    if (!id) return;
    setRemovingUser(userId);
    try {
      const res = await fetch(`/api/admin-groups/${id}/members/${userId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Remove failed");
      toast.success("Member removed");
      await fetchGroup();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to remove");
    } finally {
      setRemovingUser(null);
    }
  }

  const memberIds = new Set((group?.members || []).map((m) => m.user?.id ?? m.userId).filter(Boolean));
  const availableUsers = users.filter((u) => !memberIds.has(u.id));

  if (loading) return <p>Loading...</p>;
  if (!group) return <p>Group not found.</p>;

  return (
    <div>
      <div style={{ marginBottom: "1rem" }}>
        <Link to="/groups" style={{ color: "#2563eb", marginRight: "1rem" }}>Go Back</Link>
        <Link to="/groups" style={{ color: "#2563eb" }}>View Complete Membership List</Link>
      </div>

      <h1>Admin Group &quot;{group.name}&quot;</h1>
      <p style={{ color: "#64748b", marginBottom: "1rem" }}>View and change group settings.</p>

      <div style={{ marginBottom: "1.5rem", padding: "1rem", border: "1px solid #e2e8f0", borderRadius: 8 }}>
        <div style={{ marginBottom: "0.5rem" }}>
          <strong>Group Name:</strong>{" "}
          {editingName ? (
            <>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                style={{ padding: "0.25rem 0.5rem", marginRight: "0.5rem" }}
              />
              <button
                type="button"
                onClick={handleSaveName}
                disabled={saving || !newName.trim()}
                style={{ padding: "0.25rem 0.5rem", marginRight: "0.5rem" }}
              >
                Save
              </button>
              <button type="button" onClick={() => { setEditingName(false); setNewName(group.name); }}>
                Cancel
              </button>
            </>
          ) : (
            <>
              {group.name}{" "}
              <button type="button" onClick={() => setEditingName(true)} style={{ marginLeft: "0.5rem" }}>
                Change Name...
              </button>
            </>
          )}
        </div>
        <div style={{ color: "#64748b", fontSize: "0.9rem" }}>
          <strong>Approval Workflow:</strong> (No Workflow){" "}
          <button type="button" disabled style={{ marginLeft: "0.5rem", opacity: 0.6 }}>
            Change Workflow...
          </button>
        </div>
      </div>

      <div style={{ marginBottom: "1.5rem", padding: "1rem", border: "1px solid #e2e8f0", borderRadius: 8 }}>
        <div style={{ background: "#f1f5f9", padding: "0.5rem 1rem", margin: "-1rem -1rem 1rem -1rem", borderRadius: "8px 8px 0 0" }}>
          <strong>Member Collection Rule:</strong>
        </div>
        <p style={{ color: "#64748b", margin: "0 0 0.5rem" }}>(None)</p>
        <button type="button" disabled style={{ opacity: 0.6 }}>Change Rule...</button>
      </div>

      <div style={{ marginBottom: "1.5rem", padding: "1rem", border: "1px solid #e2e8f0", borderRadius: 8 }}>
        <p style={{ margin: "0 0 1rem" }}>
          This group includes the following users, in addition to any users included by rule:
        </p>
        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
          <button
            type="button"
            onClick={() => setShowAddMember(true)}
            style={{
              padding: "0.5rem 1rem",
              background: "#22c55e",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              cursor: "pointer",
            }}
          >
            Add Members
          </button>
          <button type="button" disabled style={{ opacity: 0.6 }}>Delete</button>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f1f5f9" }}>
                <th style={{ padding: "0.5rem 1rem", textAlign: "left" }}>Login</th>
                <th style={{ padding: "0.5rem 1rem", textAlign: "left" }}>Status</th>
                <th style={{ padding: "0.5rem 1rem", textAlign: "left" }}>Full Name</th>
                <th style={{ padding: "0.5rem 1rem" }}></th>
              </tr>
            </thead>
            <tbody>
              {(group.members || []).map((m) => {
                const u = m.user;
                const uid = u?.id ?? m.userId;
                return (
                  <tr key={uid} style={{ borderBottom: "1px solid #e2e8f0" }}>
                    <td style={{ padding: "0.5rem 1rem" }}>{u?.email || "—"}</td>
                    <td style={{ padding: "0.5rem 1rem" }}>Active</td>
                    <td style={{ padding: "0.5rem 1rem" }}>{u?.name || "—"}</td>
                    <td style={{ padding: "0.5rem 1rem" }}>
                      <button
                        type="button"
                        onClick={() => handleRemoveMember(uid)}
                        disabled={removingUser === uid}
                        style={{ color: "#dc2626", background: "none", border: "none", cursor: "pointer" }}
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {(group.members?.length ?? 0) === 0 && (
          <p style={{ color: "#64748b", marginTop: "0.5rem" }}>No members yet.</p>
        )}
      </div>

      <div style={{ padding: "1rem", border: "1px solid #e2e8f0", borderRadius: 8, background: "#f8fafc" }}>
        <strong>Usage Report</strong>
        <p style={{ margin: "0.5rem 0 0", color: "#64748b" }}>
          {usage?.inUse
            ? `This group is used by: ${(usage.templates || []).join(", ") || "notification templates"}`
            : "This group is not used."}
        </p>
      </div>

      {showAddMember && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={() => setShowAddMember(false)}
        >
          <div
            style={{
              background: "#fff",
              padding: "1.5rem",
              borderRadius: 8,
              minWidth: 400,
              maxHeight: "80vh",
              overflowY: "auto",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ marginTop: 0 }}>Add Members</h3>
            <p style={{ color: "#64748b", fontSize: "0.9rem", marginBottom: "1rem" }}>
              Select an admin user to add to this group.
            </p>
            <div style={{ maxHeight: 300, overflowY: "auto" }}>
              {availableUsers.length === 0 ? (
                <p style={{ color: "#64748b" }}>No admin users available to add.</p>
              ) : (
                availableUsers.map((u) => (
                  <div
                    key={u.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "0.5rem 0",
                      borderBottom: "1px solid #e2e8f0",
                    }}
                  >
                    <span>{u.email} {u.name && `(${u.name})`}</span>
                    <button
                      type="button"
                      onClick={() => handleAddMember(u.id)}
                      disabled={addingUser === u.id}
                      style={{
                        padding: "0.25rem 0.5rem",
                        background: "#22c55e",
                        color: "#fff",
                        border: "none",
                        borderRadius: 4,
                        cursor: "pointer",
                      }}
                    >
                      Add
                    </button>
                  </div>
                ))
              )}
            </div>
            <button
              type="button"
              onClick={() => setShowAddMember(false)}
              style={{ marginTop: "1rem", padding: "0.5rem 1rem" }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
