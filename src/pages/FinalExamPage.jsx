import "./FinalExamPage.css";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../supabaseclient.js";
import { markLessonComplete } from "../progress.js";
import { playCelebration } from "./UnitCelebration.js";

const CERT_PATH = "/certificates"; // Certificates bölməsinin yolu
const LESSONS_PATH = "/lessons";
const CONFETTI_COLORS = ["#f5b82e", "#0b6be8", "#2e9e6b", "#e5484d", "#8b5cf6", "#14b8c4"];

const key = (id) => `finalexam:${id}`;
const loadSaved = (id) => {
  try {
    return JSON.parse(localStorage.getItem(key(id)) || "null");
  } catch {
    return null;
  }
};
const saveState = (id, v) => {
  try {
    if (v) localStorage.setItem(key(id), JSON.stringify(v));
    else localStorage.removeItem(key(id));
  } catch {
    /* ignore */
  }
};
const fmt = (s) => {
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  const mm = String(m % 60).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
};
const fmtUsed = (s) => {
  const m = Math.floor(s / 60);
  return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m ${s % 60}s`;
};

function Trophy() {
  return (
    <svg className="fx-trophy" viewBox="0 0 120 120" aria-hidden="true">
      <path d="M36 14h48v30a24 24 0 0 1-48 0z" fill="#f5b82e" />
      <path d="M36 22H22v8a18 18 0 0 0 18 18" fill="none" stroke="#e29a0b" strokeWidth="6" strokeLinecap="round" />
      <path d="M84 22h14v8a18 18 0 0 1-18 18" fill="none" stroke="#e29a0b" strokeWidth="6" strokeLinecap="round" />
      <path d="M48 22v22a12 12 0 0 0 6 10" fill="none" stroke="#fff" strokeOpacity=".55" strokeWidth="4" strokeLinecap="round" />
      <rect x="54" y="68" width="12" height="16" fill="#e29a0b" />
      <rect x="40" y="84" width="40" height="10" rx="3" fill="#f5b82e" />
      <rect x="34" y="94" width="52" height="10" rx="3" fill="#e29a0b" />
    </svg>
  );
}

// Konfeti yuxarıdan düşür və ekranın altına çatanda yox olur (altda yığılmır)
// Math.random render zamanı çağırılmasın deyə sabit "təsadüfi" ədəd (həmişə eyni nəticə)
const rnd = (i, k) => {
  const x = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453;
  return x - Math.floor(x);
};
const PIECES = Array.from({ length: 90 }, (_, i) => ({
  i,
  left: rnd(i, 1) * 100,
  delay: rnd(i, 2) * 1.6,
  dur: 2.6 + rnd(i, 3) * 2.2,
  drift: (rnd(i, 4) - 0.5) * 160,
  rot: 360 + rnd(i, 5) * 720,
  w: 6 + rnd(i, 6) * 6,
  h: 8 + rnd(i, 7) * 8,
  color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
}));

function Confetti() {
  const pieces = PIECES;
  return (
    <div className="fx-confetti" aria-hidden="true">
      {pieces.map((p) => (
        <span
          key={p.i}
          className="fx-piece"
          style={{
            left: `${p.left}%`,
            width: p.w,
            height: p.h,
            background: p.color,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.dur}s`,
            "--drift": `${p.drift}px`,
            "--rot": `${p.rot}deg`,
          }}
        />
      ))}
    </div>
  );
}

