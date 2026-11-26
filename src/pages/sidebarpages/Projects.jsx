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
const SECTIONS = ["Practice by field", "Open source contribution", "Challenges and competitions"];

const SECTION_INFO = {
  "Practice by field":
    "Free courses, exercises and labs where you build real projects in your field. Pick the ones that match what you are learning now.",
  "Open source contribution":
    "Open source means the code is public on GitHub and anyone can help improve it. A contribution is a small improvement you send to someone else's project, such as fixing a typo or a bug. It is great practice with Git and teamwork, and it shows on your GitHub profile.",
  "Challenges and competitions":
    "Events and step by step challenges where you build something real, alone or in a team, and show it to others.",
};

const SITES = [
  { id: 1, name: "The Odin Project", url: "https://www.theodinproject.com", field: "Web", section: "Practice by field", tags: ["Free", "Beginner friendly"], text: "Follow a full path (JavaScript or Ruby on Rails) and build portfolio projects along the way." },
  { id: 2, name: "Frontend Mentor", url: "https://www.frontendmentor.io", field: "Web", section: "Practice by field", tags: ["Real designs"], text: "Build pages from real design files and compare your result with the design." },
  { id: 3, name: "freeCodeCamp", url: "https://www.freecodecamp.org", field: "Web", section: "Practice by field", tags: ["Free", "Certificates"], text: "Complete hands-on projects as part of free certification courses." },
  { id: 4, name: "roadmap.sh Projects", url: "https://roadmap.sh/projects", field: "Any", section: "Practice by field", tags: ["By roadmap"], text: "Pick project ideas grouped by roadmap and difficulty." },
  { id: 5, name: "Exercism", url: "https://exercism.org", field: "Any", section: "Practice by field", tags: ["Free", "Free mentoring"], text: "Solve coding exercises in many languages and get automatic feedback and mentor help." },
  { id: 6, name: "PortSwigger Web Security Academy", url: "https://portswigger.net/web-security", field: "Cybersecurity", section: "Practice by field", tags: ["Free", "Hands-on labs"], text: "Learn web security and practice in interactive labs made by the creators of Burp Suite." },
  { id: 7, name: "Kaggle", url: "https://www.kaggle.com", field: "Data", section: "Practice by field", tags: ["Datasets"], text: "Download datasets, analyze them in notebooks and join competitions." },
  { id: 8, name: "Hugging Face Learn", url: "https://huggingface.co/learn", field: "Artificial Intelligence", section: "Practice by field", tags: ["Courses"], text: "Follow AI courses such as LLMs, agents and diffusion using open source tools." },
  { id: 9, name: "first-contributions", url: "https://github.com/firstcontributions/first-contributions", field: "Any", section: "Open source contribution", tags: ["Beginner friendly", "Step by step"], text: "Practice the fork, branch, commit and pull request flow by adding your name to a file." },
  { id: 10, name: "Good First Issue", url: "https://goodfirstissue.dev", field: "Any", section: "Open source contribution", tags: ["Beginner friendly"], text: "Browse easy issues from well known open source projects and pick one by language." },
  { id: 11, name: "Up For Grabs", url: "https://up-for-grabs.net", field: "Any", section: "Open source contribution", tags: ["Beginner friendly"], text: "Find projects that keep tasks ready for new contributors." },
  { id: 12, name: "GitHub", url: "https://github.com", field: "Any", section: "Open source contribution", tags: ["Open source"], text: "Browse open source repositories and find projects to learn from." },
  { id: 13, name: "Devpost", url: "https://devpost.com", field: "Any", section: "Challenges and competitions", tags: ["Hackathons"], text: "Explore hackathon projects for inspiration and teamwork." },
  { id: 14, name: "Cloud Resume Challenge", url: "https://cloudresumechallenge.dev", field: "DevOps & Cloud", section: "Challenges and competitions", tags: ["16 steps"], text: "Build a resume site on the cloud step by step to show real cloud skills." },
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

const LEVELS = ["All levels", "Beginner", "Intermediate", "Advanced"];
const LEVEL_RANK = { Beginner: 0, Intermediate: 1, Advanced: 2 };
const LEVEL_COLORS = { Beginner: "#16a34a", Intermediate: "#d97706", Advanced: "#dc2626" };

// Yan paneldə bir ideyanın tam təsviri
function IdeaPanel({ idea, onClose }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const color = FIELD_COLORS[idea.field] || "#64748b";
  const h = { margin: "24px 0 8px", fontSize: 14, letterSpacing: "0.04em", textTransform: "uppercase", color: "#64748b" };
  const list = { margin: 0, paddingLeft: 20, display: "grid", gap: 8, lineHeight: 1.5 };

  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)", zIndex: 1000, display: "flex", justifyContent: "flex-end" }}
    >
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={idea.title}
        onClick={(e) => e.stopPropagation()}
        style={{ width: "min(560px, 100%)", height: "100%", overflowY: "auto", background: "#fff", color: "#0f172a", padding: "28px 28px 40px", borderLeft: "6px solid " + color, boxShadow: "-10px 0 40px rgba(0,0,0,0.2)" }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ background: (LEVEL_COLORS[idea.level] || "#64748b") + "1f", color: LEVEL_COLORS[idea.level] || "#64748b", padding: "4px 12px", borderRadius: 999, fontSize: 13, fontWeight: 700 }}>
              {idea.level}
            </span>
            <span style={{ color, fontWeight: 700, fontSize: 14 }}>{idea.field}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{ border: "1px solid #cbd5e1", background: "#fff", color: "#0f172a", borderRadius: 10, width: 36, height: 36, fontSize: 18, cursor: "pointer" }}
          >
            ×
          </button>
        </div>

        <h2 style={{ margin: "16px 0 12px", fontSize: 28, lineHeight: 1.2 }}>{idea.title}</h2>
        <p style={{ margin: 0, lineHeight: 1.6, color: "#334155" }}>{idea.summary}</p>

        {idea.features.length > 0 && (
          <>
            <h3 style={h}>What to build</h3>
            <ul style={list}>
              {idea.features.map((f, i) => (
                <li key={i}>{f}</li>
              ))}
            </ul>
          </>
        )}

        {idea.bonus.length > 0 && (
          <>
            <h3 style={h}>Bonus challenges</h3>
            <ul style={list}>
              {idea.bonus.map((f, i) => (
                <li key={i}>{f}</li>
              ))}
            </ul>
          </>
        )}

        <p style={{ margin: "28px 0 0", fontSize: 13, color: "#64748b", lineHeight: 1.5 }}>
          Idea from the open source{" "}
          {idea.source_url ? (
            <a href={idea.source_url} target="_blank" rel="noreferrer" style={{ color: "#2563eb" }}>
              app-ideas collection ↗
            </a>
          ) : (
            "app-ideas collection"
          )}{" "}
          by Florin Pop and contributors (MIT license).
        </p>
      </aside>
    </div>
  );
}

