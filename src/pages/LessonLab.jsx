import "./LessonLab.css";
import { useEffect, useId, useRef, useState } from "react";
import EditorImport from "react-simple-code-editor";
import Prism from "prismjs";
import LessonContent from "./LessonContent.jsx";

const Editor = EditorImport.default ?? EditorImport;

const RUN_LIMIT_MS = 3000;
const OK_MS = 4000;
const SOLUTION_AFTER = 2;

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
const STATIC_LANGS = ["json", "module"];

const HTML_BOOT = (runId) => `<script>(function(){
  var RID = ${JSON.stringify(runId)};
  function fmt(v){
    if (typeof v === "string") return v;
    if (v instanceof Error) return v.name + ": " + v.message;
    if (typeof v === "undefined") return "undefined";
    try { var s = JSON.stringify(v, null, 2); return s === undefined ? String(v) : s; } catch (e) { return String(v); }
  }
  function send(kind, args){
    var t = Array.prototype.map.call(args, fmt).join(" ");
    parent.postMessage({ __ll: true, rid: RID, kind: kind, text: t }, "*");
  }
  console.log = function(){ send("log", arguments); };
  console.info = console.log; console.debug = console.log;
  console.warn = function(){ send("warn", arguments); };
  console.error = function(){ send("error", arguments); };
  window.addEventListener("error", function(e){ send("error", [e.message]); });
  window.addEventListener("unhandledrejection", function(e){ send("error", ["Unhandled promise: " + fmt(e.reason)]); });
})();</script>`;

function buildPreview(code, runId) {
  const boot = HTML_BOOT(runId);
  if (/<head[^>]*>/i.test(code))
    return code.replace(/<head[^>]*>/i, (m) => m + boot);
  return boot + code;
}

function hasVisibleContent(code) {
  const doc = new DOMParser().parseFromString(code, "text/html");
  doc.body
    .querySelectorAll("script,style,template,noscript")
    .forEach((n) => n.remove());
  return doc.body.children.length > 0 || doc.body.textContent.trim() !== "";
}
const SQL_GRAMMAR = {
  comment: /--.*|\/\*[\s\S]*?\*\//,
  string: /'(?:[^']|'')*'/,
  keyword:
    /\b(?:select|from|where|and|or|not|in|is|null|as|join|inner|left|right|full|outer|cross|on|using|group|by|order|having|limit|offset|distinct|union|all|insert|into|values|update|set|delete|create|alter|drop|table|index|unique|view|materialized|primary|key|foreign|references|default|check|constraint|add|column|rename|to|if|exists|begin|commit|rollback|savepoint|transaction|with|recursive|case|when|then|else|end|like|ilike|between|returning|conflict|do|nothing|cascade|restrict|explain|analyze|extension|function|returns|language|trigger|for|each|row|asc|desc|true|false|over|partition|window|cast|grant|revoke|to_tsvector|to_tsquery|using|gin|gist|btree|hash|generated|always|stored|serial|uuid|text|integer|int|bigint|boolean|numeric|varchar|timestamptz|timestamp|date|jsonb|json)\b/i,
  function: /\b[a-z_][a-z0-9_]*(?=\()/i,
  number: /\b\d+(?:\.\d+)?\b/,
  operator: /<=|>=|<>|!=|::|\|\||[=<>+\-*/%]/,
  punctuation: /[;(),.]/,
};

const GRAPHQL_GRAMMAR = {
  comment: /#.*/,
  string: /"(?:\\.|[^\\"\r\n])*"/,
  keyword:
    /\b(?:query|mutation|subscription|fragment|on|type|input|enum|interface|union|scalar|schema|extend|implements|directive)\b/,
  boolean: /\b(?:true|false|null)\b/,
  number: /-?\b\d+(?:\.\d+)?\b/,
  "class-name": /\b[A-Z][A-Za-z0-9_]*\b/,
  variable: /\$[A-Za-z_]\w*/,
  punctuation: /[!(){}[\]:=,|&@.]/,
};

