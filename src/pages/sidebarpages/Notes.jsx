import { useEffect, useState } from "react";
import Sidebar from "../Sidebar";
import { supabase } from "/src/supabaseclient.js";
import "./Notes.css";

const FIELDS = [
  "All fields",
  "Web",
  "Backend",
  "Mobile",
  "Cybersecurity",
  "Data",
  "Artificial Intelligence",
  "DevOps & Cloud",
];
const NOTE_FIELDS = FIELDS.slice(1);

function formatDate(date) {
  return new Date(date).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function Notes() {
  const [user, setUser] = useState(null);
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [query, setQuery] = useState("");
  const [field, setField] = useState("All fields");

  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState({
    field: "Frontend",
    title: "",
    content: "",
  });
  const [formError, setFormError] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data?.user ?? null));
  }, []);

  useEffect(() => {
    let cancelled = false;
    supabase
      .from("notes")
      .select("id, title, content, field, updated_at")
      .order("updated_at", { ascending: false })
      .then(({ data, error }) => {
        if (cancelled) return;
        setNotes(!error && data ? data : []);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  async function submitNote(e) {
    e.preventDefault();
    if (!form.title.trim() || !form.content.trim()) {
      setFormError("Enter a title and your note.");
      return;
    }
    if (!user) {
      setFormError("Log in to add notes.");
      return;
    }
    const { error } = await supabase.from("notes").insert({
      user_id: user.id,
      field: form.field,
      title: form.title.trim(),
      content: form.content.trim(),
    });
    if (error) {
      setFormError("Couldn't save the note. Try again.");
      return;
    }
    setForm({ field: "Frontend", title: "", content: "" });
    setFormError("");
    setFormOpen(false);
    setRefreshKey((k) => k + 1);
  }

  const visible = notes.filter((n) => {
    const okField = field === "All fields" || n.field === field;
    const okQuery = n.title.toLowerCase().includes(query.trim().toLowerCase());
    return okField && okQuery;
  });

  return (
    <div className="notes-layout">
      <Sidebar />
      <main className="notes-main">
        <div className="notes-page">
          <header className="notes-header">
            <div>
              <h1>Notes</h1>
              <p>Your private notes while you learn.</p>
            </div>
            <button
              className="notes-primary"
              onClick={() => setFormOpen(!formOpen)}
            >
              + Add note
            </button>
          </header>

          {formOpen && (
            <form className="notes-form" onSubmit={submitNote}>
              <label htmlFor="note-field">Field</label>
              <select
                id="note-field"
                value={form.field}
                onChange={(e) => setForm({ ...form, field: e.target.value })}
              >
                {NOTE_FIELDS.map((f) => (
                  <option key={f}>{f}</option>
                ))}
              </select>

              <label htmlFor="note-title">Title</label>
              <input
                id="note-title"
                type="text"
                value={form.title}
                onChange={(e) => {
                  setForm({ ...form, title: e.target.value });
                  setFormError("");
                }}
                placeholder="Functions and scope"
              />

              <label htmlFor="note-content">Note</label>
              <textarea
                id="note-content"
                rows={8}
                value={form.content}
                onChange={(e) => {
                  setForm({ ...form, content: e.target.value });
                  setFormError("");
                }}
                placeholder="Write in your own words. Wrap code in three backticks to format it."
              />

              {formError && <p className="notes-error">{formError}</p>}
              <div className="notes-form-actions">
                <button type="submit" className="notes-primary">
                  Save note
                </button>
                <button
                  type="button"
                  className="notes-secondary"
                  onClick={() => setFormOpen(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          <div className="notes-search">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
            <input
              type="search"
              aria-label="Search notes"
              placeholder="Search notes"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          <div className="notes-tabs" role="tablist">
            {FIELDS.map((f) => (
              <button
                key={f}
                role="tab"
                aria-selected={field === f}
                className={"notes-tab" + (field === f ? " is-active" : "")}
                onClick={() => setField(f)}
              >
                {f}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="notes-empty">
              <p className="notes-empty-text">Loading...</p>
            </div>
          ) : notes.length === 0 ? (
            <div className="notes-empty">
              <h2>No notes yet</h2>
              <p className="notes-empty-text">Write your first note.</p>
            </div>
          ) : visible.length === 0 ? (
            <div className="notes-empty">
              <h2>No notes here</h2>
              <p className="notes-empty-text">
                Try a different search or field.
              </p>
            </div>
          ) : (
            <div className="notes-grid">
              {visible.map((n) => (
                // onClick (notu açmaq) sonrakı mərhələdə əlavə olunacaq
                <article className="notes-card" key={n.id}>
                  <span className="notes-field">{n.field}</span>
                  <h3>{n.title}</h3>
                  <p className="notes-preview">
                    {n.content.replace(/```/g, "")}
                  </p>
                  <span className="notes-date">
                    Edited {formatDate(n.updated_at)}
                  </span>
                </article>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
