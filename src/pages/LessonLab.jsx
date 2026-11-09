import "./LessonLab.css";
import { useEffect, useId, useRef, useState } from "react";
import EditorImport from "react-simple-code-editor";
import Prism from "prismjs";
import LessonContent from "./LessonContent.jsx";

// Bu paket köhnə (CommonJS) formatdadır; bəzi Vite versiyalarında komponent .default içində gəlir
const Editor = EditorImport.default ?? EditorImport;

const RUN_LIMIT_MS = 3000; // kod bu qədərdən çox işləsə dayandırılır
const OK_MS = 4000; // uğur mesajı bu qədər sonra yox olur
const SOLUTION_AFTER = 2; // neçə uğursuz yoxlamadan sonra "Show solution" çıxsın

// Worker-in içində console.log-u tutub nəticəni göndərir və __out massivində saxlayır
const BOOT = `(function () {
  self.__out = [];
  function fmt(v) {
    if (typeof v === "string") return v;
    if (v instanceof Error) return v.name + ": " + v.message;
    if (typeof v === "undefined") return "undefined";
    try {
      var s = JSON.stringify(v, null, 2);
      return s === undefined ? String(v) : s;
    } catch (e) {
      return String(v);
    }
  }
  function send(kind, args) {
    var t = Array.prototype.map.call(args, fmt).join(" ");
    self.__out.push(t);
    postMessage({ kind: kind, text: t });
  }
  console.log = function () { send("log", arguments); };
  console.info = console.log;
  console.debug = console.log;
  console.warn = function () { send("warn", arguments); };
  console.error = function () { send("error", arguments); };
})();
`;

function highlight(code) {
  return Prism.highlight(code, Prism.languages.javascript, "javascript");
}

// İstifadəçinin kodunu Worker-də işlədir, sonra testləri eyni skriptdə yoxlayır
function runInWorker(code, tests) {
  return new Promise((resolve) => {
    const lines = [];
    let worker = null;
    let url = null;
    let timer = 0;
    let finished = false;

    function finish(extra) {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      if (worker) worker.terminate();
      if (url) URL.revokeObjectURL(url);
      resolve({ lines, ...extra });
    }

    const probes = tests
      .map((t) => "try{__r.push(!!(" + t + "))}catch(__e){__r.push(false)}")
      .join("");
    const tail =
      "\n;(function(){var __r=[];" + probes + 'postMessage({kind:"checks",results:__r});})();';

    try {
      url = URL.createObjectURL(new Blob([BOOT + "\n" + code + tail], { type: "text/javascript" }));
      worker = new Worker(url);
    } catch {
      finish({ error: "This browser cannot run the code here." });
      return;
    }

    worker.onmessage = (e) => {
      const m = e.data;
      if (m.kind === "checks") finish({ results: m.results });
      else lines.push(m);
    };
    worker.onerror = (e) => {
      e.preventDefault();
      finish({ error: e.message || "Something went wrong." });
    };
    timer = setTimeout(
      () => finish({ error: "Your code ran for too long. Check for a loop that never ends." }),
      RUN_LIMIT_MS,
    );
  });
}

function Tick() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12l5 5 9-10" />
    </svg>
  );
}

