import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { supabase } from "../supabaseclient.js";
import { markLessonComplete } from "../progress.js";
import "./ProjectPage.css";
import PhonePreview from "../components/PhonePreview.jsx";

/* ---------- helpers ---------- */
const QUIET = { log() {}, info() {}, warn() {}, error() {} };

/* GitHub OAuth App "DevUp Repos" Client ID (public, not the secret) */
const GITHUB_CLIENT_ID = "BURA_CLIENT_ID_YAZ";
const GH_KEY = "devup-github-oauth";

function readGithubCallback(lessonId) {
  try {
    const p = new URLSearchParams(window.location.search);
    const c = p.get("code");
    const st = p.get("state");
    const saved = JSON.parse(sessionStorage.getItem(GH_KEY) || "null");
    if (
      c &&
      st &&
      saved &&
      saved.state === st &&
      String(saved.lessonId) === String(lessonId)
    )
      return c;
  } catch {
    /* ignore */
  }
  return null;
}

async function githubError(error) {
  try {
    const body = await error.context.json();
    if (body?.error) return body.error;
  } catch {
    /* ignore */
  }
  return "Could not upload to GitHub. Try again.";
}

function repoSlug(text) {
  return (
    String(text || "")
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "devup-project"
  );
}

/* runtime = true: the learner's code is executed and each test runs next to it.
   runtime = false: the test only reads the code text (regex checks). */
function runChecks(checks, code, runtime) {
  if (runtime) {
    try {
      new Function("doc", "code", "console", code);
    } catch (e) {
      return [
        { ok: false, fail: `Your code has a syntax error: ${e.message}` },
      ];
    }
    return checks.map((c) => {
      try {
        const ok = !!new Function(
          "doc",
          "code",
          "console",
          `${code}\n;return (${c.test});`,
        )(null, code, QUIET);
        return { ok, fail: c.fail };
      } catch {
        return { ok: false, fail: c.fail };
      }
    });
  }
  const doc = new DOMParser().parseFromString(code, "text/html");
  const { css, prop, has } = cssTools(doc);
  return checks.map((c) => {
    try {
      const ok = !!new Function(
        "doc",
        "code",
        "css",
        "prop",
        "has",
        `return (${c.test});`,
      )(doc, code, css, prop, has);
      return { ok, fail: c.fail };
    } catch {
      return { ok: false, fail: c.fail };
    }
  });
}

/* CSS projects: css = all <style> text, has(sel) = a rule with this exact selector exists,
   prop(sel, name) = last value written for that property in rules with this selector (or null) */
function cssTools(doc) {
  const css = [...doc.querySelectorAll("style")]
    .map((n) => n.textContent)
    .join("\n");
  const clean = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const rules = [];
  const re = /([^{}]+)\{([^{}]*)\}/g;
  let m;
  while ((m = re.exec(clean))) {
    const selectors = m[1]
      .split(",")
      .map((x) => x.trim().replace(/\s+/g, " "))
      .filter((x) => x && !x.startsWith("@"));
    if (selectors.length) rules.push({ selectors, body: m[2] });
  }
  const norm = (x) => String(x).trim().replace(/\s+/g, " ");
  const has = (sel) => rules.some((r) => r.selectors.includes(norm(sel)));
  const prop = (sel, name) => {
    let value = null;
    rules.forEach((r) => {
      if (!r.selectors.includes(norm(sel))) return;
      r.body.split(";").forEach((d) => {
        const i = d.indexOf(":");
        if (
          i > 0 &&
          d.slice(0, i).trim().toLowerCase() === name.toLowerCase()
        ) {
          value = d
            .slice(i + 1)
            .replace(/!important/i, "")
            .trim();
        }
      });
    });
    return value;
  };
  return { css, prop, has };
}

function readJson(key, fallback) {
  try {
    const v = JSON.parse(localStorage.getItem(key));
    return v ?? fallback;
  } catch {
    return fallback;
  }
}

const CLOSE = "</" + "script>";

function hashOf(text) {
  let h = 5381;
  for (let i = 0; i < text.length; i++)
    h = ((h << 5) + h + text.charCodeAt(i)) | 0;
  return String(h);
}

