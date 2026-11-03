import "./LessonPage.css";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "../supabaseclient.js";
import { lessonKind } from "../progress.js";

const PARTS = [
  { id: "theory", label: "Theory" },
  { id: "quiz", label: "Quiz" },
  { id: "lab", label: "Lab" },
];

const KIND_INFO = {
  quiz: { label: "Quiz", text: "Quiz questions will appear here." },
  project: { label: "Project", text: "Project instructions and submission will appear here." },
  exam: { label: "Exam", text: "The exam will appear here." },
  lab: { label: "Lab", text: "Lab instructions will appear here." },
};

const nameOf = (row) => row?.title || row?.name || "Untitled";
const orderOf = (row) => row?.position ?? row?.sort_order ?? row?.order_index ?? 0;
const lessonPath = (row) => `/lessons/lesson/${row.id}`;
const isMobile = () => window.innerWidth < 900;

function Arrow({ dir = "right" }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {dir === "left" ? (
        <>
          <path d="M19 12H5" />
          <path d="M11 6l-6 6 6 6" />
        </>
      ) : (
        <>
          <path d="M5 12h14" />
          <path d="M13 6l6 6-6 6" />
        </>
      )}
    </svg>
  );
}

function PanelIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M9 4v16" />
    </svg>
  );
}

function Check() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12l5 5 9-10" />
    </svg>
  );
}

function Lock() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

