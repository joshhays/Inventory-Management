import { useState, useEffect } from "react";
import toast from "react-hot-toast";

interface Template {
  id: number;
  name: string;
  subject: string;
  body: string;
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selected, setSelected] = useState<Template | null>(null);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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
    }
  }, [selected]);

  async function handleSave() {
    if (!selected) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/notification-templates/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ subject, body }),
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
        Select a template, edit the subject and body, then save. Use placeholders like {"{{name}}"}, {"{{email}}"}, {"{{trackingCode}}"}.
      </p>
      <div style={{ marginBottom: "1rem" }}>
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
          style={{ padding: "0.5rem", minWidth: 200 }}
        >
          <option value="">— Select —</option>
          {templates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </div>
      {selected && (
        <>
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