export default function Projects() {
  const [tab, setTab] = useState("mine");
  const [query, setQuery] = useState("");
  const [field, setField] = useState("All fields");
  const [myProjects, setMyProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState(null);
  const [ideas, setIdeas] = useState([]);
  const [ideasLoading, setIdeasLoading] = useState(true);
  const [level, setLevel] = useState("All levels");
  const [selectedIdea, setSelectedIdea] = useState(null);
  const [userFields, setUserFields] = useState([]);
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

  // İstifadəçinin ən çox oxuduğu 2 sahə ("For you" üçün)
  useEffect(() => {
    async function loadFields() {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth?.user) return;
      const { data } = await supabase
        .from("user_progress")
        .select("lessons!inner(stages!inner(roadmaps!inner(field)))")
        .eq("user_id", auth.user.id)
        .limit(300);
      const counts = {};
      (data || []).forEach((r) => {
        const f = r.lessons?.stages?.roadmaps?.field;
        if (f) counts[f] = (counts[f] || 0) + 1;
      });
      setUserFields(
        Object.entries(counts)
          .sort((x, y) => y[1] - x[1])
          .slice(0, 2)
          .map((e) => e[0]),
      );
    }
    loadFields();
  }, []);

  // Ideyalar bazadakı project_ideas cədvəlindən gəlir
  useEffect(() => {
    async function loadIdeas() {
      const { data } = await supabase
        .from("project_ideas")
        .select("id, title, field, level, summary, features, bonus, source_url");
      const rows = (data || []).map((r) => ({ ...r, features: r.features || [], bonus: r.bonus || [] }));
      rows.sort(
        (a, b) => (LEVEL_RANK[a.level] ?? 9) - (LEVEL_RANK[b.level] ?? 9) || a.title.localeCompare(b.title),
      );
      setIdeas(rows);
      setIdeasLoading(false);
    }
    loadIdeas();
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
  const q = query.trim().toLowerCase();
  const visibleSites = SITES.filter(
    (x) =>
      (field === "All fields" || x.field === field || x.field === "Any") &&
      (x.name + " " + x.text).toLowerCase().includes(q),
  );

  const visibleIdeas = ideas.filter((p) => matches(p, "title") && (level === "All levels" || p.level === level));

  return (
    <Sidebar>
      <div className="projects-page">
        <style>{`
          .projects-card.has-accent:hover,
          .projects-card.has-accent:focus-visible {
            border-color: var(--pc) !important;
            box-shadow: 0 10px 28px color-mix(in srgb, var(--pc) 22%, transparent);
            outline: none;
          }
        `}</style>
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
            {tab === "ideas" && (
              <div className="projects-fields" style={{ marginTop: 8 }}>
                {LEVELS.map((l) => (
                  <button
                    key={l}
                    className={"projects-field" + (level === l ? " is-active" : "")}
                    onClick={() => setLevel(l)}
                  >
                    {l}
                  </button>
                ))}
              </div>
            )}
        </div>

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
                    className="projects-card has-accent"
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
                    style={{ "--pc": color, borderLeft: "5px solid " + color, cursor: "pointer", textAlign: "left" }}
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
          (ideasLoading ? (
            <div className="projects-empty">
              <p className="projects-empty-text">Loading...</p>
            </div>
          ) : visibleIdeas.length === 0 ? (
            <div className="projects-empty">
              <h2>No results</h2>
              <p className="projects-empty-text">
                Try a different search, field or level.
              </p>
            </div>
          ) : (
            <div className="projects-grid">
              {visibleIdeas.map((p) => {
                const color = FIELD_COLORS[p.field] || "#64748b";
                const lc = LEVEL_COLORS[p.level] || "#64748b";
                return (
                  <button
                    className="projects-card has-accent"
                    key={p.id}
                    onClick={() => setSelectedIdea(p)}
                    style={{ "--pc": color, borderLeft: "5px solid " + color, cursor: "pointer", textAlign: "left" }}
                  >
                    <div className="projects-card-top">
                      <span className="projects-badge" style={{ background: lc + "1f", color: lc }}>
                        {p.level}
                      </span>
                      <span className="projects-card-field" style={{ color, fontWeight: 600 }}>
                        {p.field}
                      </span>
                    </div>
                    <h3>{p.title}</h3>
                    <p
                      style={{ display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}
                    >
                      {p.summary}
                    </p>
                    <div className="projects-tech">
                      {p.features.length > 0 && <span>{p.features.length} things to build</span>}
                      {p.bonus.length > 0 && <span>{p.bonus.length} bonus</span>}
                    </div>
                  </button>
                );
              })}
            </div>
          ))}

        {selectedIdea && <IdeaPanel idea={selectedIdea} onClose={() => setSelectedIdea(null)} />}

        {tab === "find" &&
          (visibleSites.length === 0 ? (
            <div className="projects-empty">
              <h2>No results</h2>
              <p className="projects-empty-text">Try a different search or field.</p>
            </div>
          ) : (
            <>
              {SECTIONS.map((sec) => {
                const items = visibleSites
                  .filter((x) => x.section === sec)
                  .sort((x, y) => Number(userFields.includes(y.field)) - Number(userFields.includes(x.field)));
                if (!items.length) return null;
                return (
                  <section key={sec} style={{ marginBottom: 36 }}>
                    <h2 style={{ fontSize: 22, margin: "8px 0 6px" }}>{sec}</h2>
                    <p style={{ margin: "0 0 16px", maxWidth: 760, lineHeight: 1.55, color: "#475569" }}>
                      {SECTION_INFO[sec]}
                    </p>

                    {sec === "Open source contribution" && field === "All fields" && !q && (
                      <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 16, padding: "18px 22px", marginBottom: 18, color: "#0f172a" }}>
                        <strong style={{ fontSize: 16 }}>Start here: your first open source contribution</strong>
                        <p style={{ margin: "6px 0 0", lineHeight: 1.5 }}>
                          New to this? Follow these three steps. You will learn how developers work together on real projects.
                        </p>
                        <ol style={{ margin: "10px 0 0", paddingLeft: 20, display: "grid", gap: 10, lineHeight: 1.5 }}>
                          <li>
                            <strong>Practice the flow.</strong> On{" "}
                            <a href="https://github.com/firstcontributions/first-contributions" target="_blank" rel="noreferrer">
                              first-contributions
                            </a>{" "}
                            you make your own copy of a project (a fork), change one file and send your change back (a pull request). It is a
                            safe practice project, so you cannot break anything.
                          </li>
                          <li>
                            <strong>Find an easy task.</strong>{" "}
                            <a href="https://goodfirstissue.dev" target="_blank" rel="noreferrer">
                              Good First Issue
                            </a>{" "}
                            lists beginner friendly tasks from real projects. Choose a programming language you know.
                          </li>
                          <li>
                            <strong>Fix it and send a pull request.</strong> A pull request is a message to the project owner that says
                            "please add my change". If they accept it, your code becomes part of the project.
                          </li>
                        </ol>
                      </div>
                    )}

                    <div className="projects-grid">
                      {items.map((x) => {
                        const color = FIELD_COLORS[x.field] || "#64748b";
                        const forYou = userFields.includes(x.field);
                        return (
                          <a
                            className="projects-card projects-site has-accent"
                            key={x.id}
                            href={x.url}
                            target="_blank"
                            rel="noreferrer"
                            style={{ "--pc": color, borderLeft: "5px solid " + color }}
                          >
                            <div className="projects-card-top">
                              <span className="projects-card-field" style={{ color, fontWeight: 600 }}>
                                {x.field === "Any" ? "Any field" : x.field}
                              </span>
                              {forYou && (
                                <span className="projects-badge" style={{ background: color + "1f", color }}>
                                  For you
                                </span>
                              )}
                            </div>
                            <h3>{x.name}</h3>
                            <p>{x.text}</p>
                            <div className="projects-tech">
                              {x.tags.map((t) => (
                                <span key={t}>{t}</span>
                              ))}
                            </div>
                            <span className="projects-visit">Visit site</span>
                          </a>
                        );
                      })}
                    </div>
                  </section>
                );
              })}
            </>
          ))}
      </div>
    </Sidebar>
  );
}