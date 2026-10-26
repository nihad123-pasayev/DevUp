import { useEffect, useState } from "react";
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
    field: "Frontend",
    level: "Beginner",
    tech: ["HTML", "CSS", "JavaScript"],
    text: "Add, complete and delete tasks, saved in the browser.",
  },
  {
    id: 2,
    title: "Weather App",
    field: "Frontend",
    level: "Beginner",
    tech: ["JavaScript", "API"],
    text: "Search a city and show its current weather from a public API.",
  },
  {
    id: 3,
    title: "Personal Portfolio",
    field: "Frontend",
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

export default function Projects() {
  const [tab, setTab] = useState("mine");
  const [query, setQuery] = useState("");
  const [field, setField] = useState("All fields");
  const [myProjects, setMyProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProjects() {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;
      if (!user) {
        setLoading(false);
        return;
      }
      const { data, error } = await supabase
        .from("projects")
        .select("id, title, description, field, status, tech")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (!error && data) setMyProjects(data);
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
          {tab === "mine" && (
            <button className="projects-add-btn">+ Add project</button>
          )}
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
                Projects you build will appear here.
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
              {visibleMine.map((p) => (
                <button className="projects-card" key={p.id}>
                  <div className="projects-card-top">
                    <span className="projects-badge">{p.status}</span>
                    <span className="projects-card-field">{p.field}</span>
                  </div>
                  <h3>{p.title}</h3>
                  <p>{p.description}</p>
                  <div className="projects-tech">
                    {(p.tech || []).map((t) => (
                      <span key={t}>{t}</span>
                    ))}
                  </div>
                </button>
              ))}
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
