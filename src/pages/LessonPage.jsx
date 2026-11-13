import "./LessonPage.css";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { supabase } from "../supabaseclient.js";
import {
  getMyRoadmaps,
  getFullProgress,
  lessonKind,
  unlockedStageIds,
} from "../progress.js";
import LessonContent from "./LessonContent.jsx";
import LessonQuiz from "./LessonQuiz.jsx";
import LessonLab from "./LessonLab.jsx";
import UnitQuiz from "./UnitQuiz.jsx";

const PARTS = [
  { id: "theory", label: "Theory" },
  { id: "quiz", label: "Quiz" },
  { id: "lab", label: "Lab" },
];

const KIND_INFO = {
  quiz: { label: "Quiz", text: "Quiz questions will appear here." },
  project: {
    label: "Project",
    text: "Project instructions and submission will appear here.",
  },
  exam: { label: "Exam", text: "The exam will appear here." },
  lab: { label: "Lab", text: "Lab instructions will appear here." },
};

const nameOf = (row) => row?.title || row?.name || "Untitled";
const lessonPath = (row) => `/lessons/lesson/${row.id}`;
const isMobile = () => window.innerWidth < 900;
const LEAVE_MSG =
  "You have not finished the quiz. If you leave now, your answers will be lost. Leave anyway?";
// Keçilmiş quiz-lərin id-ləri bu cihazda saxlanır
const PASS_KEY = "lp-quiz-passed";
function readPassed() {
  try {
    const list = JSON.parse(localStorage.getItem(PASS_KEY));
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

// Tam YouTube linkindən və ya təkcə 11 simvolluq ID-dən video ID-ni çıxarır
function youtubeId(value) {
  if (!value) return null;
  const text = String(value).trim();
  const m = text.match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([\w-]{11})/);
  if (m) return m[1];
  return /^[\w-]{11}$/.test(text) ? text : null;
}

function Arrow({ dir = "right" }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
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
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M9 4v16" />
    </svg>
  );
}

function Check() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#fff"
      strokeWidth="3.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 12l5 5 9-10" />
    </svg>
  );
}

function Lock() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

