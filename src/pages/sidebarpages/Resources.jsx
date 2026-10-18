import { useState } from "react";
import Sidebar from "../Sidebar";
import "./Resources.css";

const TYPES = [
  { id: "all", label: "All" },
  { id: "book", label: "Books" },
  { id: "website", label: "Websites" },
  { id: "video", label: "Videos" },
  { id: "tool", label: "Tools" },
  { id: "cheatsheet", label: "Cheat sheets" },
  { id: "practice", label: "Practice" },
];

const TYPE_LABELS = {
  book: "Book",
  website: "Website",
  video: "Video",
  tool: "Tool",
  cheatsheet: "Cheat sheet",
  practice: "Practice",
};

const FIELDS = ["All fields", "Frontend", "Backend", "Cybersecurity", "Mobile"];

// Yeni resurs əlavə etmək üçün bu siyahıya obyekt yaz:
// { id: 1, type: "book", title: "Eloquent JavaScript", text: "Qısa təsvir.", field: "Frontend", price: "Free", url: "https://eloquentjavascript.net" }
// type: book | website | video | tool | cheatsheet | practice
// price: Free | Free plan | Paid
const RESOURCES = [];

export default function Resources() {
  const [type, setType] = useState("all");
  const [field, setField] = useState("All fields");
  const [query, setQuery] = useState("");

  const visible = RESOURCES.filter((r) => {
    const okType = type === "all" || r.type === type;
    const okField = field === "All fields" || r.field === field;
    const okQuery = r.title.toLowerCase().includes(query.trim().toLowerCase());
    return okType && okField && okQuery;
  });

  return (
    <div className="resources-layout">
      <Sidebar />
      <main className="resources-main">
        <div className="resources-page">
          <header className="resources-header">
            <h1>Resources</h1>
            <p>Books, sites, videos and tools to learn from.</p>
          </header>

          <div className="resources-tabs" role="tablist">
            {TYPES.map((t) => (
              <button
                key={t.id}
                role="tab"
                aria-selected={type === t.id}
                className={"resources-tab" + (type === t.id ? " is-active" : "")}
                onClick={() => setType(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="resources-toolbar">
            <div className="resources-search">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
              <input
                type="search"
                aria-label="Search resources"
                placeholder="Search resources"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <div className="resources-fields">
              {FIELDS.map((f) => (
                <button
                  key={f}
                  className={"resources-field" + (field === f ? " is-active" : "")}
                  onClick={() => setField(f)}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {RESOURCES.length === 0 ? (
            <div className="resources-empty">
              <h2>No resources yet</h2>
              <p className="resources-empty-text">
                Books, sites and videos will appear here soon.
              </p>
            </div>
          ) : visible.length === 0 ? (
            <div className="resources-empty">
              <h2>No results</h2>
              <p className="resources-empty-text">Try a different search or filter.</p>
            </div>
          ) : (
            <div className="resources-grid">
              {visible.map((r) => (
                <div className="resources-card" key={r.id}>
                  <div className="resources-card-top">
                    <span className="resources-badge">{TYPE_LABELS[r.type]}</span>
                    <button className="resources-save" aria-label="Save resource">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M6 3h12v18l-6-4-6 4z" />
                      </svg>
                    </button>
                  </div>
                  <h3>{r.title}</h3>
                  <p>{r.text}</p>
                  <div className="resources-tags">
                    <span>{r.field}</span>
                    <span className="is-price">{r.price}</span>
                  </div>
                  <a
                    className="resources-open"
                    href={r.url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}