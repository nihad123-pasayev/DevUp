import { useEffect, useState } from "react";
import Sidebar from "../Sidebar";
import { supabase } from "/src/supabaseclient.js";
import "./Lessons.css";

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
const STATUSES = ["All", "Not started", "In progress", "Completed"];

export default function Lessons() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [field, setField] = useState("All fields");
  const [status, setStatus] = useState("All");

  useEffect(() => {
    async function loadCourses() {
      const { data, error } = await supabase
        .from("courses")
        .select("id, title, field, level, lesson_count")
        .order("created_at", { ascending: true });
      if (!error && data) setCourses(data);
      setLoading(false);
    }
    loadCourses();
  }, []);

  const visible = courses.filter((c) => {
    const matchesQuery = c.title
      .toLowerCase()
      .includes(query.trim().toLowerCase());
    const matchesField = field === "All fields" || c.field === field;
    // status filter user_progress cədvəli əlavə olunanda işləyəcək
    return matchesQuery && matchesField;
  });

  return (
    <Sidebar>
      <div className="lessons-page">
        <header className="lessons-header">
          <h1>Lessons</h1>
          <p>Browse every roadmap and pick up where you left off.</p>
        </header>

        <div className="lessons-toolbar">
          <div className="lessons-search">
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
              aria-label="Search lessons"
              placeholder="Search lessons or roadmaps"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="lessons-statuses">
            {STATUSES.map((s) => (
              <button
                key={s}
                className={"lessons-pill" + (status === s ? " is-active" : "")}
                onClick={() => setStatus(s)}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="lessons-tabs">
          {FIELDS.map((f) => (
            <button
              key={f}
              className={"lessons-tab" + (field === f ? " is-active" : "")}
              onClick={() => setField(f)}
            >
              {f}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="lessons-empty">
            <p className="lessons-empty-text">Loading...</p>
          </div>
        ) : courses.length === 0 ? (
          <div className="lessons-empty">
            <h2>No lessons yet</h2>
            <p className="lessons-empty-text">
              Roadmaps and lessons will appear here soon.
            </p>
          </div>
        ) : visible.length === 0 ? (
          <div className="lessons-empty">
            <h2>No results</h2>
            <p className="lessons-empty-text">
              Try a different search or field.
            </p>
          </div>
        ) : (
          <div className="lessons-grid">
            {visible.map((c) => (
              <div className="lessons-card" key={c.id}>
                <span className="lessons-card-field">{c.field}</span>
                <h3>{c.title}</h3>
                <p>
                  {c.lesson_count} lessons · {c.level}
                </p>
                <button className="lessons-card-btn">Add roadmap</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </Sidebar>
  );
}
