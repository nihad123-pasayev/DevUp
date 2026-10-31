import "./LessonsPage.css";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Sidebar from "../Sidebar";
import { getMyRoadmaps, getProgress, roadmapStats } from "../progress.js";

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
              const okStatus = status === "all" || stateOf(l.id) === status;
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
    <div className="lz-layout">
      <Sidebar />
      <main className="lz-main">
        <h1>Lessons</h1>
        <p className="lz-sub">
          Browse every roadmap and pick up where you left off.
        </p>

        <div className="lz-toolbar">
          <label className="lz-search">
            <svg viewBox="0 0 24 24" aria-hidden="true">
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
          <div className="lz-pills">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                className={status === f.id ? "on" : ""}
                onClick={() => setStatus(f.id)}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="lz-tabs">
          {["all", ...fields].map((f) => (
            <button
              key={f}
              type="button"
              className={field === f ? "on" : ""}
              onClick={() => setField(f)}
            >
              {f === "all" ? "All fields" : f}
            </button>
          ))}
        </div>

        {loading && <p className="lz-msg">Loading...</p>}

        {!loading && roadmaps.length === 0 && (
          <div className="lz-empty">
            <h2>No lessons yet</h2>
            <p>Add a roadmap from your dashboard to see its lessons here.</p>
            <Link className="lz-btn" to="/dashboard">
              Go to dashboard
            </Link>
          </div>
        )}

        {!loading && roadmaps.length > 0 && visible.length === 0 && (
          <div className="lz-empty">
            <h2>Nothing found</h2>
            <p>Try a different search or filter.</p>
          </div>
        )}

        {visible.map((r) => {
          const st = roadmapStats(r, progress);
          return (
            <section className="lz-roadmap" key={r.id}>
              <div className="lz-rhead">
                <h2>{r.title}</h2>
                <span>
                  {st.done} / {st.total} lessons
                </span>
              </div>

              <ul className="lz-stages">
                {r.visibleStages.map((s) => {
                  const open = filtering || !!openStages[s.id];
                  const full = r.stages.find((x) => x.id === s.id);
                  const sDone = full.lessons.filter(
                    (l) => progress[l.id] === "completed",
                  ).length;
                  return (
                    <li
                      key={s.id}
                      className={"lz-stage" + (open ? " open" : "")}
                    >
                      <button
                        type="button"
                        className="lz-shead"
                        onClick={() => toggleStage(s.id)}
                      >
                        <svg
                          className="lz-chev"
                          viewBox="0 0 24 24"
                          aria-hidden="true"
                        >
                          <path d="M9 6l6 6-6 6" />
                        </svg>
                        <span className="lz-no">
                          {r.stages.indexOf(full) + 1}
                        </span>
                        <span className="lz-stitle">{s.title || s.name}</span>
                        <span className="lz-scount">
                          {sDone}/{full.lessons.length}
                        </span>
                      </button>
                      <div className="lz-sub-wrap">
                        <ul>
                          {s.lessons.map((l) => {
                            const stt = stateOf(l.id);
                            return (
                              <li key={l.id}>
                                <Link
                                  to={`/lessons/lesson/${l.id}`}
                                  className="lz-lesson"
                                >
                                  <i className={"lz-st " + stt} />
                                  <span className="lz-ltitle">
                                    {l.title || l.name}
                                  </span>
                                  {l.type && (
                                    <em
                                      className={
                                        "lz-tag tag-" +
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
                            );
                          })}
                        </ul>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </main>
    </div>
  );
}

export default LessonsPage;
