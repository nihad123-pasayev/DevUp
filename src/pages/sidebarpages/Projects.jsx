import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../Sidebar";
import { supabase } from "/src/supabaseclient.js";
import "./Projects.css";

const TABS = [
  { id: "mine", label: "My projects" },
  { id: "ideas", label: "Ideas" },
  { id: "find", label: "Find projects" },
];

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
const IDEAS = [
  {
    id: 1,
    title: "Todo App",
    field: "Web",
    level: "Beginner",
    tech: ["HTML", "CSS", "JavaScript"],
    text: "Add, complete and delete tasks, saved in the browser.",
  },
  {
    id: 2,
    title: "Weather App",
    field: "Web",
    level: "Beginner",
    tech: ["JavaScript", "API"],
    text: "Search a city and show its current weather from a public API.",
  },
  {
    id: 3,
    title: "Personal Portfolio",
    field: "Web",
    level: "Beginner",
    tech: ["React", "CSS"],
    text: "A multi-section site presenting your skills and projects.",
  },
  {
    id: 4,
    title: "Blog with Auth",
    field: "Backend",
    level: "Intermediate",
    tech: ["React", "Supabase"],
    text: "Sign up, log in, write and publish posts.",
  },
  {
    id: 5,
    title: "REST API",
    field: "Backend",
    level: "Intermediate",
    tech: ["Node.js", "Express"],
    text: "A CRUD API with validation and clear error messages.",
  },
  {
    id: 6,
    title: "Habit Tracker",
    field: "Mobile",
    level: "Intermediate",
    tech: ["React Native"],
    text: "Track daily habits and see your streaks.",
  },
];

const SITES = [
  {
    id: 1,
    name: "GitHub",
    url: "https://github.com",
    text: "Browse open source repositories and find projects to learn from.",
  },
  {
    id: 2,
    name: "Frontend Mentor",
    url: "https://www.frontendmentor.io",
    text: "Real design challenges with ready-made assets for frontend practice.",
  },
  {
    id: 3,
    name: "roadmap.sh Projects",
    url: "https://roadmap.sh/projects",
    text: "Project ideas grouped by roadmap and difficulty.",
  },
  {
    id: 4,
    name: "freeCodeCamp",
    url: "https://www.freecodecamp.org",
    text: "Hands-on projects as part of free certification courses.",
  },
  {
    id: 5,
    name: "Kaggle",
    url: "https://www.kaggle.com",
    text: "Datasets and competitions for data-focused projects.",
  },
  {
    id: 6,
    name: "Devpost",
    url: "https://devpost.com",
    text: "Hackathon projects for inspiration and teamwork.",
  },
];

const FIELD_COLORS = {
  Web: "#2563eb",
  Backend: "#7c3aed",
  Mobile: "#16a34a",
  Cybersecurity: "#dc2626",
  Data: "#0891b2",
  "Artificial Intelligence": "#db2777",
  "DevOps & Cloud": "#ea580c",
};

const LANG_LABELS = {
  html: "HTML",
  javascript: "JavaScript",
  typescript: "TypeScript",
  dart: "Dart",
  sql: "SQL",
  python: "Python",
};

function timeAgo(value) {
  if (!value) return "";
  const days = Math.floor((Date.now() - new Date(value).getTime()) / 86400000);
  if (days < 1) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30) return days + " days ago";
  const months = Math.floor(days / 30);
  if (months < 12) return months === 1 ? "1 month ago" : months + " months ago";
  const years = Math.floor(days / 365);
  return years === 1 ? "1 year ago" : years + " years ago";
}