const TS_KEYWORDS =
  /\b(?:abstract|as|async|await|break|case|catch|class|const|continue|declare|default|delete|do|else|enum|export|extends|finally|for|from|function|get|if|implements|import|in|infer|instanceof|interface|is|keyof|let|module|namespace|new|of|private|protected|public|readonly|return|satisfies|set|static|switch|throw|try|type|typeof|var|void|while|with|yield)\b/;
const TS_GRAMMAR = Prism.languages.extend("javascript", {
  keyword: TS_KEYWORDS,
  builtin: /\b(?:string|number|boolean|any|unknown|never|object|symbol|bigint)\b/,
});

const LANG_LABELS = {
  html: "HTML",
  css: "CSS",
  json: "JSON",
  sql: "SQL",
  typescript: "TypeScript",
  graphql: "GraphQL",
  javascript: "JavaScript",
};

function highlightCode(code, lang, label) {
  const key = String(label || lang || "javascript").toLowerCase();
  if (key === "html") {
    const g = Prism.languages.markup || Prism.languages.html || Prism.languages.javascript;
    return Prism.highlight(code, g, "markup");
  }
  if (key === "css" && Prism.languages.css) return Prism.highlight(code, Prism.languages.css, "css");
  if (key === "sql") return Prism.highlight(code, SQL_GRAMMAR, "sql");
  if (key === "graphql") return Prism.highlight(code, GRAPHQL_GRAMMAR, "graphql");
  if (key === "typescript") return Prism.highlight(code, TS_GRAMMAR, "typescript");
  return Prism.highlight(code, Prism.languages.javascript, "javascript");
}

function runHtmlChecks(code, tests) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(code, "text/html");
  const results = tests.map((t) => {
    try {
      const fn = new Function("doc", "code", "return !!(" + t + ");");
      return fn(doc, code);
    } catch {
      return false;
    }
  });
  return { lines: [], results };
}

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
      "\n;(function(){var __r=[];" +
      probes +
      'postMessage({kind:"checks",results:__r});})();';

    try {
      url = URL.createObjectURL(
        new Blob([BOOT + "\n" + code + tail], { type: "text/javascript" }),
      );
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
      () => finish({ error: "Your code ran for too long." }),
      RUN_LIMIT_MS,
    );
  });
}

