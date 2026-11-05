import "./Lessons.css";
import { useEffect, useMemo, useRef, useState } from "react";
import Sidebar from "../Sidebar";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  getMyRoadmaps,
  getProgress,
  roadmapStats,
  lessonKind,
  unlockedStageIds,
  LOCK_MESSAGE,
} from "../../progress.js";

const STATUS_FILTERS = [
  { id: "all", label: "All" },
  { id: "not_started", label: "Not started" },
  { id: "in_progress", label: "In progress" },
  { id: "completed", label: "Completed" },
];
const PARTS = [
  { id: "theory", label: null, tag: "Theory" }, // label = mövzunun adı
  { id: "quiz", label: "Repeat lesson", tag: "Quiz" },
  { id: "lab", label: "Practice your learnings", tag: "Lab" },
];

const TAB_ICONS = {
  all: <path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z" />,
  Web: <path d="M8 7l-5 5 5 5M16 7l5 5-5 5" />,
  Backend: (
    <>
      <rect x="3" y="4" width="18" height="6" rx="1.5" />
      <rect x="3" y="14" width="18" height="6" rx="1.5" />
      <path d="M7 7h.01M7 17h.01" />
    </>
  ),
  Mobile: (
    <>
      <rect x="7" y="2" width="10" height="20" rx="2" />
      <path d="M11 18h2" />
    </>
  ),
  Cybersecurity: <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" />,
  Data: (
    <>
      <ellipse cx="12" cy="5" rx="8" ry="3" />
      <path d="M4 5v6c0 1.66 3.58 3 8 3s8-1.34 8-3V5" />
      <path d="M4 11v6c0 1.66 3.58 3 8 3s8-1.34 8-3v-6" />
    </>
  ),
  "Artificial Intelligence": (
    <>
      <rect x="7" y="7" width="10" height="10" rx="2" />
      <path d="M9 3v4M15 3v4M9 17v4M15 17v4M3 9h4M3 15h4M17 9h4M17 15h4" />
    </>
  ),
  "DevOps & Cloud": (
    <path d="M7 18a4 4 0 010-8 5 5 0 019.5-1A4.5 4.5 0 0117 18z" />
  ),
};

const RING = 163.36; // 2 * PI * 26

const lessonState = (progress, currentIds, id) =>
  progress[id] === "completed"
    ? "completed"
    : currentIds.has(id)
      ? "in_progress"
      : "not_started";
function LockIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
}
function spot(e) {
  const el = e.currentTarget;
  const r = el.getBoundingClientRect();
  el.style.setProperty("--mx", e.clientX - r.left + "px");
  el.style.setProperty("--my", e.clientY - r.top + "px");
}