export default function LessonLab({ data, done, onComplete }) {
  const steps = data?.steps || [];
  const editorId = useId();
  const [index, setIndex] = useState(0);
  const [codes, setCodes] = useState(() => steps.map((s) => s.starter || ""));
  const [answers, setAnswers] = useState({});
  const [passed, setPassed] = useState(() => steps.map(() => !!done));
  const [fails, setFails] = useState(() => steps.map(() => 0));
  const [out, setOut] = useState({ lines: [], error: "" });
  const [msg, setMsg] = useState(null);
  const [hint, setHint] = useState(false);
  const [busy, setBusy] = useState(false);
  const timerRef = useRef(0);
  const aliveRef = useRef(true);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
      clearTimeout(timerRef.current);
    };
  }, []);

  if (steps.length === 0) return null;

  const step = steps[index];
  const isForm = step.type === "form";

  function go(i) {
    clearTimeout(timerRef.current);
    setIndex(i);
    setMsg(null);
    setHint(false);
    setOut({ lines: [], error: "" });
  }

  function setCode(value) {
    setCodes((prev) => prev.map((c, i) => (i === index ? value : c)));
  }

  async function run() {
    const r = await runInWorker(codes[index], []);
    if (aliveRef.current) setOut({ lines: r.lines, error: r.error || "" });
  }

  async function check() {
    if (busy) return;
    setBusy(true);
    clearTimeout(timerRef.current);
    const problems = [];

    if (isForm) {
      for (const f of step.fields) {
        const v = String(answers[index + ":" + f.id] ?? "").trim();
        let ok;
        if (f.kind === "select") {
          ok = v === f.answer;
        } else {
          const n = Number(v);
          ok = v !== "" && (f.ok ? f.ok.includes(n) : n >= (f.min ?? 0));
        }
        if (!ok) problems.push(f.fail);
      }
    } else {
      const r = await runInWorker(codes[index], step.checks.map((c) => c.test));
      if (!aliveRef.current) return;
      setOut({ lines: r.lines, error: r.error || "" });
      if (r.error) {
        problems.push("There is a problem in your code: " + r.error);
      } else {
        step.checks.forEach((c, i) => {
          if (!r.results[i]) problems.push(c.fail);
        });
      }
    }

    setBusy(false);

    if (problems.length === 0) {
      const nextPassed = passed.map((p, i) => (i === index ? true : p));
      setPassed(nextPassed);
      const finished = nextPassed.every(Boolean);
      setMsg({
        type: "ok",
        items: [finished ? "Lab complete! Great job." : "Correct! You can go to the next step."],
      });
      timerRef.current = setTimeout(() => setMsg(null), OK_MS);
      if (finished && onComplete) onComplete();
    } else {
      setFails((prev) => prev.map((n, i) => (i === index ? n + 1 : n)));
      setMsg({ type: "error", items: problems });
    }
  }

  function showSolution() {
    setCode(step.solution || "");
    setMsg({ type: "info", items: ["The solution is in the editor. Read it, then press Check my answer."] });
  }

  function setAnswer(key, value) {
    setAnswers((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <div className="ll">
      <div className="ll-left">
        {isForm ? (
          <div className="ll-form">
            <h3>Your answers</h3>
            {step.fields.map((f) => {
              const key = index + ":" + f.id;
              return (
                <label key={key} className="ll-field">
                  <span>{f.label}</span>
                  {f.kind === "select" ? (
                    <select value={answers[key] ?? ""} onChange={(e) => setAnswer(key, e.target.value)}>
                      {f.options.map((o) => (
                        <option key={o} value={o}>
                          {o || "Choose..."}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="number"
                      inputMode="numeric"
                      value={answers[key] ?? ""}
                      onChange={(e) => setAnswer(key, e.target.value)}
                    />
                  )}
                </label>
              );
            })}
          </div>
        ) : (
          <div className="ll-code">
            <div className="ll-bar">
              <span className="ll-lang">JavaScript</span>
              <div className="ll-bar-actions">
                <button type="button" className="ll-tool" onClick={() => setCode(step.starter || "")}>
                  Reset
                </button>
                <button type="button" className="ll-tool is-run" onClick={run}>
                  <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
                    <path d="M8 5v14l11-7z" fill="currentColor" />
                  </svg>
                  Run
                </button>
              </div>
            </div>

            <label className="ll-sr" htmlFor={editorId}>
              Code editor. Press Escape and then Tab to leave the editor.
            </label>
            <div className="ll-editor">
              <Editor
                textareaId={editorId}
                value={codes[index]}
                onValueChange={setCode}
                highlight={highlight}
                padding={16}
                tabSize={2}
                textareaClassName="ll-textarea"
                style={{
                  fontFamily: '"JetBrains Mono", ui-monospace, Menlo, Consolas, monospace',
                  fontSize: 14,
                  lineHeight: 1.7,
                }}
              />
            </div>

            <div className="ll-out" tabIndex={0} role="log" aria-label="Output">
              <span className="ll-out-label">Output</span>
              {out.lines.length === 0 && !out.error ? (
                <p className="ll-out-empty">Press Run to see the result here.</p>
              ) : (
                out.lines.map((l, i) => (
                  <pre key={i} className={"ll-line is-" + l.kind}>
                    {l.text}
                  </pre>
                ))
              )}
              {out.error && <pre className="ll-line is-error">{out.error}</pre>}
            </div>
          </div>
        )}
      </div>

      <div className="ll-right">
        <ol className="ll-steps" aria-label="Lab steps">
          {steps.map((s, i) => {
            const open = i === 0 || passed[i - 1];
            return (
              <li key={i}>
                <button
                  type="button"
                  className={"ll-dot" + (i === index ? " is-current" : "") + (passed[i] ? " is-done" : "")}
                  disabled={!open}
                  onClick={() => go(i)}
                  aria-label={"Step " + (i + 1) + (passed[i] ? " (done)" : "")}
                  aria-current={i === index ? "step" : undefined}
                >
                  {passed[i] ? <Tick /> : i + 1}
                </button>
              </li>
            );
          })}
        </ol>

        <p className="ll-count">
          Step {index + 1} of {steps.length}
        </p>
        <h2>{step.title}</h2>
        <LessonContent key={"ll-text-" + index} text={step.text} />

        {hint && step.hint && (
          <div className="ll-hint">
            <strong>Hint:</strong> {step.hint}
          </div>
        )}

        <div className="ll-actions">
          {step.hint && !hint && (
            <button type="button" className="ll-act" onClick={() => setHint(true)}>
              Show hint
            </button>
          )}
          {!isForm && step.solution && fails[index] >= SOLUTION_AFTER && (
            <button type="button" className="ll-act" onClick={showSolution}>
              Show solution
            </button>
          )}
          <button type="button" className="ll-act is-primary" onClick={check} disabled={busy}>
            Check my answer
          </button>
          {passed[index] && index < steps.length - 1 && (
            <button type="button" className="ll-act" onClick={() => go(index + 1)}>
              Next step
            </button>
          )}
        </div>

        {msg && (
          <div className={"ll-msg is-" + msg.type} role="status" aria-live="polite">
            {msg.type === "ok" && <strong>Success! </strong>}
            {msg.type === "error" && <strong>Not quite yet:</strong>}
            <ul>
              {msg.items.map((t, i) => (
                <li key={i}>{t}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}