function Tick() {
  return (
    <svg
      width="14"
      height="14"
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
  const [htmlPreview, setHtmlPreview] = useState("");
  const [msg, setMsg] = useState(null);
  const [hint, setHint] = useState(false);
  const [busy, setBusy] = useState(false);
  const [htmlLogs, setHtmlLogs] = useState([]);
  const [htmlVisual, setHtmlVisual] = useState(true);
  const runIdRef = useRef("");

  // === TERMINAL STATE ===
  const [termHistory, setTermHistory] = useState([]);
  const [termInput, setTermInput] = useState("");
  const [termTaskIdx, setTermTaskIdx] = useState(0);
  // ======================

  const timerRef = useRef(0);
  const aliveRef = useRef(true);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
      clearTimeout(timerRef.current);
    };
  }, []);
  useEffect(() => {
    function onMsg(e) {
      const m = e.data;
      if (!m || !m.__ll || m.rid !== runIdRef.current) return;
      setHtmlLogs((prev) => [...prev, { kind: m.kind, text: m.text }]);
    }
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, []);
  if (steps.length === 0) return null;

  const step = steps[index];
  const isForm = step.type === "form";
  const isTerminal = step.type === "terminal";
  const stepLang = (step.language || "javascript").toLowerCase();
  const isHtml = stepLang === "html";
  const isStatic = STATIC_LANGS.includes(stepLang);
  const labelKey = String(step.label || (isHtml ? "html" : stepLang)).toLowerCase();
  const langLabel = LANG_LABELS[labelKey] || "JavaScript";

  function go(i) {
    clearTimeout(timerRef.current);
    setIndex(i);
    setMsg(null);
    setHint(false);
    setOut({ lines: [], error: "" });
    setHtmlPreview("");

    setTermHistory([]);
    setTermInput("");
    setTermTaskIdx(0);
    setHtmlLogs([]);
    runIdRef.current = "";
  }

  function setCode(value) {
    setCodes((prev) => prev.map((c, i) => (i === index ? value : c)));
  }

  function previewHtml(code) {
    const rid = Math.random().toString(36).slice(2);
    runIdRef.current = rid;
    setHtmlLogs([]);
    setHtmlVisual(hasVisibleContent(code));
    setHtmlPreview(buildPreview(code, rid));
  }

  async function run() {
    if (isHtml) {
      previewHtml(codes[index]);
      return;
    }
    if (isStatic) {
      setOut({
        lines: [
          {
            kind: "log",
            text: "This step is not run. Press Check my answer to test it.",
          },
        ],
        error: "",
      });
      return;
    }
    const r = await runInWorker(codes[index], []);
    if (aliveRef.current) setOut({ lines: r.lines, error: r.error || "" });
  }

  // ==== TERMINAL MƏNTİQİ ====
  function finishTerminalTask(task, cmdTyped, output = "") {
    const newHistory = [
      ...termHistory,
      { in: cmdTyped, out: output || task.success_message },
    ];
    setTermHistory(newHistory);
    setTermInput("");

    const nextTaskIdx = termTaskIdx + 1;
    setTermTaskIdx(nextTaskIdx);

    if (nextTaskIdx >= step.tasks.length) {
      const nextPassed = passed.map((p, i) => (i === index ? true : p));
      setPassed(nextPassed);
      const finished = nextPassed.every(Boolean);
      setMsg({
        type: "ok",
        items: [
          finished
            ? "Lab complete! Great job."
            : "Terminal tasks complete! You can go to the next step.",
        ],
      });
      timerRef.current = setTimeout(() => setMsg(null), OK_MS);
      if (finished && onComplete) onComplete();
    }
  }

  function handleTermKey(e) {
    const currentTask = step.tasks[termTaskIdx];

    if (e.key === "Tab") {
      e.preventDefault();
      if (currentTask && currentTask.action === "tab_completion") {
        finishTerminalTask(currentTask, termInput + " [Tab]");
      }
      return;
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (currentTask && currentTask.action === "command_history") {
        finishTerminalTask(currentTask, "[Arrow Up]");
      } else if (termHistory.length > 0) {
        setTermInput(termHistory[termHistory.length - 1].in);
      }
      return;
    }

    if (e.key === "c" && e.ctrlKey) {
      if (currentTask && currentTask.action === "interrupt_command") {
        e.preventDefault();
        finishTerminalTask(currentTask, "[Ctrl+C]");
      }
      return;
    }

    if (e.key === "Enter") {
      const cmd = termInput.trim();
      if (!cmd) return;

      if (cmd === "clear") {
        setTermHistory([]);
        setTermInput("");
        return;
      }

      if (
        currentTask &&
        currentTask.expected_commands &&
        currentTask.expected_commands.includes(cmd)
      ) {
        finishTerminalTask(currentTask, cmd);
      } else {
        const baseCmd = cmd.split(/\s+/)[0];
        const knownCommands = data?.known_commands || {};
        let errorOutput = "";

        if (knownCommands[baseCmd]) {
          errorOutput = `Incorrect command for this task.\nInfo: '${baseCmd}' is a real command used to ${knownCommands[baseCmd]}. Check the instructions and try again.`;
        } else {
          errorOutput = `bash: ${baseCmd}: command not found`;
        }

        setTermHistory((prev) => [
          ...prev,
          { in: cmd, out: errorOutput, err: true },
        ]);
        setTermInput("");
      }
    }
  }
  // ==========================

  async function check() {
    if (busy || isTerminal) return;
    setBusy(true);
    clearTimeout(timerRef.current);
    const problems = [];

    if (isForm) {
      for (const f of step.fields || []) {
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
    } else if (isHtml || isStatic) {
      const checks = step.checks || [];
      if (isHtml) previewHtml(codes[index]);
      const r = runHtmlChecks(
        codes[index],
        checks.map((c) => c.test),
      );
      checks.forEach((c, i) => {
        if (!r.results[i]) problems.push(c.fail);
      });
    } else {
      const checks = step.checks || [];
      const r = await runInWorker(
        codes[index],
        checks.map((c) => c.test),
      );
      if (!aliveRef.current) return;
      setOut({ lines: r.lines, error: r.error || "" });
      if (r.error) {
        problems.push("There is a problem in your code: " + r.error);
      } else {
        checks.forEach((c, i) => {
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
        items: [
          finished
            ? "Lab complete! Great job."
            : "Correct! You can go to the next step.",
        ],
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
    setMsg({
      type: "info",
      items: [
        "The solution is in the editor. Read it, then press Check my answer.",
      ],
    });
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
            {(step.fields || []).map((f) => {
              const key = index + ":" + f.id;
              return (
                <label key={key} className="ll-field">
                  <span>{f.label}</span>
                  {f.kind === "select" ? (
                    <select
                      value={answers[key] ?? ""}
                      onChange={(e) => setAnswer(key, e.target.value)}
                    >
                      <option value="">Choose...</option>
                      {f.options.map((o) => (
                        <option key={o} value={o}>
                          {o}
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
        ) : isTerminal ? (
          <div
            className="ll-terminal"
            style={{
              backgroundColor: "#1e1e1e",
              color: "#d4d4d4",
              padding: "16px",
              borderRadius: "8px",
              fontFamily: "monospace",
              display: "flex",
              flexDirection: "column",
              height: "100%",
              minHeight: "450px",
            }}
          >
            <div
              className="ll-bar"
              style={{
                marginBottom: "12px",
                borderBottom: "1px solid #333",
                paddingBottom: "8px",
              }}
            >
              <span className="ll-lang">Terminal</span>
              <div className="ll-bar-actions">
                <button
                  type="button"
                  className="ll-tool"
                  onClick={() => {
                    setTermHistory([]);
                    setTermInput("");
                    setTermTaskIdx(0);
                  }}
                >
                  Reset
                </button>
              </div>
            </div>

            <div
              style={{
                flexGrow: 1,
                overflowY: "auto",
                display: "flex",
                flexDirection: "column",
                justifyContent: "flex-end",
              }}
            >
              <div>
                {termHistory.map((h, i) => (
                  <div key={i} style={{ marginBottom: "6px" }}>
                    <div style={{ color: "#4af626" }}>
                      student@linux:~$ {h.in}
                    </div>
                    {h.out && (
                      <div
                        style={{
                          color: h.err ? "#f44336" : "#d4d4d4",
                          whiteSpace: "pre-wrap",
                          marginTop: "4px",
                        }}
                      >
                        {h.out}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                marginTop: "12px",
              }}
            >
              <span style={{ color: "#4af626", marginRight: "8px" }}>
                student@linux:~$
              </span>
              <input
                type="text"
                value={termInput}
                onChange={(e) => setTermInput(e.target.value)}
                onKeyDown={handleTermKey}
                style={{
                  backgroundColor: "transparent",
                  border: "none",
                  color: "#d4d4d4",
                  outline: "none",
                  flexGrow: 1,
                  fontFamily: "monospace",
                  fontSize: "14px",
                }}
                autoFocus
                autoComplete="off"
                spellCheck="false"
              />
            </div>
          </div>
        ) : (
          <div className="ll-code">
            <div className="ll-bar">
              <span className="ll-lang">{langLabel}</span>
              <div className="ll-bar-actions">
                <button
                  type="button"
                  className="ll-tool"
                  onClick={() => setCode(step.starter || "")}
                >
                  Reset
                </button>
                <button type="button" className="ll-tool is-run" onClick={run}>
                  <svg
                    viewBox="0 0 24 24"
                    width="14"
                    height="14"
                    aria-hidden="true"
                  >
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
                highlight={(code) => highlightCode(code, stepLang, step.label)}
                padding={16}
                tabSize={2}
                textareaClassName="ll-textarea"
                style={{
                  fontFamily:
                    '"JetBrains Mono", ui-monospace, Menlo, Consolas, monospace',
                  fontSize: 14,
                  lineHeight: 1.7,
                }}
              />
            </div>

            <div className="ll-out" tabIndex={0} role="log" aria-label="Output">
              <span className="ll-out-label">
                {isHtml ? (htmlVisual ? "Preview" : "Console") : "Output"}
              </span>
              {isHtml ? (
                htmlPreview ? (
                  <>
                    <iframe
                      title="HTML Preview"
                      srcDoc={htmlPreview}
                      sandbox="allow-scripts"
                      style={
                        htmlVisual
                          ? {
                              width: "100%",
                              minHeight: "150px",
                              border: "none",
                              background: "#fff",
                              borderRadius: "4px",
                            }
                          : { display: "none" }
                      }
                    />
                    {htmlLogs.length > 0 && (
                      <div
                        style={{
                          marginTop: htmlVisual ? "10px" : 0,
                          padding: "12px 14px",
                          background: "#1e1e1e",
                          color: "#d4d4d4",
                          borderRadius: "8px",
                          fontFamily: "monospace",
                          fontSize: "13px",
                        }}
                      >
                        {htmlVisual && (
                          <div style={{ color: "#888", marginBottom: "6px" }}>
                            Console
                          </div>
                        )}
                        {htmlLogs.map((l, i) => (
                          <pre
                            key={i}
                            style={{
                              margin: "0 0 4px",
                              whiteSpace: "pre-wrap",
                              color:
                                l.kind === "error"
                                  ? "#f44336"
                                  : l.kind === "warn"
                                    ? "#ffb300"
                                    : "#d4d4d4",
                            }}
                          >
                            {l.text}
                          </pre>
                        ))}
                      </div>
                    )}
                    {!htmlVisual && htmlLogs.length === 0 && (
                      <p className="ll-out-empty">
                        The code ran. Nothing was printed.
                      </p>
                    )}
                  </>
                ) : (
                  <p className="ll-out-empty">
                    Press Run to preview your HTML here.
                  </p>
                )
              ) : (
                <>
                  {out.lines.length === 0 && !out.error ? (
                    <p className="ll-out-empty">
                      Press Run to see the result here.
                    </p>
                  ) : (
                    out.lines.map((l, i) => (
                      <pre key={i} className={"ll-line is-" + l.kind}>
                        {l.text}
                      </pre>
                    ))
                  )}
                  {out.error && (
                    <pre className="ll-line is-error">{out.error}</pre>
                  )}
                </>
              )}
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
                  className={
                    "ll-dot" +
                    (i === index ? " is-current" : "") +
                    (passed[i] ? " is-done" : "")
                  }
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

        {isTerminal && step.tasks && (
          <div
            style={{
              marginTop: "24px",
              padding: "16px",
              backgroundColor: "rgba(0,0,0,0.03)",
              border: "1px solid rgba(0,0,0,0.1)",
              borderRadius: "8px",
            }}
          >
            <h3 style={{ margin: "0 0 12px 0", fontSize: "16px" }}>Tasks:</h3>
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {step.tasks.map((t, i) => {
                const isDone = i < termTaskIdx;
                const isCurrent = i === termTaskIdx;
                return (
                  <li
                    key={i}
                    style={{
                      padding: "8px 0",
                      color: isDone
                        ? "var(--color-success, #059669)"
                        : isCurrent
                          ? "inherit"
                          : "#888",
                      fontWeight: isCurrent ? "600" : "normal",
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "8px",
                    }}
                  >
                    <span style={{ flexShrink: 0 }}>
                      {isDone ? "✓" : isCurrent ? "👉" : "○"}
                    </span>
                    <span>{t.instruction}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {hint && step.hint && (
          <div className="ll-hint">
            <strong>Hint:</strong> {step.hint}
          </div>
        )}

        <div className="ll-actions">
          {step.hint && !hint && (
            <button
              type="button"
              className="ll-act"
              onClick={() => setHint(true)}
            >
              Show hint
            </button>
          )}
          {!isForm &&
            !isTerminal &&
            step.solution &&
            fails[index] >= SOLUTION_AFTER && (
              <button type="button" className="ll-act" onClick={showSolution}>
                Show solution
              </button>
            )}

          {!isTerminal && (
            <button
              type="button"
              className="ll-act is-primary"
              onClick={check}
              disabled={busy}
            >
              Check my answer
            </button>
          )}

          {passed[index] && index < steps.length - 1 && (
            <button
              type="button"
              className="ll-act"
              onClick={() => go(index + 1)}
            >
              Next step
            </button>
          )}
        </div>

        {msg && (
          <div
            className={"ll-msg is-" + msg.type}
            role="status"
            aria-live="polite"
          >
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