export default function Projects() {
  const [tab, setTab] = useState("mine");
  const [query, setQuery] = useState("");
  const [field, setField] = useState("All fields");
  const [myProjects, setMyProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState(null);
  const navigate = useNavigate();

  // Tamamlanmış layihə dərsləri (My projects)
  useEffect(() => {
    async function loadProjects() {
      const { data: auth } = await supabase.auth.getUser();
      const user = auth?.user;
      if (!user) {
        setLoading(false);
        return;
      }
      const { data: done, error } = await supabase
        .from("user_progress")
        .select("lesson_id, completed_at, lessons!inner(id, title, kind, stages!inner(roadmaps!inner(field, track, title)))")
        .eq("user_id", user.id)
        .eq("status", "completed")
        .eq("lessons.kind", "project")
        .order("completed_at", { ascending: false });
      if (error || !done?.length) {
        setLoading(false);
        return;
      }
      const ids = done.map((d) => d.lesson_id);
      const [contentRes, subRes] = await Promise.all([
        supabase.from("lesson_content").select("lesson_id, type:lab_data->>type, ptitle:lab_data->>title, lang:lab_data->>language").in("lesson_id", ids),
        supabase.from("project_submissions").select("lesson_id, repo_url").eq("user_id", user.id).in("lesson_id", ids),
      ]);
      const content = new Map((contentRes.data || []).map((c) => [c.lesson_id, c]));
      const repos = new Map((subRes.data || []).map((s) => [s.lesson_id, s.repo_url]));
      setMyProjects(
        done.map((d) => {
          const road = d.lessons?.stages?.roadmaps;
          const c = content.get(d.lesson_id);
          return {
            id: d.lesson_id,
            title: c?.ptitle || d.lessons?.title || "Project",
            type: c?.type,
            field: road?.field || "",
            roadmap: road?.title || "",
            track: road?.track || "",
            completedAt: d.completed_at,
            tech: c?.type === "capstone" ? [] : [LANG_LABELS[c?.lang || "html"] || c?.lang].filter(Boolean),
            repo: repos.get(d.lesson_id),
          };
        }),
      );
      setLoading(false);
    }
    loadProjects();
  }, []);
  function matches(item, titleKey) {
    const q = query.trim().toLowerCase();
    const okQuery = item[titleKey].toLowerCase().includes(q);
    const okField = field === "All fields" || item.field === field;
    return okQuery && okField;
  }

  function shareRepo(e, p) {
    e.stopPropagation();
    navigator.clipboard?.writeText(p.repo);
    setCopiedId(p.id);
    setTimeout(() => setCopiedId((id) => (id === p.id ? null : id)), 2000);
  }

  const visibleMine = myProjects.filter((p) => matches(p, "title"));
  const visibleIdeas = IDEAS.filter((p) => matches(p, "title"));

  return (
    <Sidebar>
      <div className="projects-page">
        <header className="projects-header">
          <div>
            <h1>Projects</h1>
            <p>Build real things, get ideas and find places to practice.</p>
          </div>
        </header>

        <div className="projects-tabs" role="tablist">
          {TABS.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              className={"projects-tab" + (tab === t.id ? " is-active" : "")}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab !== "find" && (
          <div className="projects-toolbar">
            <div className="projects-search">
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
                aria-label="Search projects"
                placeholder="Search projects"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <div className="projects-fields">
              {FIELDS.map((f) => (
                <button
                  key={f}
                  className={
                    "projects-field" + (field === f ? " is-active" : "")
                  }
                  onClick={() => setField(f)}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
        )}

        {tab === "mine" &&
          (loading ? (
            <div className="projects-empty">
              <p className="projects-empty-text">Loading...</p>
            </div>
          ) : myProjects.length === 0 ? (
            <div className="projects-empty">
              <h2>No projects yet</h2>
              <p className="projects-empty-text">
                Finish a project lesson and it will appear here.
              </p>
            </div>
          ) : visibleMine.length === 0 ? (
            <div className="projects-empty">
              <h2>No results</h2>
              <p className="projects-empty-text">
                Try a different search or field.
              </p>
            </div>
          ) : (
            <div className="projects-grid">
              {visibleMine.map((p) => {
                const color = FIELD_COLORS[p.field] || "#64748b";
                const tint = { background: color + "1f", color };
                const open = () =>
                  navigate(p.type === "capstone" ? `/capstone/${p.id}` : `/project/${p.id}`);
                return (
                  <div
                    className="projects-card"
                    key={p.id}
                    role="button"
                    tabIndex={0}
                    onClick={open}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        open();
                      }
                    }}
                    style={{ borderLeft: "5px solid " + color, cursor: "pointer", textAlign: "left" }}
                  >
                    <div className="projects-card-top">
                      <span className="projects-badge">
                        Completed{p.completedAt ? " · " + timeAgo(p.completedAt) : ""}
                      </span>
                      <span className="projects-card-field" style={{ color, fontWeight: 600 }}>
                        {p.field}
                      </span>
                    </div>
                    <h3>{p.title}</h3>
                    <p>
                      {p.roadmap.replace(/\s*\(.*\)$/, "")}
                      {p.roadmap ? " · " : ""}
                      {p.type === "capstone" ? "Certification project" : "Unit project"}
                    </p>
                    <div className="projects-tech" style={{ alignItems: "center" }}>
                      {p.track && <span style={tint}>{p.track}</span>}
                      {p.tech.map((t) => (
                        <span key={t}>{t}</span>
                      ))}
                      {p.repo && (
                        <a
                          href={p.repo}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          style={{ ...tint, padding: "4px 10px", borderRadius: 999, fontSize: 13, fontWeight: 600, textDecoration: "none" }}
                        >
                          On GitHub ↗
                        </a>
                      )}
                      {p.repo && (
                        <button
                          type="button"
                          onClick={(e) => shareRepo(e, p)}
                          style={{ border: "1px solid " + color, background: "transparent", color, padding: "3px 10px", borderRadius: 999, fontSize: 13, fontWeight: 600, cursor: "pointer" }}
                        >
                          {copiedId === p.id ? "Copied" : "Share"}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}

        {tab === "ideas" &&
          (visibleIdeas.length === 0 ? (
            <div className="projects-empty">
              <h2>No results</h2>
              <p className="projects-empty-text">
                Try a different search or field.
              </p>
            </div>
          ) : (
            <div className="projects-grid">
              {visibleIdeas.map((p) => (
                <button className="projects-card" key={p.id}>
                  <div className="projects-card-top">
                    <span className="projects-badge is-level">{p.level}</span>
                    <span className="projects-card-field">{p.field}</span>
                  </div>
                  <h3>{p.title}</h3>
                  <p>{p.text}</p>
                  <div className="projects-tech">
                    {p.tech.map((t) => (
                      <span key={t}>{t}</span>
                    ))}
                  </div>
                </button>
              ))}
            </div>
          ))}

        {tab === "find" && (
          <div className="projects-grid">
            {SITES.map((s) => (
              <a
                className="projects-card projects-site"
                key={s.id}
                href={s.url}
                target="_blank"
                rel="noreferrer"
              >
                <h3>{s.name}</h3>
                <p>{s.text}</p>
                <span className="projects-visit">Visit site</span>
              </a>
            ))}
          </div>
        )}
      </div>
    </Sidebar>
  );
}