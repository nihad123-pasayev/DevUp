import "./LessonContent.css";
import { useEffect, useId, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import EditorImport from "react-simple-code-editor";
import Prism from "prismjs";

// Bu paket köhnə (CommonJS) formatdadır; bəzi Vite versiyalarında komponent .default içində gəlir
const Editor = EditorImport.default ?? EditorImport;

// Kod bu qədər işləyəndən sonra donub-donmadığını yoxlayırıq
const CHECK_AFTER_MS = 3000;
const REPLY_WAIT_MS = 1000;
// Worker bu qədər vaxtdan sonra özü bağlanır
const MAX_LIFETIME_MS = 30000;

// Worker-in içində console.log-u tutub nəticəni səhifəyə göndərən kiçik başlanğıc kodu
const WORKER_BOOT = `(function () {
  function fmt(v) {
    if (typeof v === "string") return v;
    if (v instanceof Error) return v.name + ": " + v.message;
    if (typeof v === "undefined") return "undefined";
    if (typeof v === "function") return String(v);
    try {
      var s = JSON.stringify(v, null, 2);
      return s === undefined ? String(v) : s;
    } catch (e) {
      return String(v);
    }
  }
  function send(kind, args) {
    postMessage({ kind: kind, text: Array.prototype.map.call(args, fmt).join(" ") });
  }
  console.log = function () { send("log", arguments); };
  console.info = console.log;
  console.debug = console.log;
  console.warn = function () { send("warn", arguments); };
  console.error = function () { send("error", arguments); };
  self.addEventListener("message", function (e) {
    if (e.data === "ping") postMessage({ kind: "pong" });
  });
  self.addEventListener("unhandledrejection", function (e) {
    send("error", ["Uncaught (in promise)", e.reason]);
  });
})();
`;

// srcdoc içində "#bölmə" linkləri səhifənin özünü yükləyir; onları əllə həmin bölməyə sürüşdürürük
const FRAGMENT_FIX = `
<script>
document.addEventListener("click", function (e) {
  var a = e.target.closest && e.target.closest("a[href^='#']");
  if (!a) return;
  e.preventDefault();
  var id = decodeURIComponent(a.getAttribute("href").slice(1));
  var el = id ? document.getElementById(id) : document.body;
  if (el) el.scrollIntoView();
});
</script>`;

const LANG_LABEL = { javascript: "JavaScript", html: "HTML" };

function escapeHtml(text) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function highlight(code, lang) {
  const name = lang === "html" ? "markup" : lang;
  const grammar = Prism.languages[name];
  if (!grammar) return escapeHtml(code);
  return Prism.highlight(code, grammar, name);
}

function StaticCode({ lang, code }) {
  return (
    <div className="lc-static">
      <pre tabIndex={0}>
        <code dangerouslySetInnerHTML={{ __html: highlight(code, lang) }} />
      </pre>
    </div>
  );
}

function Playground({ lang, initial }) {
  const isHtml = lang === "html";
  const [code, setCode] = useState(initial);
  const [lines, setLines] = useState([]);
  const [preview, setPreview] = useState(initial);
  const id = useId();
  const workerRef = useRef(null);
  const urlRef = useRef(null);
  const timersRef = useRef([]);

  function stop() {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
    }
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    }
  }

  
  useEffect(() => () => stop(), []);

  function addLine(line) {
    setLines((prev) => [...prev, line]);
  }

  function runJs() {
    stop();
    setLines([]);

    let worker;
    try {
      const blob = new Blob([WORKER_BOOT + "\n" + code], { type: "text/javascript" });
      urlRef.current = URL.createObjectURL(blob);
      worker = new Worker(urlRef.current);
    } catch {
      addLine({ kind: "error", text: "This browser cannot run the code here." });
      return;
    }
    workerRef.current = worker;

    let watchdog = 0;
    worker.onmessage = (e) => {
      const msg = e.data;
      if (msg.kind === "pong") {
        clearTimeout(watchdog);
        return;
      }
      addLine(msg);
    };
    worker.onerror = (e) => {
      e.preventDefault();
      addLine({ kind: "error", text: e.message || "Something went wrong." });
      stop();
    };

    timersRef.current.push(
      setTimeout(() => {
        worker.postMessage("ping");
        watchdog = setTimeout(() => {
          addLine({
            kind: "error",
            text: "Stopped: the code ran for too long. Check for a loop that never ends.",
          });
          stop();
        }, REPLY_WAIT_MS);
        timersRef.current.push(watchdog);
      }, CHECK_AFTER_MS),
    );
    timersRef.current.push(setTimeout(stop, MAX_LIFETIME_MS));
  }

  function run() {
    if (isHtml) setPreview(code);
    else runJs();
  }

  function reset() {
    stop();
    setCode(initial);
    setPreview(initial);
    setLines([]);
  }

  return (
    <div className="lc-play">
      <div className="lc-play-bar">
        <span className="lc-play-lang">{LANG_LABEL[lang] || lang}</span>
        <div className="lc-play-actions">
          <button type="button" className="lc-btn" onClick={reset}>
            Reset
          </button>
          <button type="button" className="lc-btn is-run" onClick={run}>
            <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
              <path d="M8 5v14l11-7z" fill="currentColor" />
            </svg>
            Run
          </button>
        </div>
      </div>

      <label className="lc-sr" htmlFor={id}>
        Code editor. Press Escape and then Tab to leave the editor.
      </label>
      <div className="lc-play-editor">
        <Editor
          textareaId={id}
          value={code}
          onValueChange={setCode}
          highlight={(c) => highlight(c, lang)}
          padding={16}
          tabSize={2}
          textareaClassName="lc-textarea"
          style={{
            fontFamily: '"JetBrains Mono", ui-monospace, Menlo, Consolas, monospace',
            fontSize: 14,
            lineHeight: 1.7,
          }}
        />
      </div>

      {isHtml ? (
        <iframe
          className="lc-preview"
          title="Result"
          sandbox="allow-scripts allow-forms"
          srcDoc={preview + FRAGMENT_FIX}
        />
      ) : (
        <div className="lc-out" tabIndex={0} role="log" aria-label="Output">
          <span className="lc-out-label">Output</span>
          {lines.length === 0 ? (
            <p className="lc-out-empty">Press Run to see the result here.</p>
          ) : (
            lines.map((l, i) => (
              <pre key={i} className={"lc-line is-" + l.kind}>
                {l.text}
              </pre>
            ))
          )}
        </div>
      )}
    </div>
  );
}