function buildRunner(code, runId) {
  const safe = code.split("</script").join("<\\/script");
  const bridge =
    "(function(){" +
    "function send(type,args){" +
    "var t=args.map(function(a){" +
    "if(typeof a==='string')return a;" +
    "try{return JSON.stringify(a,null,2)}catch(e){return String(a)}" +
    "}).join(' ');" +
    "parent.postMessage({__pp:1,run:'" +
    runId +
    "',type:type,text:t},'*');}" +
    "['log','info','warn','error'].forEach(function(k){" +
    "console[k]=function(){send(k,[].slice.call(arguments))};});" +
    "window.addEventListener('error',function(e){send('error',[e.message])});" +
    "window.addEventListener('unhandledrejection',function(e){" +
    "send('error',['Unhandled: '+(e.reason&&e.reason.message||e.reason)])});" +
    "})();";
  return (
    "<!doctype html><html><body><script>" +
    bridge +
    CLOSE +
    '<script type="module">\n' +
    safe +
    "\n" +
    CLOSE +
    "</body></html>"
  );
}

function Guide({ text }) {
  return (
    <div className="pp-md">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
    </div>
  );
}

/* ---------- page ---------- */
export default function ProjectPage() {
  const { lessonId } = useParams();
  const navigate = useNavigate();
  const codeKey = `dp-code-${lessonId}`;
  const passKey = `dp-passed-${lessonId}`;
  const doneKey = `dp-done-${lessonId}`;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [code, setCode] = useState("");
  const [preview, setPreview] = useState("");
  const [tab, setTab] = useState("start"); // "start" | number | "finish"
  const [view, setView] = useState("guide"); // mobile: guide | code | preview
  const [passed, setPassed] = useState({});
  const [results, setResults] = useState(null); // { title, items }
  const [finishing, setFinishing] = useState(false);
  const [finished, setFinished] = useState(false);
  const [ghCode] = useState(() => readGithubCallback(lessonId));
  const [gh, setGh] = useState({
    status: ghCode ? "pushing" : "idle",
    url: "",
    message: "",
  });
  const ghStarted = useRef(false);
  const guideRef = useRef(null);
  const frameRef = useRef(null);
  const [logState, setLogState] = useState({ key: "", items: [] });

  /* load project */
  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      const { data: row, error: err } = await supabase
        .from("lesson_content")
        .select("lab_data")
        .eq("lesson_id", lessonId)
        .maybeSingle();
      if (!alive) return;
      if (err || !row?.lab_data || row.lab_data.type !== "project") {
        setError("This project could not be loaded.");
      } else {
        setData(row.lab_data);
        setCode(localStorage.getItem(codeKey) ?? row.lab_data.starter);
        setPassed(readJson(passKey, {}));
        setFinished(localStorage.getItem(doneKey) === "1");
      }
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [lessonId]); // eslint-disable-line

  /* save code + debounced preview */
  useEffect(() => {
    if (!data) return;
    localStorage.setItem(codeKey, code);
    const t = setTimeout(() => setPreview(code), 600);
    return () => clearTimeout(t);
  }, [code, data]); // eslint-disable-line

  /* console messages coming from the sandboxed runner */
  useEffect(() => {
    function onMsg(e) {
      if (!frameRef.current || e.source !== frameRef.current.contentWindow)
        return;
      const d = e.data;
      if (d && d.__pp) {
        const key = String(d.run);
        setLogState((st) => {
          const prev = st.key === key ? st.items : [];
          return {
            key,
            items: [...prev, { type: d.type, text: d.text }].slice(-200),
          };
        });
      }
    }
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, []);

  const runId = hashOf(preview);
  const runner = useMemo(
    () =>
      data?.run === true && data?.language && data.language !== "html"
        ? buildRunner(preview, runId)
        : "",
    [preview, runId, data],
  );
  const logs = logState.key === runId ? logState.items : [];

  const milestones = data?.milestones ?? [];
  const language = data?.language || "html";
  const isHtml = language === "html";
  const canRun = !isHtml && data?.run === true;
  const fileName = data?.filename || "index.html";
  const phoneKind =
    data?.preview === "snack" || data?.preview === "dartpad"
      ? data.preview
      : "";
  const passedCount = useMemo(
    () => milestones.filter((m) => passed[m.id]).length,
    [milestones, passed],
  );
  const current =
    typeof tab === "number" ? milestones.find((m) => m.id === tab) : null;

  function selectTab(t) {
    setTab(t);
    setResults(null);
    if (guideRef.current) guideRef.current.scrollTop = 0;
  }

  function onKeyDown(e) {
    if (e.key === "Tab") {
      e.preventDefault();
      const el = e.target;
      const { selectionStart: s, selectionEnd: en } = el;
      const next = code.slice(0, s) + "  " + code.slice(en);
      setCode(next);
      requestAnimationFrame(() => {
        el.selectionStart = el.selectionEnd = s + 2;
      });
    }
  }

  function checkMilestone() {
    if (!current) return;
    const items = runChecks(current.checks, code, canRun);
    const ok = items.every((i) => i.ok);
    setResults({ title: `Milestone ${current.id}`, items, ok });
    if (ok) {
      const next = { ...passed, [current.id]: true };
      setPassed(next);
      localStorage.setItem(passKey, JSON.stringify(next));
    }
  }

  async function finishProject() {
    setFinishing(true);
    const items = [];
    const nextPassed = {};
    milestones.forEach((m) => {
      const r = runChecks(m.checks, code, canRun);
      nextPassed[m.id] = r.every((i) => i.ok);
      r.filter((i) => !i.ok).forEach((i) =>
        items.push({ ok: false, fail: `Milestone ${m.id}: ${i.fail}` }),
      );
    });
    runChecks(data.final_checks, code, canRun)
      .filter((i) => !i.ok)
      .forEach((i) =>
        items.push({ ok: false, fail: `Final check: ${i.fail}` }),
      );

    setPassed(nextPassed);
    localStorage.setItem(passKey, JSON.stringify(nextPassed));

    if (items.length) {
      setResults({ title: "Not finished yet", items, ok: false });
      setFinishing(false);
      return;
    }
    try {
      const list = readJson("lp-quiz-passed", []);
      const id = `lab:${lessonId}`;
      if (Array.isArray(list) && !list.includes(id)) {
        localStorage.setItem("lp-quiz-passed", JSON.stringify([...list, id]));
      }
      await markLessonComplete(lessonId);
    } catch (e) {
      console.error("finishProject error:", e);
    }
    localStorage.setItem(doneKey, "1");
    setFinished(true);
    setResults(null);
    setFinishing(false);
  }

  function resetCode() {
    if (
      window.confirm(
        "Reset the editor to the starter code? Your code will be lost.",
      )
    ) {
      setCode(data.starter);
    }
  }

  function showSolution() {
    if (
      window.confirm(
        "Replace your code with the reference solution? Your code will be lost.",
      )
    ) {
      setCode(data.solution);
    }
  }

  // Kodu fayl kimi endirir
  function downloadCode() {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([code], { type: "text/plain" }));
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  // GitHub-a göndəriləcək fayllar
  function buildFiles() {
    const name = String(fileName).replace(/[^\w.@-]+/g, "-") || "index.html";
    return {
      [name]: code,
      "README.md": `# ${data.title}\n\nBuilt on DevUp.\n`,
    };
  }
  const buildFilesRef = useRef(buildFiles);
  useEffect(() => {
    buildFilesRef.current = buildFiles;
  });

  // Əvvəl göndərilibsə "View on GitHub" linki göstər
  useEffect(() => {
    let off = false;
    async function load() {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth?.user) return;
      const { data: sub } = await supabase
        .from("project_submissions")
        .select("repo_url")
        .eq("user_id", auth.user.id)
        .eq("lesson_id", lessonId)
        .maybeSingle();
      if (!off && sub?.repo_url) {
        setGh((g) =>
          g.status === "idle"
            ? { status: "done", url: sub.repo_url, message: "" }
            : { ...g, url: sub.repo_url },
        );
      }
    }
    load();
    return () => {
      off = true;
    };
  }, [lessonId]);

  // GitHub-dan qayıdanda kodu göndər (layihə yüklənəndən sonra)
  useEffect(() => {
    if (!ghCode || !data || ghStarted.current) return;
    ghStarted.current = true;
    sessionStorage.removeItem(GH_KEY);
    window.history.replaceState({}, "", window.location.pathname);
    async function push() {
      const { data: res, error: err } = await supabase.functions.invoke(
        "github-push",
        {
          body: {
            code: ghCode,
            clientId: GITHUB_CLIENT_ID,
            lessonId,
            repoName: repoSlug(data.title),
            description: data.title + " (built on DevUp)",
            files: buildFilesRef.current(),
          },
        },
      );
      if (err || !res?.url) {
        const message = err
          ? await githubError(err)
          : res?.error || "Could not upload to GitHub.";
        setGh((g) => ({ ...g, status: "error", message }));
        return;
      }
      setGh({
        status: "done",
        url: res.url,
        message: res.created ? "Repository created!" : "Repository updated!",
      });
    }
    push();
  }, [ghCode, data, lessonId]);

  function startGithub() {
    const state = crypto.randomUUID();
    sessionStorage.setItem(GH_KEY, JSON.stringify({ state, lessonId }));
    window.location.href =
      "https://github.com/login/oauth/authorize" +
      "?client_id=" +
      encodeURIComponent(GITHUB_CLIENT_ID) +
      "&scope=public_repo" +
      "&state=" +
      state +
      "&redirect_uri=" +
      encodeURIComponent(window.location.origin + window.location.pathname);
  }

  if (loading) return <div className="pp-state">Loading project...</div>;
  if (error) return <div className="pp-state">{error}</div>;

  return (
    <div className="pp">
      {/* top bar */}
      <header className="pp-top">
        <button type="button" className="pp-back" onClick={() => navigate(-1)}>
          &larr; Back
        </button>
        <div className="pp-title">
          <span className="pp-tag">Unit project</span>
          <h1>{data.title}</h1>
        </div>
        <div className="pp-prog" aria-label="Progress">
          <div className="pp-bar">
            <div
              style={{ width: `${(passedCount / milestones.length) * 100}%` }}
            />
          </div>
          <span>
            {passedCount}/{milestones.length}
          </span>
        </div>
      </header>

      {/* mobile switch */}
      <nav className="pp-switch" aria-label="Panels">
        {[
          ["guide", "Guide"],
          ["code", "Code"],
          ["preview", "Preview"],
        ].map(([k, l]) => (
          <button
            key={k}
            type="button"
            className={view === k ? "on" : ""}
            onClick={() => setView(k)}
          >
            {l}
          </button>
        ))}
      </nav>

      <div className={`pp-body view-${view}`}>
        {/* LEFT: code + preview */}
        <section className="pp-left">
          <div className="pp-pane pp-editor">
            <div className="pp-bar-top">
              <span>{fileName}</span>
              <div className="pp-actions">
                <button type="button" onClick={resetCode}>
                  Reset
                </button>
                <button type="button" onClick={showSolution}>
                  Show solution
                </button>
                {finished && (
                  <button type="button" onClick={downloadCode}>
                    Download
                  </button>
                )}
                {finished && gh.status === "pushing" && (
                  <button type="button" disabled>
                    Pushing…
                  </button>
                )}
                {finished && gh.status !== "pushing" && (
                  <>
                    {gh.status === "done" && gh.url && (
                      <button
                        type="button"
                        onClick={() =>
                          window.open(gh.url, "_blank", "noopener")
                        }
                      >
                        View on GitHub ↗
                      </button>
                    )}
                    <button type="button" onClick={startGithub}>
                      {gh.status === "done" ? "Update GitHub" : "Add to GitHub"}
                    </button>
                  </>
                )}
              </div>
            </div>
            {finished && gh.message && (
              <div
                role={gh.status === "error" ? "alert" : "status"}
                style={{
                  padding: "6px 12px",
                  fontSize: 13,
                  color: gh.status === "error" ? "#ff9b9b" : "#7be0a3",
                }}
              >
                {gh.message}
              </div>
            )}
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={onKeyDown}
              spellCheck={false}
              autoCapitalize="off"
              autoCorrect="off"
              aria-label="Code editor"
            />
          </div>
          <div className="pp-pane pp-preview">
            <div className="pp-bar-top">
              <span>
                {isHtml
                  ? "Preview"
                  : phoneKind
                    ? "Phone preview"
                    : canRun
                      ? "Console"
                      : "Output"}
              </span>
            </div>
            {isHtml && (
              <iframe
                title="Page preview"
                srcDoc={preview}
                sandbox="allow-scripts allow-forms allow-modals"
              />
            )}
            {canRun && (
              <>
                <iframe
                  ref={frameRef}
                  title="Code runner"
                  srcDoc={runner}
                  sandbox="allow-scripts"
                  style={{ display: "none" }}
                />
                <pre className="pp-console">
                  {logs.length === 0
                    ? "Your console.log output appears here."
                    : logs.map((l, i) => (
                        <div key={i} className={`pp-log ${l.type}`}>
                          {l.text}
                        </div>
                      ))}
                </pre>
              </>
            )}
            {phoneKind && <PhonePreview kind={phoneKind} code={preview} />}
            {!isHtml && !canRun && !phoneKind && (
              <div className="pp-console pp-note">
                This project is server-side code, so there is no live preview.
                Write your code in the editor and press{" "}
                <strong>Check milestone</strong> to verify it.
              </div>
            )}
          </div>
        </section>

        {/* RIGHT: guide */}
        <aside className="pp-right">
          <div className="pp-tabs" role="tablist">
            <button
              role="tab"
              type="button"
              className={tab === "start" ? "on" : ""}
              onClick={() => selectTab("start")}
            >
              Start
            </button>
            {milestones.map((m) => (
              <button
                key={m.id}
                role="tab"
                type="button"
                className={`${tab === m.id ? "on" : ""} ${passed[m.id] ? "ok" : ""}`}
                onClick={() => selectTab(m.id)}
                title={m.title}
              >
                {m.id}
              </button>
            ))}
            <button
              role="tab"
              type="button"
              className={tab === "finish" ? "on" : ""}
              onClick={() => selectTab("finish")}
            >
              Finish
            </button>
          </div>

          <div className="pp-guide" ref={guideRef}>
            {tab === "start" && <Guide text={data.overview} />}

            {current && (
              <>
                <p className="pp-ms-name">
                  Milestone {current.id}: {current.title}
                </p>
                <Guide text={current.text} />
              </>
            )}

            {tab === "finish" && (
              <>
                <Guide text={data.finish_text} />
                <ul className="pp-status">
                  {milestones.map((m) => (
                    <li key={m.id} className={passed[m.id] ? "ok" : ""}>
                      <span>{passed[m.id] ? "Passed" : "Not passed"}</span>
                      Milestone {m.id}: {m.title}
                    </li>
                  ))}
                </ul>
              </>
            )}

            {results && (
              <div className={`pp-results ${results.ok ? "good" : "bad"}`}>
                <strong>
                  {results.ok
                    ? `${results.title} passed`
                    : `${results.title}: ${results.items.filter((i) => !i.ok).length} to fix`}
                </strong>
                <ul>
                  {results.items
                    .filter((i) => !i.ok)
                    .map((i, idx) => (
                      <li key={idx}>{i.fail}</li>
                    ))}
                </ul>
              </div>
            )}

            {finished && tab === "finish" && (
              <div className="pp-results good">
                <strong>Project complete</strong>
                <p>
                  Great work.{" "}
                  {data.done_text || "You built a full web page with HTML."}{" "}
                  This lesson is marked as completed.
                </p>
              </div>
            )}
          </div>

          <div className="pp-foot">
            {current && (
              <button
                type="button"
                className="pp-primary"
                onClick={checkMilestone}
              >
                Check milestone {current.id}
              </button>
            )}
            {tab === "finish" && (
              <button
                type="button"
                className="pp-primary"
                onClick={finishProject}
                disabled={finishing || finished}
              >
                {finished
                  ? "Completed"
                  : finishing
                    ? "Checking..."
                    : "Finish project"}
              </button>
            )}
            {tab === "start" && (
              <button
                type="button"
                className="pp-primary"
                onClick={() => selectTab(1)}
              >
                Start milestone 1
              </button>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
