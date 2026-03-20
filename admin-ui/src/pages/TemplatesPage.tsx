import { useState, useEffect } from "react";
import toast from "react-hot-toast";

interface Group {
  id: number;
  name: string;
}

interface RecipientGroup {
  adminGroupId?: number;
  adminGroup?: { id: number; name: string };
}

interface Template {
  id: number;
  name: string;
  displayName?: string;
  subject: string;
  body: string;
  recipientType?: string;
  customEmails?: string;
  recipientGroups?: RecipientGroup[];
}

const TRIGGER_OPTIONS = [
  { value: "ORDER_PLACED", label: "Order placed (customer confirmation)" },
  { value: "ORDER_APPROVAL_NEEDED", label: "Order approval needed (notify approvers)" },
  { value: "ORDER_APPROVED", label: "Order approved (customer notification)" },
  { value: "ORDER_REJECTED", label: "Order rejected (customer notification)" },
];

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selected, setSelected] = useState<Template | null>(null);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [recipientType, setRecipientType] = useState<"customer" | "admin_groups" | "custom_emails">("customer");
  const [selectedGroupIds, setSelectedGroupIds] = useState<number[]>([]);
  const [customEmails, setCustomEmails] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newTrigger, setNewTrigger] = useState("");
  const [newDisplayName, setNewDisplayName] = useState("");
  const [newSubject, setNewSubject] = useState("");
  const [newBody, setNewBody] = useState("");
  const [newRecipientType, setNewRecipientType] = useState<"customer" | "admin_groups" | "custom_emails">("customer");
  const [newGroupIds, setNewGroupIds] = useState<number[]>([]);
  const [newCustomEmails, setNewCustomEmails] = useState("");
  const [creating, setCreating] = useState(false);

  async function fetchTemplates() {
    setLoading(true);
    try {
      const res = await fetch("/api/notification-templates", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load templates");
      const data = await res.json();
      const list = Array.isArray(data) ? data : [];
      setTemplates(list);
      if (!selected && list.length > 0) {
        setSelected(list[0]);
        setSubject(list[0].subject);
        setBody(list[0].body);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load templates");
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchTemplates();
  }, []);

  useEffect(() => {
    if (selected) {
      setSubject(selected.subject);
      setBody(selected.body);
      setDisplayName(selected.displayName || "");
      setRecipientType((selected.recipientType as "customer" | "admin_groups" | "custom_emails") || "customer");
      setSelectedGroupIds(
        (selected.recipientGroups || []).map((r) => r.adminGroupId ?? r.adminGroup?.id).filter(Boolean) as number[]
      );
      setCustomEmails((selected as Template & { customEmails?: string }).customEmails || "");
    }
  }, [selected]);

  async function fetchGroups() {
    try {
      const res = await fetch("/api/admin-groups", { credentials: "include" });
      if (!res.ok) return;
      const data = await res.json();
      setGroups(Array.isArray(data) ? data : data.groups || []);
    } catch (_) {}
  }

  useEffect(() => {
    if (recipientType === "admin_groups" && groups.length === 0) fetchGroups();
  }, [recipientType]);

  async function handleSave() {
    if (!selected) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/notification-templates/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          subject,
          body,
          displayName: displayName.trim() || undefined,
          recipientType,
          groupIds: recipientType === "admin_groups" ? selectedGroupIds : [],
          customEmails: recipientType === "custom_emails" ? customEmails : "",
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Save failed");
      }
      toast.success("Template saved");
      const updated = await res.json();
      setSelected(updated);
      setTemplates((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p>Loading...</p>;

  return (
    <div>
      <h1>Notification Templates</h1>
      <p style={{ color: "#64748b", marginBottom: "1rem" }}>
        Select a template, edit the subject and body, then save. Use placeholders like {"{{name}}"}, {"{{email}}"}, {"{{trackingCode}}"}, {"{{orderId}}"}, {"{{total}}"}, {"{{approvalLink}}"}. Trigger names (e.g. ORDER_APPROVED, ORDER_PLACED) must match the code that sends the email.
      </p>
      <div style={{ marginBottom: "1rem", display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
        <label htmlFor="template-select" style={{ marginRight: "0.5rem" }}>
          Template:
        </label>
        <select
          id="template-select"
          value={selected?.id ?? ""}
          onChange={(e) => {
            const id = Number(e.target.value);
            const t = templates.find((x) => x.id === id);
            setSelected(t ?? null);
          }}
          style={{ padding: "0.5rem", minWidth: 280 }}
        >
          <option value="">— Select —</option>
          {templates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.displayName || t.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          style={{
            padding: "0.5rem 1rem",
            background: "#22c55e",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            cursor: "pointer",
          }}
        >
          + Create new
        </button>
      </div>
      {showCreate && (
        <div
          style={{
            margin: "1rem 0",
            padding: "1rem",
            border: "1px solid #e2e8f0",
            borderRadius: 8,
            background: "#f8fafc",
          }}
        >
          <h3 style={{ marginTop: 0 }}>Create template</h3>
          <div style={{ marginBottom: "0.75rem" }}>
            <label style={{ display: "block", marginBottom: "0.25rem" }}>Trigger (when this email sends)</label>
            <select
              value={newTrigger}
              onChange={(e) => setNewTrigger(e.target.value)}
              style={{ width: "100%", maxWidth: 400, padding: "0.5rem" }}
            >
              <option value="">— Select trigger —</option>
              {TRIGGER_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div style={{ marginBottom: "0.75rem" }}>
            <label style={{ display: "block", marginBottom: "0.25rem" }}>Template name (optional)</label>
            <input
              value={newDisplayName}
              onChange={(e) => setNewDisplayName(e.target.value)}
              placeholder="e.g. Order Confirmation Email"
              style={{ width: "100%", maxWidth: 300, padding: "0.5rem" }}
            />
            <p style={{ color: "#64748b", fontSize: "0.85rem", margin: "0.25rem 0 0" }}>
              A friendly name for this template. If blank, the trigger name is shown.
            </p>
          </div>
          <div style={{ marginBottom: "0.75rem" }}>
            <label style={{ display: "block", marginBottom: "0.25rem" }}>Recipients</label>
            <div style={{ display: "flex", gap: "1rem", marginBottom: "0.25rem", flexWrap: "wrap" }}>
              <label>
                <input
                  type="radio"
                  checked={newRecipientType === "customer"}
                  onChange={() => setNewRecipientType("customer")}
                />{" "}
                Customer (order email)
              </label>
              <label>
                <input
                  type="radio"
                  checked={newRecipientType === "admin_groups"}
                  onChange={() => {
                    setNewRecipientType("admin_groups");
                    if (groups.length === 0) fetchGroups();
                  }}
                />{" "}
                Admin groups
              </label>
              <label>
                <input
                  type="radio"
                  checked={newRecipientType === "custom_emails"}
                  onChange={() => setNewRecipientType("custom_emails")}
                />{" "}
                Custom emails
              </label>
            </div>
            {newRecipientType === "custom_emails" && (
              <div style={{ marginTop: "0.5rem" }}>
                <input
                  type="text"
                  value={newCustomEmails}
                  onChange={(e) => setNewCustomEmails(e.target.value)}
                  placeholder="email1@example.com, email2@example.com"
                  style={{ width: "100%", maxWidth: 400, padding: "0.5rem" }}
                />
                <p style={{ color: "#64748b", fontSize: "0.85rem", margin: "0.25rem 0 0" }}>
                  Comma- or space-separated email addresses
                </p>
              </div>
            )}
            {newRecipientType === "admin_groups" &&
              groups.map((g) => (
                <label key={g.id} style={{ display: "block" }}>
                  <input
                    type="checkbox"
                    checked={newGroupIds.includes(g.id)}
                    onChange={(e) => {
                      if (e.target.checked) setNewGroupIds((prev) => [...prev, g.id]);
                      else setNewGroupIds((prev) => prev.filter((id) => id !== g.id));
                    }}
                  />{" "}
                  {g.name}
                </label>
              ))}
          </div>
          <div style={{ marginBottom: "0.75rem" }}>
            <label style={{ display: "block", marginBottom: "0.25rem" }}>Subject</label>
            <input
              value={newSubject}
              onChange={(e) => setNewSubject(e.target.value)}
              placeholder="Order confirmation - #{{orderId}}"
              style={{ width: "100%", maxWidth: 500, padding: "0.5rem" }}
            />
          </div>
          <div style={{ marginBottom: "0.75rem" }}>
            <label style={{ display: "block", marginBottom: "0.25rem" }}>Body</label>
            <textarea
              value={newBody}
              onChange={(e) => setNewBody(e.target.value)}
              placeholder="Hi {{name}},\n\nThank you for your order..."
              rows={6}
              style={{ width: "100%", maxWidth: 600, padding: "0.5rem", fontFamily: "inherit" }}
            />
          </div>
          <button
            onClick={async () => {
              const trigger = newTrigger.trim();
              const subj = newSubject.trim();
              const b = newBody;
              if (!trigger || !subj || b === undefined) {
                toast.error("Trigger, subject, and body are required");
                return;
              }
              setCreating(true);
              try {
                const res = await fetch("/api/notification-templates", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  credentials: "include",
                  body: JSON.stringify({
                  name: trigger,
                  displayName: newDisplayName.trim() || undefined,
                  subject: subj,
                  body: b,
                  recipientType: newRecipientType,
                  groupIds: newRecipientType === "admin_groups" ? newGroupIds : [],
                  customEmails: newRecipientType === "custom_emails" ? newCustomEmails : "",
                }),
                });
                const data = await res.json().catch(() => ({}));
                if (!res.ok) throw new Error(data.message || "Create failed");
                toast.success("Template created");
                setShowCreate(false);
                setNewTrigger("");
                setNewDisplayName("");
                setNewSubject("");
                setNewBody("");
                setNewCustomEmails("");
                await fetchTemplates();
                const created = data as Template;
                if (created?.id) {
                  setSelected(created);
                  setSubject(created.subject);
                  setBody(created.body);
                }
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "Failed to create");
              } finally {
                setCreating(false);
              }
            }}
            disabled={creating}
            style={{
              padding: "0.5rem 1.25rem",
              background: "#22c55e",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              cursor: creating ? "not-allowed" : "pointer",
            }}
          >
            {creating ? "Creating…" : "Create"}
          </button>
          <button
            type="button"
            onClick={() => setShowCreate(false)}
            style={{
              marginLeft: "0.5rem",
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
      {selected && (
        <>
          <div style={{ marginBottom: "1rem" }}>
            <label style={{ display: "block", marginBottom: "0.25rem" }}>Trigger</label>
            <p style={{ color: "#64748b", fontSize: "0.9rem", margin: "0 0 0.5rem" }}>
              {selected.name} — {TRIGGER_OPTIONS.find((o) => o.value === selected.name)?.label || "Custom trigger"}
            </p>
          </div>
          <div style={{ marginBottom: "1rem" }}>
            <label style={{ display: "block", marginBottom: "0.25rem" }}>Template name</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. Order Confirmation Email"
              style={{ width: "100%", maxWidth: 400, padding: "0.5rem" }}
            />
          </div>
          <div style={{ marginBottom: "1rem" }}>
            <label style={{ display: "block", marginBottom: "0.25rem" }}>Recipients</label>
            <div style={{ display: "flex", gap: "1rem", alignItems: "center", marginBottom: "0.5rem", flexWrap: "wrap" }}>
              <label>
                <input
                  type="radio"
                  checked={recipientType === "customer"}
                  onChange={() => setRecipientType("customer")}
                />{" "}
                Customer (order email)
              </label>
              <label>
                <input
                  type="radio"
                  checked={recipientType === "admin_groups"}
                  onChange={() => setRecipientType("admin_groups")}
                />{" "}
                Admin groups
              </label>
              <label>
                <input
                  type="radio"
                  checked={recipientType === "custom_emails"}
                  onChange={() => setRecipientType("custom_emails")}
                />{" "}
                Custom emails
              </label>
            </div>
            {recipientType === "custom_emails" && (
              <div style={{ marginTop: "0.5rem" }}>
                <input
                  type="text"
                  value={customEmails}
                  onChange={(e) => setCustomEmails(e.target.value)}
                  placeholder="email1@example.com, email2@example.com"
                  style={{ width: "100%", maxWidth: 400, padding: "0.5rem" }}
                />
                <p style={{ color: "#64748b", fontSize: "0.85rem", margin: "0.25rem 0 0" }}>
                  Comma- or space-separated email addresses
                </p>
              </div>
            )}
            {recipientType === "admin_groups" && (
              <div style={{ marginTop: "0.5rem" }}>
                <p style={{ color: "#64748b", fontSize: "0.9rem", margin: "0 0 0.25rem" }}>
                  Admins in these groups receive the email. <a href="/dashboard.html">Switch deployment</a> to see other groups.
                </p>
                {groups.map((g) => (
                  <label key={g.id} style={{ display: "block" }}>
                    <input
                      type="checkbox"
                      checked={selectedGroupIds.includes(g.id)}
                      onChange={(e) => {
                        if (e.target.checked) setSelectedGroupIds((prev) => [...prev, g.id]);
                        else setSelectedGroupIds((prev) => prev.filter((id) => id !== g.id));
                      }}
                    />{" "}
                    {g.name}
                  </label>
                ))}
                {groups.length === 0 && (
                  <p style={{ color: "#64748b", fontSize: "0.9rem" }}>
                    No groups. <a href="/groups.html">Create groups</a> and add admin users.
                  </p>
                )}
              </div>
            )}
          </div>
          <div style={{ marginBottom: "1rem" }}>
            <label htmlFor="subject" style={{ display: "block", marginBottom: "0.25rem" }}>
              Subject
            </label>
            <input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              style={{ width: "100%", maxWidth: 500, padding: "0.5rem" }}
            />
          </div>
          <div style={{ marginBottom: "1rem" }}>
            <label htmlFor="body" style={{ display: "block", marginBottom: "0.25rem" }}>
              Body
            </label>
            <textarea
              id="body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={12}
              style={{ width: "100%", maxWidth: 600, padding: "0.5rem", fontFamily: "inherit" }}
            />
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: "0.5rem 1.25rem",
              background: "#2563eb",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              cursor: saving ? "not-allowed" : "pointer",
            }}
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </>
      )}
      {!loading && templates.length === 0 && (
        <p style={{ color: "#64748b" }}>No notification templates found. Create them via the database or API.</p>
      )}
    </div>
  );
}