export default function LessonPage() {
  const { id, part = "theory" } = useParams();
  const [res, setRes] = useState({ id: null, lesson: null, stage: null, siblings: [] });
  const [open, setOpen] = useState(() => {
    if (isMobile()) return false;
    try {
      return localStorage.getItem("lp-panel") !== "0";
    } catch {
      return true;
    }
  });

  useEffect(() => {
    let off = false;
    async function load() {
      const { data: lesson, error } = await supabase
        .from("lessons")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) console.error("lesson error:", error.code, error.message);

      let stage = null;
      let siblings = [];
      if (lesson?.stage_id) {
        const [s, l] = await Promise.all([
          supabase.from("stages").select("*").eq("id", lesson.stage_id).maybeSingle(),
          supabase.from("lessons").select("*").eq("stage_id", lesson.stage_id),
        ]);
        if (s.error) console.error("stage error:", s.error.code, s.error.message);
        if (l.error) console.error("siblings error:", l.error.code, l.error.message);
        stage = s.data;
        siblings = (l.data || []).slice().sort((a, b) => orderOf(a) - orderOf(b));
      }
      if (!off) setRes({ id, lesson, stage, siblings });
    }
    load();
    return () => {
      off = true;
    };
  }, [id]);

  function togglePanel() {
    const next = !open;
    setOpen(next);
    if (!isMobile()) {
      try {
        localStorage.setItem("lp-panel", next ? "1" : "0");
      } catch {
        /* ignore */
      }
    }
  }

  function closeOnMobile() {
    if (isMobile()) setOpen(false);
  }

  const loading = res.id !== id;
  const lesson = loading ? null : res.lesson;
  const missing = !loading && !lesson;
  const list = res.siblings;
  const stageName = res.stage ? nameOf(res.stage) : "";

  const kind = lesson ? lessonKind(lesson) : "lesson";
  const direct = kind !== "lesson";
  const current = direct ? kind : PARTS.some((p) => p.id === part) ? part : "theory";
  const partIdx = PARTS.findIndex((p) => p.id === current);
  const info = KIND_INFO[current];
  const title = loading ? "Loading..." : lesson ? nameOf(lesson) : "Lesson not found";

  const idx = list.findIndex((l) => String(l.id) === String(id));
  const prev = idx > 0 ? list[idx - 1] : null;
  const next = idx >= 0 && idx < list.length - 1 ? list[idx + 1] : null;

  const done = new Set();

  let prevLink = null;
  let nextLink = { to: "/lessons", label: "Finish unit" };

  if (!direct && partIdx > 0) {
    prevLink = {
      to: `/lessons/lesson/${id}/${PARTS[partIdx - 1].id}`,
      label: `Previous: ${PARTS[partIdx - 1].label}`,
    };
  } else if (prev) {
    prevLink = { to: lessonPath(prev), label: "Previous lesson" };
  }

  if (!direct && partIdx < PARTS.length - 1) {
    nextLink = {
      to: `/lessons/lesson/${id}/${PARTS[partIdx + 1].id}`,
      label: `Continue to ${PARTS[partIdx + 1].label}`,
    };
  } else if (next) {
    nextLink = { to: lessonPath(next), label: "Next lesson" };
  }

  return (
    <div className="lp-shell">
      <header className="lp-top">
        <button
          type="button"
          className="lp-toggle"
          onClick={togglePanel}
          aria-expanded={open}
          aria-label={open ? "Hide course contents" : "Show course contents"}
        >
          <PanelIcon />
        </button>
        <Link className="lp-back" to="/lessons">
          <Arrow dir="left" />
          Lessons
        </Link>
        {stageName && <span className="lp-crumb">{stageName}</span>}
      </header>

      <div className="lp-body">
        {open && <div className="lp-backdrop" onClick={() => setOpen(false)} />}

        {open && (
          <aside className="lpc" aria-label="Course contents">
            <div className="lpc-head">
              <span className="lpc-eyebrow">Unit</span>
              <h2 className="lpc-title">{stageName || "Contents"}</h2>
            </div>

            <ol className="lpc-list">
              {list.map((item, i) => {
                const itemKind = lessonKind(item);
                const isCurrent = String(item.id) === String(id);
                const isDone = done.has(item.id);
                return (
                  <li key={item.id}>
                    <Link
                      to={lessonPath(item)}
                      onClick={closeOnMobile}
                      className={"lpc-item" + (isCurrent ? " is-current" : "")}
                      aria-current={isCurrent ? "page" : undefined}
                    >
                      <span className={"lpc-mark" + (isDone ? " is-done" : "")}>
                        {isDone && <Check />}
                      </span>
                      <span className="lpc-name">
                        {i + 1}. {nameOf(item)}
                      </span>
                      {itemKind !== "lesson" && (
                        <span className="lpc-tag">{KIND_INFO[itemKind]?.label || itemKind}</span>
                      )}
                    </Link>

                    {isCurrent && itemKind === "lesson" && (
                      <ul className="lpc-parts">
                        {PARTS.map((p) => (
                          <li key={p.id}>
                            <Link
                              to={`/lessons/lesson/${item.id}/${p.id}`}
                              onClick={closeOnMobile}
                              className={"lpc-part" + (current === p.id ? " is-current" : "")}
                            >
                              {p.label}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ol>

            <div className="lpc-next">
              <Lock />
              <span>Next unit opens after you finish this one.</span>
            </div>
          </aside>
        )}

        <main className="lp-main">
          <div className="lp-page">
            <div className="lp-head">
              <div className="lp-meta">
                <span className="lp-kind">{info ? info.label : "Theory"}</span>
                {stageName && idx >= 0 && (
                  <span className="lp-count">
                    {stageName} · {idx + 1} of {list.length}
                  </span>
                )}
              </div>
              <h1>{title}</h1>
            </div>

            {missing && (
              <article className="lp-card lp-soon">
                <h2>Lesson not found</h2>
                <p>This lesson does not exist or is not available.</p>
              </article>
            )}

            {!loading && !missing && current === "theory" && (
              <>
                <div className="lp-video">
                  <span>Video will be added here</span>
                </div>
                <article className="lp-card">
                  <h2>{title}</h2>
                  <p>Lesson text will be added here.</p>
                </article>
              </>
            )}

            {!loading && !missing && current !== "theory" && info && (
              <article className="lp-card lp-soon">
                <h2>{info.label}</h2>
                <p>{info.text}</p>
              </article>
            )}

            {!loading && !missing && (
              <div className="lp-foot">
                {prevLink ? (
                  <Link className="lp-btn" to={prevLink.to}>
                    <Arrow dir="left" />
                    {prevLink.label}
                  </Link>
                ) : (
                  <span />
                )}
                {!direct && partIdx >= 0 && (
                  <span className="lp-step">
                    Part {partIdx + 1} of {PARTS.length} · {PARTS[partIdx]?.label}
                  </span>
                )}
                {nextLink && (
                  <Link className="lp-btn is-primary" to={nextLink.to}>
                    {nextLink.label}
                    <Arrow />
                  </Link>
                )}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}