export default function LessonPage() {
  const { id, part = "theory" } = useParams();
  const navigate = useNavigate();

  // Roadmap-lar və irəliləyiş bir dəfə yüklənir (sol panel və kilid üçün)
  const [course, setCourse] = useState({
    roadmaps: [],
    progress: {},
    ready: false,
  });
  // Dərsin özü və mətn/video məzmunu
  const [res, setRes] = useState({ id: null, lesson: null, content: null });
  const [open, setOpen] = useState(() => {
    if (isMobile()) return false;
    try {
      return localStorage.getItem("lp-panel") !== "0";
    } catch {
      return true;
    }
  });
  const [passedIds, setPassedIds] = useState(readPassed);
  const [quizActive, setQuizActive] = useState(false);
  const [userName, setUserName] = useState("");
  const [celebrate, setCelebrate] = useState("");

  // İstifadəçinin adı (quiz suallarında {name} yerinə yazılır)
  useEffect(() => {
    let off = false;
    (async () => {
      const { data } = await supabase.auth.getUser();
      const user = data?.user;
      if (!user) return;

      const { data: p } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();
      let name =
        p?.full_name || p?.name || p?.username || p?.display_name || "";
      if (!name)
        name = user.user_metadata?.full_name || user.user_metadata?.name || "";
      if (!name && user.email) name = user.email.split("@")[0];

      if (!off) setUserName(String(name).trim().split(" ")[0]);
    })();
    return () => {
      off = true;
    };
  }, []);

  function markPassed(lessonId) {
    const key = String(lessonId);
    setPassedIds((prev) => {
      if (prev.includes(key)) return prev;
      const next = [...prev, key];
      try {
        localStorage.setItem(PASS_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  useEffect(() => {
    let off = false;
    Promise.all([getMyRoadmaps(), getFullProgress()]).then(
      ([roadmaps, progress]) => {
        if (!off) setCourse({ roadmaps, progress, ready: true });
      },
    );
    return () => {
      off = true;
    };
  }, []);
  // "Mövzu bitdi" pəncərəsi 5 saniyəyə bağlanır
  useEffect(() => {
    if (!celebrate) return undefined;
    const t = setTimeout(() => setCelebrate(""), 5000);
    return () => clearTimeout(t);
  }, [celebrate]);

  useEffect(() => {
    let off = false;
    Promise.all([
      supabase.from("lessons").select("*").eq("id", id).maybeSingle(),
      supabase
        .from("lesson_content")
        .select("*")
        .eq("lesson_id", id)
        .maybeSingle(),
    ]).then(([l, c]) => {
      if (off) return;
      if (l.error)
        console.error("lesson error:", l.error.code, l.error.message);
      if (c.error)
        console.error("content error:", c.error.code, c.error.message);
      setRes({ id, lesson: l.data, content: c.data });
    });
    return () => {
      off = true;
    };
  }, [id]);

  // Bu dərs hansı roadmap-da və hansı bölmədədir
  let roadmap = null;
  let stage = null;
  for (const r of course.roadmaps) {
    const s = r.stages.find((x) =>
      x.lessons.some((l) => String(l.id) === String(id)),
    );
    if (s) {
      roadmap = r;
      stage = s;
      break;
    }
  }

  // Əvvəlki bölmə bitməyibsə bu dərs bağlıdır
  const locked =
    !!stage && !unlockedStageIds(roadmap, course.progress).has(stage.id);

  useEffect(() => {
    if (locked)
      navigate("/lessons", { replace: true, state: { locked: true } });
  }, [locked, navigate]);

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

  const loading = res.id !== id || !course.ready || locked;
  const list = stage ? stage.lessons : [];
  const stageName = stage ? nameOf(stage) : "";
  const lesson = loading
    ? null
    : res.lesson || list.find((l) => String(l.id) === String(id)) || null;
  const content = loading ? null : res.content;
  const missing = !loading && !lesson;

  const kind = lesson ? lessonKind(lesson) : "lesson";
  const direct = kind !== "lesson";
  const current = direct
    ? kind
    : PARTS.some((p) => p.id === part)
      ? part
      : "theory";
  const partIdx = PARTS.findIndex((p) => p.id === current);
  const info = KIND_INFO[current];
  const title = loading
    ? "Loading..."
    : lesson
      ? nameOf(lesson)
      : "Lesson not found";

  const idx = list.findIndex((l) => String(l.id) === String(id));

  const next = idx >= 0 && idx < list.length - 1 ? list[idx + 1] : null;

  const done = new Set([
    ...Object.keys(course.progress).map(String),
    ...passedIds.filter((k) => k.startsWith("lab:")).map((k) => k.slice(4)),
  ]);
  let nextLink;
  if (!direct && partIdx < PARTS.length - 1) {
    nextLink = {
      to: `/lessons/lesson/${id}/${PARTS[partIdx + 1].id}`,
      label: `Continue to ${PARTS[partIdx + 1].label}`,
    };
  } else if (next) {
    nextLink = { to: lessonPath(next), label: "Next lesson" };
  } else {
    nextLink = { to: "/lessons", label: "Finish unit" };
  }

  // Video: yalnız YouTube linki/ID-si yazılıbsa göstərilir
  const videoId = youtubeId(content?.video_url);
  const videoSrc = videoId
    ? `https://www.youtube-nocookie.com/embed/${videoId}?rel=0` +
      (content?.video_start ? `&start=${content.video_start}` : "") +
      (content?.video_end ? `&end=${content.video_end}` : "")
    : null;

  // Hissənin mətni: theory və lab bazadan gəlir
  const partText =
    current === "theory"
      ? content?.theory
      : current === "lab"
        ? content?.lab
        : null;
  const hasQuiz = Array.isArray(content?.quiz) && content.quiz.length > 0;
  // Quiz-i keçməyibsə "davam et" bloklanır
  const quizPassed = passedIds.includes(String(id));
  const needsQuiz = hasQuiz && !quizPassed;
  const quizBlocked = current === "quiz" && needsQuiz;

  const hasLab =
    Array.isArray(content?.lab_data?.steps) &&
    content.lab_data.steps.length > 0;
  const labPassed = passedIds.includes("lab:" + id);
  const labBlocked = current === "lab" && hasLab && !labPassed;

  const theoryDone = passedIds.includes("theory:" + id);
  const theoryBlocked = current === "theory" && !direct && !theoryDone;
  const blocked = quizBlocked || labBlocked || theoryBlocked;
  // Quiz keçilməyibsə Lab-a ünvanla da girmək olmasın
  useEffect(() => {
    if (!loading && current === "lab" && needsQuiz) {
      navigate(`/lessons/lesson/${id}/quiz`, { replace: true });
    }
  }, [loading, current, needsQuiz, id, navigate]);

  // Quiz davam edərkən: səhifəni bağlama/yeniləmə və brauzerin "geri" düyməsi üçün xəbərdarlıq
  useEffect(() => {
    if (!quizActive) return undefined;

    const onUnload = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onUnload);

    window.history.pushState({ quizGuard: true }, "");
    const onPop = () => {
      if (window.confirm(LEAVE_MSG)) {
        window.removeEventListener("popstate", onPop);
        navigate(-1);
      } else {
        window.history.pushState({ quizGuard: true }, "");
      }
    };
    window.addEventListener("popstate", onPop);

    return () => {
      window.removeEventListener("beforeunload", onUnload);
      window.removeEventListener("popstate", onPop);
    };
  }, [quizActive, navigate]);

  // Quiz davam edərkən səhifə daxilindəki hər hansı linkə basanda soruş
  function guardLeave(e) {
    if (!quizActive) return;
    const link = e.target.closest ? e.target.closest("a") : null;
    if (!link) return;
    if (!window.confirm(LEAVE_MSG)) {
      e.preventDefault();
      e.stopPropagation();
    }
  }

  return (
    <div className="lp-shell" onClickCapture={guardLeave}>
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
                const isDone = done.has(String(item.id));
                // Cari mövzunun quiz-i keçilməyibsə, sonrakı mövzular kilidlidir
                const lockedItem = needsQuiz && idx >= 0 && i > idx;
                return (
                  <li key={item.id}>
                    {lockedItem ? (
                      <span
                        className="lpc-item is-locked"
                        aria-disabled="true"
                        title="Pass this lesson's quiz first"
                      >
                        <span className="lpc-mark" />
                        <span className="lpc-name">
                          {i + 1}. {nameOf(item)}
                        </span>
                        <span className="lpc-lock">
                          <Lock />
                        </span>
                      </span>
                    ) : (
                      <Link
                        to={lessonPath(item)}
                        onClick={closeOnMobile}
                        className={
                          "lpc-item" + (isCurrent ? " is-current" : "")
                        }
                        aria-current={isCurrent ? "page" : undefined}
                      >
                        <span
                          className={"lpc-mark" + (isDone ? " is-done" : "")}
                        >
                          {isDone && <Check />}
                        </span>
                        <span className="lpc-name">
                          {i + 1}. {nameOf(item)}
                        </span>
                        {itemKind !== "lesson" && (
                          <span className="lpc-tag">
                            {KIND_INFO[itemKind]?.label || itemKind}
                          </span>
                        )}
                      </Link>
                    )}

                    {isCurrent && itemKind === "lesson" && (
                      <ul className="lpc-parts">
                        {PARTS.map((p) =>
                          p.id === "lab" && needsQuiz ? (
                            <li key={p.id}>
                              <span
                                className="lpc-part is-locked"
                                aria-disabled="true"
                                title="Pass the quiz first"
                              >
                                {p.label}
                                <span className="lpc-lock">
                                  <Lock />
                                </span>
                              </span>
                            </li>
                          ) : (
                            <li key={p.id}>
                              <Link
                                to={`/lessons/lesson/${item.id}/${p.id}`}
                                onClick={closeOnMobile}
                                className={
                                  "lpc-part" +
                                  (current === p.id ? " is-current" : "")
                                }
                              >
                                {p.label}
                              </Link>
                            </li>
                          ),
                        )}
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
          <div
            className={
              "lp-page" + (current === "lab" && hasLab ? " is-wide" : "")
            }
          >
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
                {videoSrc && (
                  <div className="lp-video">
                    <iframe
                      src={videoSrc}
                      title={title}
                      allow="accelerometer; encrypted-media; picture-in-picture; fullscreen"
                      allowFullScreen
                    />
                  </div>
                )}
                <article className="lp-card">
                  {partText ? (
                    <LessonContent key={id + "-theory"} text={partText} />
                  ) : (
                    <>
                      <h2>{title}</h2>
                      <p>Lesson text will be added here.</p>
                    </>
                  )}
                </article>
              </>
            )}

            {!loading && !missing && current === "lab" && hasLab && (
              <LessonLab
                key={id}
                data={content.lab_data}
                done={labPassed}
                onComplete={() => {
                  if (!labPassed) setCelebrate(String(id));
                  markPassed("lab:" + id);
                }}
              />
            )}

            {!loading &&
              !missing &&
              current !== "theory" &&
              info &&
              !(current === "lab" && hasLab) &&
                            (current === "quiz" && hasQuiz ? (
                direct ? (
                  <UnitQuiz
                    key={id}
                    questions={content.quiz}
                    passed={quizPassed}
                    onPassed={() => markPassed(id)}
                    onContinue={() => navigate(nextLink.to)}
                    onActive={setQuizActive}
                  />
                ) : (
                  <article className="lp-card">
                    <LessonQuiz
                      key={id}
                      bank={content.quiz}
                      passed={quizPassed}
                      onPass={() => markPassed(id)}
                      userName={userName}
                      onActive={setQuizActive}
                    />
                  </article>
                )
              ) : partText ? (
                <article className="lp-card">
                  <LessonContent key={id + "-" + current} text={partText} />
                </article>
              ) : (
                <article className="lp-card lp-soon">
                  <h2>{info.label}</h2>
                  <p>{info.text}</p>
                </article>
              ))}

            {!loading && !missing && (
              <>
                <div className="lp-foot">
                  {current === "theory" && !direct ? (
                    <div className="lp-mark">
                      <button
                        type="button"
                        className="lp-btn"
                        onClick={() => markPassed("theory:" + id)}
                        disabled={theoryDone}
                      >
                        Mark as completed
                      </button>
                      {theoryDone && (
                        <span
                          className="lp-mark-ok"
                          role="img"
                          aria-label="Completed"
                        >
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="3.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden="true"
                          >
                            <path d="M5 12l5 5 9-10" />
                          </svg>
                        </span>
                      )}
                    </div>
                  ) : (
                    <span />
                  )}
                  {!direct && (
                    <span className="lp-step">
                      Part {partIdx + 1} of {PARTS.length} ·{" "}
                      {PARTS[partIdx].label}
                    </span>
                  )}
                  {blocked ? (
                    <span
                      className="lp-btn is-primary is-disabled"
                      aria-disabled="true"
                    >
                      {nextLink.label}
                      <Arrow />
                    </span>
                  ) : (
                    <Link className="lp-btn is-primary" to={nextLink.to}>
                      {nextLink.label}
                      <Arrow />
                    </Link>
                  )}
                </div>
                {blocked && (
                  <p className="lp-hint">
                    {quizBlocked
                      ? "Score at least 70% on the quiz to continue."
                      : labBlocked
                        ? "Complete all lab steps to continue."
                        : "Mark the lesson as completed to continue."}
                  </p>
                )}
              </>
            )}
          </div>
        </main>
      </div>
      {celebrate === String(id) && (
        <div
          className="lp-done"
          role="status"
          aria-live="polite"
          onClick={() => setCelebrate("")}
        >
          <div className="lp-done-card" onClick={(e) => e.stopPropagation()}>
            <span className="lp-done-icon">
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M5 12l5 5 9-10" />
              </svg>
            </span>
            <h2>Success!</h2>
            <p>You finished the lesson “{title}”.</p>
            <Link
              className="lp-btn is-primary"
              to={nextLink.to}
              onClick={() => setCelebrate("")}
            >
              {nextLink.label}
              <Arrow />
            </Link>
            <span className="lp-done-bar" aria-hidden="true" />
          </div>
        </div>
      )}
    </div>
  );
}