export default function FinalExamPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [res, setRes] = useState({ id: null, lesson: null, content: null });
  // Yarımçıq imtahan varsa, ilk renderdən bərpa olunur (effect lazım deyil)
  const [saved] = useState(() => loadSaved(id));
  const [phase, setPhase] = useState(saved?.start ? "exam" : "intro"); // intro | exam | result
  const [answers, setAnswers] = useState(saved?.answers || {});
  const [cur, setCur] = useState(saved?.cur || 0);
  const [start, setStart] = useState(saved?.start || 0);
  const [now, setNow] = useState(0);
  const [result, setResult] = useState(null);
  const [confirm, setConfirm] = useState(false);
  const [confetti, setConfetti] = useState(false);
  const finishing = useRef(false);

  useEffect(() => {
    let off = false;
    Promise.all([
      supabase.from("lessons").select("*").eq("id", id).maybeSingle(),
      supabase.from("lesson_content").select("*").eq("lesson_id", id).maybeSingle(),
    ]).then(([l, c]) => {
      if (off) return;
      setRes({ id, lesson: l.data, content: c.data });
    });
    return () => {
      off = true;
    };
  }, [id]);

  const questions = useMemo(
    () => (Array.isArray(res.content?.quiz) ? res.content.quiz : []),
    [res.content],
  );
  const limitSec = (res.lesson?.time_limit_minutes || 90) * 60;
  const passMark = res.lesson?.pass_score || 70;
  const loading = res.id !== id;

  const ready = !loading && questions.length > 0;
  const left =
    phase === "exam" && now
      ? Math.max(0, limitSec - Math.floor((now - start) / 1000))
      : limitSec;

  const finish = useCallback(
    async (auto = false) => {
      if (finishing.current) return;
      finishing.current = true;
      const used = Math.min(limitSec, Math.round((Date.now() - start) / 1000));
      let correct = 0;
      const units = {};
      questions.forEach((q, i) => {
        const u = q.unit || "General";
        units[u] = units[u] || { right: 0, total: 0 };
        units[u].total += 1;
        if (answers[i] === q.answer) {
          correct += 1;
          units[u].right += 1;
        }
      });
      const pct = Math.round((correct / questions.length) * 100);
      const passed = pct >= passMark;
      saveState(id, null);
      setConfirm(false);
      setResult({ correct, pct, passed, used, units, auto });
      setPhase("result");
      if (passed) {
        setConfetti(true);
        playCelebration();
        setTimeout(() => setConfetti(false), 7000);
        await markLessonComplete(id);
      }
    },
    [answers, id, limitSec, passMark, questions, start],
  );

  // Taymer (state yalnız callback daxilində yenilənir)
  useEffect(() => {
    if (phase !== "exam" || !ready) return undefined;
    const tick = () => {
      const t = Date.now();
      setNow(t);
      if (limitSec - Math.floor((t - start) / 1000) <= 0) finish(true);
    };
    const first = setTimeout(tick, 0);
    const t = setInterval(tick, 1000);
    return () => {
      clearTimeout(first);
      clearInterval(t);
    };
  }, [phase, ready, start, limitSec, finish]);

  // Cavabları saxla
  useEffect(() => {
    if (phase === "exam") saveState(id, { start, answers, cur });
  }, [phase, id, start, answers, cur]);

  // Səhifədən çıxmaqdan qoru
  useEffect(() => {
    if (phase !== "exam") return undefined;
    const h = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [phase]);

  function begin() {
    finishing.current = false;
    setAnswers({});
    setCur(0);
    setResult(null);
    const t = Date.now();
    setStart(t);
    setNow(t);
    setPhase("exam");
  }

  if (loading) return <div className="fx-page"><p className="fx-muted">Loading…</p></div>;
  if (!res.lesson || !questions.length)
    return (
      <div className="fx-page">
        <div className="fx-card">
          <h1>Final Exam</h1>
          <p className="fx-muted">The exam questions are not available yet.</p>
          <button className="fx-btn" onClick={() => navigate(LESSONS_PATH)}>Back to lessons</button>
        </div>
      </div>
    );

  /* ---------- INTRO ---------- */
  if (phase === "intro")
    return (
      <div className="fx-page">
        <div className="fx-card">
          <div className="fx-badge">Final Exam</div>
          <h1>Prove what you learned</h1>
          <p className="fx-muted">
            This exam covers all units of the roadmap, except the certification project.
          </p>
          <div className="fx-facts">
            <div><b>{questions.length}</b><span>multiple-choice questions</span></div>
            <div><b>{Math.round(limitSec / 60)} min</b><span>time limit</span></div>
            <div><b>{passMark}%</b><span>to pass</span></div>
          </div>
          <ul className="fx-rules">
            <li>The timer starts when you press Start and keeps running if you refresh the page.</li>
            <li>You can move between questions and change answers until you finish.</li>
            <li>When time runs out, the exam is submitted automatically.</li>
            <li>Passing completes the whole field and unlocks your certificate.</li>
          </ul>
          <div className="fx-actions">
            <button className="fx-btn" onClick={() => navigate(LESSONS_PATH)}>Back</button>
            <button className="fx-btn is-primary" onClick={begin}>Start exam</button>
          </div>
        </div>
      </div>
    );

  /* ---------- EXAM ---------- */
  if (phase === "exam") {
    const q = questions[cur];
    const answered = Object.keys(answers).length;
    const low = left <= 900; // 15 dəqiqədən az qalanda qırmızı
    return (
      <div className="fx-page is-exam">
        <header className="fx-top">
          <div className="fx-top-l">
            <b>Final Exam</b>
            <span className="fx-muted">{answered}/{questions.length} answered</span>
          </div>
          <div className={"fx-timer" + (low ? " is-low" : "")} role="timer" aria-label="Time left">
            {fmt(left)}
          </div>
          <button className="fx-btn is-primary" onClick={() => setConfirm(true)}>Finish</button>
        </header>

        <div className="fx-bar"><i style={{ width: `${(answered / questions.length) * 100}%` }} /></div>

        <div className="fx-main">
          <section className="fx-card fx-q">
            <div className="fx-qmeta">Question {cur + 1} of {questions.length}</div>
            <div className="fx-qtext">
              {q.q.split("```").map((seg, k) =>
                k % 2 ? (
                  <pre key={k} className="fx-code"><code>{seg.replace(/^\n|\n$/g, "")}</code></pre>
                ) : (
                  seg.trim() && <p key={k}>{seg.trim()}</p>
                ),
              )}
            </div>
            <div className="fx-opts" role="radiogroup">
              {q.options.map((o, i) => (
                <button
                  key={i}
                  type="button"
                  role="radio"
                  aria-checked={answers[cur] === i}
                  className={"fx-opt" + (answers[cur] === i ? " is-sel" : "")}
                  onClick={() => setAnswers((a) => ({ ...a, [cur]: i }))}
                >
                  <span className="fx-letter">{"ABCD"[i]}</span>
                  <span>{o}</span>
                </button>
              ))}
            </div>
            <div className="fx-actions">
              <button className="fx-btn" disabled={cur === 0} onClick={() => setCur(cur - 1)}>Previous</button>
              <button
                className="fx-btn is-primary"
                disabled={cur === questions.length - 1}
                onClick={() => setCur(cur + 1)}
              >
                Next
              </button>
            </div>
          </section>

          <aside className="fx-card fx-nav" aria-label="Questions">
            <div className="fx-grid">
              {questions.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  className={"fx-n" + (i === cur ? " is-cur" : "") + (answers[i] !== undefined ? " is-done" : "")}
                  onClick={() => setCur(i)}
                  aria-label={`Question ${i + 1}${answers[i] !== undefined ? ", answered" : ""}`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          </aside>
        </div>

        {confirm && (
          <div className="fx-modal" role="dialog" aria-modal="true">
            <div className="fx-modal-card">
              <h3>Finish the exam?</h3>
              <p className="fx-muted">
                {questions.length - answered > 0
                  ? `You have ${questions.length - answered} unanswered question(s). They count as wrong.`
                  : "You answered every question."}
              </p>
              <div className="fx-actions">
                <button className="fx-btn" onClick={() => setConfirm(false)}>Keep going</button>
                <button className="fx-btn is-primary" onClick={() => finish(false)}>Submit</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  /* ---------- RESULT ---------- */
  const r = result;
  const unitRows = Object.entries(r.units);

  if (r.passed)
    return (
      <div className="fx-page">
        {confetti && <Confetti />}
        <div className="fx-card fx-done">
          <Trophy />
          <h1>Congratulations!</h1>
          <p className="fx-lead">You passed the Final Exam and completed the whole field.</p>
          <div className="fx-stats">
            <div><b>{r.pct}%</b><span>Your score</span></div>
            <div><b>{r.correct} / {questions.length}</b><span>Correct answers</span></div>
            <div><b>{fmtUsed(r.used)}</b><span>Time used</span></div>
          </div>
          <div className="fx-note">
            Your certificate is ready. You can get it from the Certificates section.
          </div>
          <div className="fx-actions is-center">
            <button className="fx-btn" onClick={() => navigate(LESSONS_PATH)}>Back to lessons</button>
            <button className="fx-btn is-primary" onClick={() => navigate(CERT_PATH)}>Get my certificate</button>
          </div>
        </div>
      </div>
    );

  return (
    <div className="fx-page">
      <div className="fx-card">
        <div className="fx-badge is-fail">{r.auto ? "Time is up" : "Not passed yet"}</div>
        <h1>{r.pct}%</h1>
        <p className="fx-muted">
          You answered {r.correct} of {questions.length} correctly. You need {passMark}% to pass.
        </p>
        <div className="fx-units">
          {unitRows.map(([name, v]) => (
            <div key={name} className="fx-unit">
              <span>{name}</span>
              <i><u style={{ width: `${(v.right / v.total) * 100}%` }} /></i>
              <b>{v.right}/{v.total}</b>
            </div>
          ))}
        </div>
        <p className="fx-muted">Review the units where your score is low, then try again.</p>
        <div className="fx-actions">
          <button className="fx-btn" onClick={() => navigate(LESSONS_PATH)}>Back to lessons</button>
          <button className="fx-btn is-primary" onClick={begin}>Try again</button>
        </div>
      </div>
    </div>
  );
}