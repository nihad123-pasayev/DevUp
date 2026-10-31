import "./Lessons.css";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Sidebar from "../Sidebar";
import { getMyRoadmaps, getProgress, roadmapStats } from "../../progress.js";

const STATUS_FILTERS = [
  { id: "all", label: "All" },
  { id: "not_started", label: "Not started" },
  { id: "in_progress", label: "In progress" },
  { id: "completed", label: "Completed" },
];

function LessonsPage() {
  const [roadmaps, setRoadmaps] = useState([]);
  const [progress, setProgress] = useState({});
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [field, setField] = useState("all");
  const [openStages, setOpenStages] = useState({});

  useEffect(() => {
    Promise.all([getMyRoadmaps(), getProgress()]).then(([r, p]) => {
      setRoadmaps(r);
      setProgress(p);
      setLoading(false);
    });
  }, []);

  const stateOf = (id) => progress[id] || "not_started";
  const fields = [...new Set(roadmaps.map((r) => r.field))];
  const filtering = q.trim() !== "" || status !== "all";

  const visible = useMemo(() => {
    const term = q.trim().toLowerCase();
    return roadmaps
      .filter((r) => field === "all" || r.field === field)
      .map((r) => {
        const roadmapMatch =
          term && (r.title || "").toLowerCase().includes(term);
        const stages = r.stages
          .map((s) => ({
            ...s,
            lessons: s.lessons.filter((l) => {
              const okStatus =
                status === "all" ||
                (progress[l.id] || "not_started") === status;
              const okText =
                !term ||
                roadmapMatch ||
                (l.title || l.name || "").toLowerCase().includes(term);
              return okStatus && okText;
            }),
          }))
          .filter((s) => s.lessons.length > 0);
        return { ...r, visibleStages: stages };
      })
      .filter((r) => r.visibleStages.length > 0);
  }, [roadmaps, progress, q, status, field]);

  const toggleStage = (id) =>
    setOpenStages((prev) => ({ ...prev, [id]: !prev[id] }));

  return (
    <div className="lessons-layout">
      <Sidebar />
      <main className="lessons-page">
        <div className="lessons-header">
          <h1>Lessons</h1>
          <p>Browse every roadmap and pick up where you left off.</p>
        </div>

        <div className="lessons-toolbar">
          <label className="lessons-search">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.5-3.5" />
            </svg>
            <input
              type="text"
              placeholder="Search lessons or roadmaps"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </label>
          <div className="lessons-statuses">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                className={
                  "lessons-pill" + (status === f.id ? " is-active" : "")
                }
                onClick={() => setStatus(f.id)}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="lessons-tabs">
          {["all", ...fields].map((f) => (
            <button
              key={f}
              type="button"
              className={"lessons-tab" + (field === f ? " is-active" : "")}
              onClick={() => setField(f)}
            >
              {f === "all" ? "All fields" : f}
            </button>
          ))}
        </div>

        {loading && <p className="lessons-empty-text">Loading...</p>}

        {!loading && roadmaps.length === 0 && (
          <div className="lessons-empty">
            <h2>No lessons yet</h2>
            <p className="lessons-empty-text">
              Add a roadmap from your dashboard to see its lessons here.
            </p>
            <Link className="lessons-card-btn" to="/dashboard">
              Go to dashboard
            </Link>
          </div>
        )}

        {!loading && roadmaps.length > 0 && visible.length === 0 && (
          <div className="lessons-empty">
            <h2>Nothing found</h2>
            <p className="lessons-empty-text">
              Try a different search or filter.
            </p>
          </div>
        )}

        {visible.length > 0 && (
          <div className="lessons-grid">
            {visible.map((r) => {
              const st = roadmapStats(r, progress);
              return (
                <section className="lessons-card lessons-card--wide" key={r.id}>
                  <div className="lessons-card-head">
                    <div>
                      <span className="lessons-card-field">{r.field}</span>
                      <h3>{r.title}</h3>
                    </div>
                    <p>
                      {st.done} / {st.total} lessons
                    </p>
                  </div>

                  <ul className="lessons-stages">
                    {r.visibleStages.map((s) => {
                      const open = filtering || !!openStages[s.id];
                      const full = r.stages.find((x) => x.id === s.id);
                      const sDone = full.lessons.filter(
                        (l) => progress[l.id] === "completed",
                      ).length;
                      return (
                        <li
                          key={s.id}
                          className={"lessons-stage" + (open ? " is-open" : "")}
                        >
                          <button
                            type="button"
                            className="lessons-stage-head"
                            onClick={() => toggleStage(s.id)}
                          >
                            <svg
                              className="lessons-chev"
                              viewBox="0 0 24 24"
                              aria-hidden="true"
                            >
                              <path d="M9 6l6 6-6 6" />
                            </svg>
                            <span className="lessons-stage-no">
                              {r.stages.indexOf(full) + 1}
                            </span>
                            <span className="lessons-stage-title">
                              {s.title || s.name}
                            </span>
                            <span className="lessons-stage-count">
                              {sDone}/{full.lessons.length}
                            </span>
                          </button>
                          <div className="lessons-stage-body">
                            <ul>
                              {s.lessons.map((l) => (
                                <li key={l.id}>
                                  <Link
                                    to={`/lessons/lesson/${l.id}`}
                                    className="lessons-item"
                                  >
                                    <i
                                      className={"lessons-dot " + stateOf(l.id)}
                                    />
                                    <span className="lessons-item-title">
                                      {l.title || l.name}
                                    </span>
                                    {l.type && (
                                      <em
                                        className={
                                          "lessons-tag tag-" +
                                          String(l.type)
                                            .toLowerCase()
                                            .replace(/\s+/g, "-")
                                        }
                                      >
                                        {l.type}
                                      </em>
                                    )}
                                  </Link>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

export default LessonsPage;
