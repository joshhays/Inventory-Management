import { useState, useEffect } from "react";
import toast from "react-hot-toast";

interface AccessRow {
  category: string;
  pages: string[];
  viewModifyGroupIds?: number[];
  viewOnlyGroupIds?: number[];
}

interface AdminGroup {
  id: number;
  name: string;
}

export default function AdminAccessPage() {
  const [config, setConfig] = useState<AccessRow[]>([]);
  const [groups, setGroups] = useState<AdminGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  async function fetchData() {
    setLoading(true);
    try {
      const [configRes, groupsRes] = await Promise.all([
        fetch("/api/admin-access", { credentials: "include" }),
        fetch("/api/admin-groups", { credentials: "include" }),
      ]);
      if (!configRes.ok) throw new Error("Failed to load access config");
      if (!groupsRes.ok) throw new Error("Failed to load groups");
      const configData = await configRes.json();
      const groupsData = await groupsRes.json();
      setConfig(configData.config || []);
      setGroups(Array.isArray(groupsData) ? groupsData : []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load");
      setConfig([]);
      setGroups([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  function getGroupName(gid: number) {
    if (gid === -1) return "(Everyone)";
    const g = groups.find((x) => x.id === gid);
    return g?.name || `Group ${gid}`;
  }

  function handleChangeViewModify(rowIndex: number, groupId: number, checked: boolean) {
    setConfig((prev) => {
      const next = prev.map((r, i) => {
        if (i !== rowIndex) return r;
        const ids = [...(r.viewModifyGroupIds || [])];
        if (checked) {
          if (!ids.includes(groupId)) ids.push(groupId);
        } else {
          const idx = ids.indexOf(groupId);
          if (idx >= 0) ids.splice(idx, 1);
        }
        return { ...r, viewModifyGroupIds: ids };
      });
      return next;
    });
  }

  function handleChangeViewOnly(rowIndex: number, groupId: number, checked: boolean) {
    setConfig((prev) => {
      const next = prev.map((r, i) => {
        if (i !== rowIndex) return r;
        const ids = [...(r.viewOnlyGroupIds || [])];
        if (checked) {
          if (!ids.includes(groupId)) ids.push(groupId);
        } else {
          const idx = ids.indexOf(groupId);
          if (idx >= 0) ids.splice(idx, 1);
        }
        return { ...r, viewOnlyGroupIds: ids };
      });
      return next;
    });
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/admin-access", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ config }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Save failed");
      }
      toast.success("Access settings saved");
      setEditing(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p>Loading...</p>;

  return (
    <div>
      <h1>Admin Access</h1>
      <p style={{ color: "#64748b", marginBottom: "1rem" }}>
        Set privileges to access general features of the administrator site.
      </p>

      {!editing ? (
        <button
          type="button"
          onClick={() => setEditing(true)}
          style={{
            padding: "0.5rem 1rem",
            background: "#3b82f6",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            cursor: "pointer",
            marginBottom: "1rem",
          }}
        >
          Change Settings
        </button>
      ) : (
        <div style={{ marginBottom: "1rem", display: "flex", gap: "0.5rem" }}>
          <button
            type="button"
            onClick={handleSave}
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
            Save
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
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
      )}

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid #e2e8f0" }}>
          <thead>
            <tr style={{ background: "#f1f5f9" }}>
              <th style={{ padding: "0.5rem 1rem", textAlign: "left", borderBottom: "1px solid #e2e8f0" }}>
                Access Category
              </th>
              <th style={{ padding: "0.5rem 1rem", textAlign: "left", borderBottom: "1px solid #e2e8f0" }}>
                Accessible Pages
              </th>
              <th style={{ padding: "0.5rem 1rem", textAlign: "left", borderBottom: "1px solid #e2e8f0" }}>
                Who can view and modify information?
              </th>
              <th style={{ padding: "0.5rem 1rem", textAlign: "left", borderBottom: "1px solid #e2e8f0" }}>
                Who can view information?
              </th>
            </tr>
          </thead>
          <tbody>
            {config.map((row, i) => (
              <tr key={i} style={{ borderBottom: "1px solid #e2e8f0" }}>
                <td style={{ padding: "0.5rem 1rem", verticalAlign: "top" }}>{row.category}</td>
                <td style={{ padding: "0.5rem 1rem", verticalAlign: "top" }}>
                  {(row.pages || []).join(", ")}
                </td>
                <td style={{ padding: "0.5rem 1rem", verticalAlign: "top" }}>
                  {editing ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                      {groups.map((g) => (
                        <label key={g.id}>
                          <input
                            type="checkbox"
                            checked={(row.viewModifyGroupIds || []).includes(g.id)}
                            onChange={(e) => handleChangeViewModify(i, g.id, e.target.checked)}
                          />{" "}
                          {g.name}
                        </label>
                      ))}
                      {groups.length === 0 && (
                        <span style={{ color: "#64748b" }}>No groups. Create groups first.</span>
                      )}
                    </div>
                  ) : (
                    (row.viewModifyGroupIds || [])
                      .map((gid) => getGroupName(gid))
                      .join(", ") || "(none)"
                  )}
                </td>
                <td style={{ padding: "0.5rem 1rem", verticalAlign: "top" }}>
                  {editing ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                      {groups.map((g) => (
                        <label key={g.id}>
                          <input
                            type="checkbox"
                            checked={(row.viewOnlyGroupIds || []).includes(g.id)}
                            onChange={(e) => handleChangeViewOnly(i, g.id, e.target.checked)}
                          />{" "}
                          {g.name}
                        </label>
                      ))}
                      {groups.length === 0 && (
                        <span style={{ color: "#64748b" }}>No groups.</span>
                      )}
                    </div>
                  ) : (
                    (row.viewOnlyGroupIds || [])
                      .map((gid) => getGroupName(gid))
                      .join(", ") || "(none)"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
