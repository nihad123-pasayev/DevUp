import { useEffect, useState } from "react";
import Sidebar from "../Sidebar";
import { supabase } from "/src/supabaseclient.js";
import "./Saved.css";

const TABS = [
  { id: "all", label: "All" },
  { id: "resource", label: "Resources" },
  { id: "question", label: "Questions" },
  { id: "idea", label: "Project ideas" },
  { id: "lesson", label: "Lessons" },
];

const TYPE_LABELS = {
  resource: "Resource",
  question: "Question",
  idea: "Project idea",
  lesson: "Lesson",
};

const FIELDS = ["All fields", "Frontend", "Backend", "Cybersecurity", "Mobile"];

export default function Saved() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("all");
  const [field, setField] = useState("All fields");
  const [query, setQuery] = useState("");

  useEffect(() => {
    let cancelled = false;
    supabase
      .from("saved_items")
      .select("id, item_type, title, description, field, link, created_at")
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (cancelled) return;
        setItems(!error && data ? data : []);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function removeItem(id) {
    const { error } = await supabase.from("saved_items").delete().eq("id", id);
    if (!error) setItems((prev) => prev.filter((i) => i.id !== id));
  }

  const visible = items.filter((i) => {
    const okTab = tab === "all" || i.item_type === tab;
    const okField = field === "All fields" || i.field === field;
    const okQuery = i.title.toLowerCase().includes(query.trim().toLowerCase());
    return okTab && okField && okQuery;
  });

  return (
    <div className="saved-layout">
      <Sidebar />
      <main className="saved-main">
        <div className="saved-page">
          <header className="saved-header">
            <h1>Saved</h1>
            <p>Everything you bookmarked, in one place.</p>
          </header>

          <div className="saved-tabs" role="tablist">
            {TABS.map((t) => (
              <button
                key={t.id}
                role="tab"
                aria-selected={tab === t.id}
                className={"saved-tab" + (tab === t.id ? " is-active" : "")}
                onClick={() => setTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="saved-toolbar">
            <div className="saved-search">
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
                aria-label="Search saved items"
                placeholder="Search saved items"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <div className="saved-fields">
              {FIELDS.map((f) => (
                <button
                  key={f}
                  className={"saved-field" + (field === f ? " is-active" : "")}
                  onClick={() => setField(f)}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="saved-empty">
              <p className="saved-empty-text">Loading...</p>
            </div>
          ) : items.length === 0 ? (
            <div className="saved-empty">
              <h2>Nothing saved yet</h2>
              <p className="saved-empty-text">
                Tap the bookmark icon on anything you want to keep.
              </p>
            </div>
          ) : visible.length === 0 ? (
            <div className="saved-empty">
              <h2>No results</h2>
              <p className="saved-empty-text">
                Try a different search or filter.
              </p>
            </div>
          ) : (
            <div className="saved-grid">
              {visible.map((i) => {
                const external = i.link && i.link.startsWith("http");
                return (
                  <article className="saved-card" key={i.id}>
                    <div className="saved-card-top">
                      <span className="saved-badge">
                        {TYPE_LABELS[i.item_type]}
                      </span>
                      {i.field && (
                        <span className="saved-card-field">{i.field}</span>
                      )}
                    </div>
                    <h3>{i.title}</h3>
                    {i.description && <p>{i.description}</p>}
                    <div className="saved-actions">
                      {i.link && (
                        <a
                          className="saved-open"
                          href={i.link}
                          target={external ? "_blank" : undefined}
                          rel={external ? "noreferrer" : undefined}
                        >
                          Open
                        </a>
                      )}
                      <button
                        className="saved-remove"
                        onClick={() => removeItem(i.id)}
                      >
                        Remove
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
