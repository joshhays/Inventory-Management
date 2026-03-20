import { useState, useEffect } from "react";
import toast from "react-hot-toast";

interface AdminGroup {
  id: number;
  name: string;
  canApproveOrders?: boolean;
  canManageInventory?: boolean;
  canEditUsers?: boolean;
  members?: { user?: { id: number; email: string; name?: string } }[];
}

interface User {
  id: number;
  email: string;
  name?: string;
  isAdmin?: boolean;
}

export default function PermissionManagerPage() {
  const [groups, setGroups] = useState<AdminGroup[]>([]);
  const [selected, setSelected] = useState<AdminGroup | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [canApproveOrders, setCanApproveOrders] = useState(false);
  const [canManageInventory, setCanManageInventory] = useState(false);
  const [canEditUsers, setCanEditUsers] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [addingUser, setAddingUser] = useState<number | null>(null);
  const [removingUser, setRemovingUser] = useState<number | null>(null);

  async function fetchGroups() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin-groups", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load groups");
      const data = await res.json();
      setGroups(Array.isArray(data) ? data : []);
      if (selected && data.find((g: AdminGroup) => g.id === selected.id)) {
        setSelected(data.find((g: AdminGroup) => g.id === selected.id));
      } else if (data.length > 0 && !selected) {
        setSelected(data[0]);
      } else {
        setSelected(data[0] ?? null);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load groups");
      setGroups([]);
      setSelected(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchGroups();
  }, []);

  useEffect(() => {
    if (selected) {
      setCanApproveOrders(selected.canApproveOrders ?? false);
      setCanManageInventory(selected.canManageInventory ?? false);
      setCanEditUsers(selected.canEditUsers ?? false);
    }
  }, [selected]);

  async function fetchUsers() {
    try {
      const res = await fetch("/api/users", { credentials: "include" });
      if (!res.ok) return;
      const data = await res.json();
      setAvailableUsers(Array.isArray(data) ? data.filter((u: User) => u.isAdmin) : []);
    } catch (_) {}
  }

  useEffect(() => {
    if (selected) fetchUsers();
  }, [selected]);

  async function handleSavePermissions() {
    if (!selected) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin-groups/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          canApproveOrders,
          canManageInventory,
          canEditUsers,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Save failed");
      }
      toast.success("Permissions saved");
      const updated = await res.json();
      setSelected(updated);
      setGroups((prev) => prev.map((g) => (g.id === updated.id ? updated : g)));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function handleAddMember(userId: number) {
    if (!selected) return;
    setAddingUser(userId);
    try {
      const res = await fetch(`/api/admin-groups/${selected.id}/members`, {
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
      await fetchGroups();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to add");
    } finally {
      setAddingUser(null);
    }
  }

  async function handleRemoveMember(userId: number) {
    if (!selected) return;
    setRemovingUser(userId);
    try {
      const res = await fetch(`/api/admin-groups/${selected.id}/members/${userId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Remove failed");
      toast.success("Member removed");
      await fetchGroups();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to remove");
    } finally {
      setRemovingUser(null);
    }
  }

  const memberIds = new Set(
    (selected?.members || []).map((m) => m.user?.id).filter(Boolean) as number[]
  );
  const members = (selected?.members || []).map((m) => m.user).filter(Boolean);
  const searchLower = userSearch.toLowerCase().trim();
  const filteredUsers = availableUsers.filter(
    (u) =>
      !memberIds.has(u.id) &&
      (u.email.toLowerCase().includes(searchLower) ||
        (u.name || "").toLowerCase().includes(searchLower))
  );

  if (loading) return <p>Loading...</p>;

  return (
    <div style={{ display: "flex", gap: "2rem", alignItems: "flex-start", flexWrap: "wrap" }}>
      {/* Left: AdminGroups list */}
      <div style={{ minWidth: 220, flexShrink: 0 }}>
        <h3 style={{ marginTop: 0, marginBottom: "0.75rem" }}>Admin Groups</h3>
        <div style={{ border: "1px solid #e2e8f0", borderRadius: 8, overflow: "hidden" }}>
          {groups.length === 0 ? (
            <p style={{ padding: "1rem", color: "#64748b" }}>No groups. Create one in Admin Groups.</p>
          ) : (
            groups.map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => setSelected(g)}
                style={{
                  display: "block",
                  width: "100%",
                  padding: "0.75rem 1rem",
                  textAlign: "left",
                  border: "none",
                  background: selected?.id === g.id ? "#e0f2fe" : "#fff",
                  cursor: "pointer",
                  borderBottom: "1px solid #e2e8f0",
                }}
              >
                {g.name}
              </button>
            ))
          )}
        </div>
      </div>

      {/* Right: Permission Matrix + Members */}
      <div style={{ flex: 1, minWidth: 320 }}>
        {selected ? (
          <>
            <h3 style={{ marginTop: 0 }}>Permission Matrix</h3>
            <p style={{ color: "#64748b", marginBottom: "1rem" }}>
              Toggle permissions for <strong>{selected.name}</strong>
            </p>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                gap: "1rem",
                marginBottom: "1.5rem",
              }}
            >
              <label style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <input
                  type="checkbox"
                  checked={canApproveOrders}
                  onChange={(e) => setCanApproveOrders(e.target.checked)}
                />
                Approvals
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <input
                  type="checkbox"
                  checked={canManageInventory}
                  onChange={(e) => setCanManageInventory(e.target.checked)}
                />
                Inventory
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <input
                  type="checkbox"
                  checked={canEditUsers}
                  onChange={(e) => setCanEditUsers(e.target.checked)}
                />
                Users
              </label>
            </div>
            <button
              type="button"
              onClick={handleSavePermissions}
              disabled={saving}
              style={{
                padding: "0.5rem 1rem",
                background: "#22c55e",
                color: "#fff",
                border: "none",
                borderRadius: 6,
                cursor: "pointer",
              }}
            >
              {saving ? "Saving..." : "Save Permissions"}
            </button>

            <hr style={{ margin: "2rem 0", border: "none", borderTop: "1px solid #e2e8f0" }} />

            <h3>Members in this group</h3>
            <div style={{ marginBottom: "0.5rem" }}>
              <input
                type="text"
                placeholder="Search users to add..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                style={{
                  width: "100%",
                  maxWidth: 400,
                  padding: "0.5rem",
                  marginBottom: "0.5rem",
                }}
              />
            </div>
            {filteredUsers.length > 0 && (
              <div
                style={{
                  border: "1px solid #e2e8f0",
                  borderRadius: 8,
                  maxHeight: 200,
                  overflowY: "auto",
                  marginBottom: "1rem",
                }}
              >
                {filteredUsers.slice(0, 10).map((u) => (
                  <div
                    key={u.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "0.5rem 1rem",
                      borderBottom: "1px solid #f1f5f9",
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
                ))}
              </div>
            )}
            <div style={{ border: "1px solid #e2e8f0", borderRadius: 8, overflow: "hidden" }}>
              {members.length === 0 ? (
                <p style={{ padding: "1rem", color: "#64748b" }}>No members yet.</p>
              ) : (
                members.map((u) => (
                  <div
                    key={u!.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "0.5rem 1rem",
                      borderBottom: "1px solid #f1f5f9",
                    }}
                  >
                    <span>{u!.email} {u!.name && `(${u!.name})`}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveMember(u!.id)}
                      disabled={removingUser === u!.id}
                      style={{
                        color: "#dc2626",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                      }}
                    >
                      Remove
                    </button>
                  </div>
                ))
              )}
            </div>
          </>
        ) : (
          <p style={{ color: "#64748b" }}>Select a group to manage permissions.</p>
        )}
      </div>
    </div>
  );
}