function LessonsPage() {
  const [roadmaps, setRoadmaps] = useState([]);
  const [progress, setProgress] = useState({});
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [field, setField] = useState("all");
  const [openStages, setOpenStages] = useState({});
  const tabsRef = useRef(null);
  const indRef = useRef(null);
  const [openLesson, setOpenLesson] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();
  const [toast, setToast] = useState(
    location.state?.locked ? LOCK_MESSAGE : "",
  );
  const showLock = () => setToast(LOCK_MESSAGE);

  // dərs səhifəsindən qıfıla görə qayıdanda bildirişi göstər, yenilənəndə təkrarlanmasın
  useEffect(() => {
    if (location.state?.locked) {
      navigate(location.pathname, { replace: true, state: null });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    Promise.all([getMyRoadmaps(), getProgress()]).then(([r, p]) => {
      setRoadmaps(r);
      setProgress(p);
      setLoading(false);
    });
  }, []);

  // hər roadmap-da ilk tamamlanmamış dərs və onun mərhələsi = "cari"
  const current = useMemo(() => {
    const lessons = new Set();
    const stages = new Set();
    roadmaps.forEach((r) => {
      for (const s of r.stages) {
        const l = s.lessons.find((x) => progress[x.id] !== "completed");
        if (l) {
          lessons.add(l.id);
          stages.add(s.id);
          break;
        }
      }
    });
    return { lessons, stages };
  }, [roadmaps, progress]);

  const stateOf = (id) => lessonState(progress, current.lessons, id);

  const fields = [...new Set(roadmaps.map((r) => r.field))];
  const fieldsKey = fields.join("|");
  const filtering = q.trim() !== "" || status !== "all";

  // sürüşən alt xətt
  useEffect(() => {
    const wrap = tabsRef.current;
    const ind = indRef.current;
    if (!wrap || !ind) return;
    const place = () => {
      const on = wrap.querySelector(".lessons-tab.is-active");
      if (!on) return;
      ind.style.width = on.offsetWidth + "px";
      ind.style.transform = `translateX(${on.offsetLeft}px)`;
    };
    place();
    const ro = new ResizeObserver(place);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [field, fieldsKey, loading]);

  // filtr düymələrindəki say
  const counts = { all: 0, not_started: 0, in_progress: 0, completed: 0 };
  roadmaps
    .filter((r) => field === "all" || r.field === field)
    .forEach((r) =>
      r.stages.forEach((s) =>
        s.lessons.forEach((l) => {
          counts.all++;
          counts[stateOf(l.id)]++;
        }),
      ),
    );

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
                lessonState(progress, current.lessons, l.id) === status;
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
  }, [roadmaps, progress, current, q, status, field]);

  const toggleStage = (id, isOpen) =>
    setOpenStages((prev) => ({ ...prev, [id]: !isOpen }));

  return (
    <Sidebar>
      <main className="lessons-page">
        <div className="lessons-header">
          <h1>Lessons</h1>
          <p>Browse every roadmap and pick up where you left off.</p>
        </div>

        <div className="lessons-sticky">
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
                  <span className="lessons-pill-count">{counts[f.id]}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="lessons-tabs" ref={tabsRef}>
            {["all", ...fields].map((f) => (
              <button
                key={f}
                type="button"
                className={"lessons-tab" + (field === f ? " is-active" : "")}
                onClick={() => setField(f)}
              >
                <svg
                  className="lessons-tab-ic"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  {TAB_ICONS[f] || TAB_ICONS.all}
                </svg>
                {f === "all" ? "All fields" : f}
              </button>
            ))}
            <span className="lessons-tab-ind" ref={indRef} />
          </div>
        </div>

        {loading && (
          <article className="lessons-roadmap lessons-skel" aria-hidden="true">
            <div className="skel-hero" />
            {Array.from({ length: 6 }).map((_, i) => (
              <div className="skel-row" key={i} />
            ))}
          </article>
        )}

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

        {visible.map((r) => {
          const st = roadmapStats(r, progress);
          const unlocked = unlockedStageIds(r, progress);
          return (
            <article className="lessons-roadmap" key={r.id}>
              <header className="lessons-hero" onMouseMove={spot}>
                <div className="lessons-hero-text">
                  <span className="lessons-card-field">{r.field}</span>
                  <h3>{r.title}</h3>
                  <div className="lessons-hero-meta">
                    <span>
                      {st.done} / {st.total} lessons
                    </span>
                    <span>{r.stages.length} stages</span>
                  </div>
                </div>
                <div
                  className="lessons-ring"
                  role="img"
                  aria-label={`${st.percent}% complete`}
                >
                  <svg viewBox="0 0 64 64" aria-hidden="true">
                    <circle className="ring-bg" cx="32" cy="32" r="26" />
                    <circle
                      className="ring-fg"
                      cx="32"
                      cy="32"
                      r="26"
                      style={{
                        strokeDashoffset: RING * (1 - st.percent / 100),
                      }}
                    />
                  </svg>
                  <b>{st.percent}%</b>
                </div>
              </header>

              <ul
                className={
                  "lessons-stages" + (filtering ? " is-filtering" : "")
                }
              >
                {r.visibleStages.map((s) => {
                  const full = r.stages.find((x) => x.id === s.id);
                  const no = r.stages.indexOf(full);
                  const total = full.lessons.length;
                  const sDone = full.lessons.filter(
                    (l) => progress[l.id] === "completed",
                  ).length;
                  const isDone = total > 0 && sDone === total;
                  const isCurrent = current.stages.has(s.id);
                  const prev = r.stages[no - 1];
                  const prevDone =
                    !!prev &&
                    prev.lessons.length > 0 &&
                    prev.lessons.every((l) => progress[l.id] === "completed");
                  const open = filtering || (openStages[s.id] ?? isCurrent);
                  const locked = !unlocked.has(s.id);

                  const cls =
                    "lessons-stage" +
                    (open ? " is-open" : "") +
                    (isDone ? " is-done" : "") +
                    (isCurrent ? " is-current" : "") +
                    (prevDone ? " prev-done" : "") +
                    (no === 0 ? " is-first" : "") +
                    (locked ? " is-locked" : "") +
                    (no === r.stages.length - 1 ? " is-last" : "");

                  return (
                    <li key={s.id} className={cls}>
                      <button
                        type="button"
                        className="lessons-stage-head"
                        aria-expanded={open}
                        onClick={() => toggleStage(s.id, open)}
                        onMouseMove={spot}
                      >
                        <svg
                          className="lessons-chev"
                          viewBox="0 0 24 24"
                          aria-hidden="true"
                        >
                          <path d="M9 6l6 6-6 6" />
                        </svg>
                        <span className="lessons-stage-no">
                          {isDone ? (
                            <svg viewBox="0 0 24 24" aria-hidden="true">
                              <path d="M5 12l5 5 9-10" />
                            </svg>
                          ) : locked ? (
                            <LockIcon />
                          ) : (
                            no + 1
                          )}
                        </span>
                        <span className="lessons-stage-title">
                          {s.title || s.name}
                        </span>
                        {isCurrent && (
                          <span className="lessons-current">Current</span>
                        )}
                        <span
                          className="lessons-stage-meter"
                          aria-hidden="true"
                        >
                          <i
                            style={{
                              width: `${total ? (sDone / total) * 100 : 0}%`,
                            }}
                          />
                        </span>
                        <span className="lessons-stage-count">
                          {sDone}/{total}
                        </span>
                      </button>

                      <div className="lessons-stage-body">
                        <ul>
                          {s.lessons.map((l, li) => {
                            const stt = stateOf(l.id);
                            const title = l.title || l.name;
                            const isLesson = lessonKind(l) === "lesson";
                            const isOpen = !locked && openLesson === l.id;
                            const cls =
                              "lessons-item" +
                              (stt === "completed" ? " is-completed" : "") +
                              (stt === "in_progress" ? " is-current" : "") +
                              (locked ? " is-locked" : "") +
                              (isOpen ? " is-open" : "");

                            const pill = stt === "in_progress" && (
                              <span className="lessons-start">
                                {st.done > 0 ? "Continue" : "Start"}
                              </span>
                            );

                            // Quiz / layihə / imtahan sətirləri: əvvəlki kimi birbaşa keçid
                            if (!isLesson) {
                              const inner = (
                                <>
                                  <i className={"lessons-dot " + stt} />
                                  <span className="lessons-item-title">
                                    {title}
                                  </span>
                                  {l.kind && (
                                    <em
                                      className={
                                        "lessons-tag tag-" + lessonKind(l)
                                      }
                                    >
                                      {String(l.kind).replace(/_/g, " ")}
                                    </em>
                                  )}
                                  {pill}
                                  {locked ? (
                                    <LockIcon className="lessons-drop" />
                                  ) : (
                                    <svg
                                      className="lessons-drop"
                                      viewBox="0 0 24 24"
                                      aria-hidden="true"
                                    >
                                      <path d="M9 6l6 6-6 6" />
                                    </svg>
                                  )}
                                </>
                              );
                              return (
                                <li
                                  key={l.id}
                                  style={{ "--i": Math.min(li, 14) }}
                                >
                                  {locked ? (
                                    <button
                                      type="button"
                                      className={cls}
                                      aria-disabled="true"
                                      onClick={() =>
                                        locked
                                          ? showLock()
                                          : setOpenLesson(isOpen ? null : l.id)
                                      }
                                    >
                                      {inner}
                                    </button>
                                  ) : (
                                    <Link
                                      to={`/lessons/lesson/${l.id}`}
                                      className={cls}
                                    >
                                      {inner}
                                    </Link>
                                  )}
                                </li>
                              );
                            }

                            // Adi dərs: klikləyəndə 3 hissə açılır
                            return (
                              <li
                                key={l.id}
                                style={{ "--i": Math.min(li, 14) }}
                              >
                                <button
                                  type="button"
                                  className={cls}
                                  aria-expanded={isOpen}
                                  onClick={() =>
                                    setOpenLesson(isOpen ? null : l.id)
                                  }
                                >
                                  <i className={"lessons-dot " + stt} />
                                  <span className="lessons-item-title">
                                    {title}
                                  </span>
                                  {pill}
                                  <svg
                                    className="lessons-drop"
                                    viewBox="0 0 24 24"
                                    aria-hidden="true"
                                  >
                                    <path d="M9 6l6 6-6 6" />
                                  </svg>
                                </button>

                                <div
                                  className={
                                    "lessons-parts" + (isOpen ? " is-open" : "")
                                  }
                                >
                                  <div>
                                    {PARTS.map((p) => (
                                      <Link
                                        key={p.id}
                                        to={`/lessons/lesson/${l.id}/${p.id}`}
                                        className="lessons-part"
                                        tabIndex={isOpen ? 0 : -1}
                                      >
                                        <span>{p.label || title}</span>
                                        <em className="lessons-part-tag">
                                          {p.tag}
                                        </em>
                                      </Link>
                                    ))}
                                  </div>
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </article>
          );
        })}
        {toast && (
          <div className="lessons-toast" role="status">
            {toast}
          </div>
        )}
      </main>
    </Sidebar>
  );
}

export default LessonsPage;