const components = {
  pre: ({ children }) => <>{children}</>,
  code({ node, className, children }) {
    const text = String(children);
    const match = /language-(\w+)/.exec(className || "");

    if (!match && !text.includes("\n")) {
      return <code className="lc-inline">{children}</code>;
    }

    const lang = match ? match[1] : "text";
    const code = text.replace(/\n$/, "");
    const playable = node?.data?.meta === "playground" && (lang === "javascript" || lang === "html");

    if (playable) return <Playground lang={lang} initial={code} />;
    return <StaticCode lang={lang} code={code} />;
  },
  table: ({ children }) => (
    <div className="lc-table">
      <table>{children}</table>
    </div>
  ),
  // Video iframe-lərini tam çərçivəyə oturdan yeni render qaydası:
  // Video iframe-lərini tam çərçivəyə oturdan yenilənmiş render qaydası:
  iframe: ({ className, ...props }) => {
    // Playground içindəki preview iframe-lərinə toxunmuruq
    if (className === "lc-preview") {
      return <iframe className={className} {...props} />;
    }

    return (
      <div className="lc-video-container">
        <iframe className={className} {...props} />
      </div>
    );
  },
};

// "[CODE_PLAYGROUND]" + kod bloku -> interaktiv blok
function prepare(text) {
  return text.replace(/\[CODE_PLAYGROUND\]\s*\n```(\w+)/g, "```$1 playground");
}

export default function LessonContent({ text }) {
  return (
    <div className="lc">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {prepare(text || "")}
      </ReactMarkdown>
    </div>
  );
}