import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";

interface AdminGroup {
  id: number;
  name: string;
  members?: { user?: { id: number; email: string; name?: string } }[];
}

interface UsageMap {
  [id: number]: { templates: string[]; inUse: boolean };
}

export default function AdminGroupsPage() {
  const [groups, setGroups] = useState<AdminGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInUse, setShowInUse] = useState(true);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [usage, setUsage] = useState<UsageMap>({});
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [duplicating, setDuplicating] = useState<number | null>(null);

  async function fetchGroups() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin-groups", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load groups");
      const data = await res.json();
      setGroups(Array.isArray(data) ? data : []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load groups");
      setGroups([]);
    } finally {
      setLoading(false);
    }
  }

  async function fetchUsage() {
    const u: UsageMap = {};
    for (const g of groups) {
      try {
        const res = await fetch(`/api/admin-groups/${g.id}/usage`, { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          u[g.id] = { templates: data.templates || [], inUse: data.inUse || false };
        }
      } catch (_) {}
    }
    setUsage(u);
  }

  useEffect(() => {
    fetchGroups();
  }, []);

  useEffect(() => {
    if (showInUse && groups.length > 0) fetchUsage();
  }, [showInUse, groups]);

  function toggleSelect(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selected.size === groups.length) setSelected(new Set());
    else setSelected(new Set(groups.map((g) => g.id)));
  }

  async function handleAdd() {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/admin-groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: newName.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Create failed");
      toast.success("Group created");
      setShowAddModal(false);
      setNewName("");
      await fetchGroups();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create");
    } finally {
      setCreating(false);
    }
  }

  async function handleDuplicate(id: number) {
    setDuplicating(id);
    try {
      const res = await fetch(`/api/admin-groups/${id}/duplicate`, {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Duplicate failed");
      toast.success("Group duplicated");
      await fetchGroups();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to duplicate");
    } finally {
      setDuplicating(null);
    }
  }

  async function handleDelete() {
    if (selected.size === 0) return;
    if (!confirm(`Delete ${selected.size} group(s)?`)) return;
    setDeleting(true);
    try {
      for (const id of selected) {
        const res = await fetch(`/api/admin-groups/${id}`, {
          method: "DELETE",
          credentials: "include",
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.message || "Delete failed");
        }
      }
      toast.success("Groups deleted");
      setSelected(new Set());
      await fetchGroups();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete");
    } finally {
      setDeleting(false);
    }
  }

  if (loading) return <p>Loading...</p>;

  return (
    <div>
      <h1>Admin Groups</h1>
      <p style={{ color: "#64748b", marginBottom: "1rem" }}>Create and manage admin groups.</p>

      <div style={{ marginBottom: "1rem", display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
        <label>
          <input type="checkbox" checked={showInUse} onChange={(e) => setShowInUse(e.target.checked)} /> Show &quot;In use?&quot;
        </label>
        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          style={{
            padding: "0.5rem 1rem",
            background: "#22c55e",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            cursor: "pointer",
          }}
        >
          Add New
        </button>
        <button
          type="button"
          onClick={() => selected.size === 1 && handleDuplicate([...selected][0])}
          disabled={selected.size !== 1}
          style={{
            padding: "0.5rem 1rem",
            background: selected.size === 1 ? "#3b82f6" : "#94a3b8",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            cursor: selected.size === 1 ? "pointer" : "not-allowed",
          }}
        >
          Duplicate
        </button>
        <button
          type="button"
          onClick={handleDelete}
          disabled={selected.size === 0 || deleting}
          style={{
            padding: "0.5rem 1rem",
            background: selected.size > 0 ? "#dc2626" : "#94a3b8",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            cursor: selected.size > 0 ? "pointer" : "not-allowed",
          }}
        >
          Delete
        </button>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#f1f5f9" }}>
              <th style={{ padding: "0.5rem 1rem", textAlign: "left" }}>
                <input
                  type="checkbox"
                  checked={groups.length > 0 && selected.size === groups.length}
                  onChange={toggleSelectAll}
                />
              </th>
              <th style={{ padding: "0.5rem 1rem", textAlign: "left" }}>Group</th>
              {showInUse && (
                <th style={{ padding: "0.5rem 1rem", textAlign: "left" }}>In use?</th>
              )}
            </tr>
          </thead>
          <tbody>
            {groups.map((g) => (
              <tr key={g.id} style={{ borderBottom: "1px solid #e2e8f0" }}>
                <td style={{ padding: "0.5rem 1rem" }}>
                  <input
                    type="checkbox"
                    checked={selected.has(g.id)}
                    onChange={() => toggleSelect(g.id)}
                  />
                </td>
                <td style={{ padding: "0.5rem 1rem" }}>
                  <Link
                    to={`/groups/${g.id}`}
                    style={{ color: "#2563eb", textDecoration: "none" }}
                  >
                    {g.name}
                  </Link>
                </td>
                {showInUse && (
                  <td style={{ padding: "0.5rem 1rem" }}>
                    {usage[g.id]?.inUse ? "Yes" : "No"}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p style={{ color: "#64748b", fontSize: "0.9rem", marginTop: "0.5rem" }}>
        Page 1/{groups.length ? 1 : 1} — {groups.length} rows
      </p>

      {showAddModal && (
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
          onClick={() => !creating && setShowAddModal(false)}
        >
          <div
            style={{
              background: "#fff",
              padding: "1.5rem",
              borderRadius: 8,
              minWidth: 320,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ marginTop: 0 }}>Add New Group</h3>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Group name"
              style={{ width: "100%", padding: "0.5rem", marginBottom: "1rem" }}
            />
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button
                type="button"
                onClick={handleAdd}
                disabled={!newName.trim() || creating}
                style={{
                  padding: "0.5rem 1rem",
                  background: "#22c55e",
                  color: "#fff",
                  border: "none",
                  borderRadius: 6,
                  cursor: creating ? "wait" : "pointer",
                }}
              >
                Add
              </button>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                disabled={creating}
                style={{
                  padding: "0.5rem 1rem",
                  background: "#94a3b8",
                  color: "#fff",
                  border: "none",
                  borderRadius: 6,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
