import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { supabase } from "../supabaseclient.js";
import { markLessonComplete } from "../progress.js"; 
import "./ProjectPage.css";

/* ---------- helpers ---------- */
function runChecks(checks, code) {
  const doc = new DOMParser().parseFromString(code, "text/html");
  return checks.map((c) => {
    try {
      const ok = !!new Function("doc", "code", `return (${c.test});`)(doc, code);
      return { ok, fail: c.fail };
    } catch {
      return { ok: false, fail: c.fail };
    }
  });
}

function readJson(key, fallback) {
  try {
    const v = JSON.parse(localStorage.getItem(key));
    return v ?? fallback;
  } catch {
    return fallback;
  }
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
  const guideRef = useRef(null);

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

  const milestones = data?.milestones ?? [];
  const passedCount = useMemo(
    () => milestones.filter((m) => passed[m.id]).length,
    [milestones, passed]
  );
  const current = typeof tab === "number" ? milestones.find((m) => m.id === tab) : null;

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
    const items = runChecks(current.checks, code);
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
      const r = runChecks(m.checks, code);
      nextPassed[m.id] = r.every((i) => i.ok);
      r.filter((i) => !i.ok).forEach((i) =>
        items.push({ ok: false, fail: `Milestone ${m.id}: ${i.fail}` })
      );
    });
    runChecks(data.final_checks, code)
      .filter((i) => !i.ok)
      .forEach((i) => items.push({ ok: false, fail: `Final check: ${i.fail}` }));

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
    if (window.confirm("Reset the editor to the starter code? Your code will be lost.")) {
      setCode(data.starter);
    }
  }

  function showSolution() {
    if (window.confirm("Replace your code with the reference solution? Your code will be lost.")) {
      setCode(data.solution);
    }
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
            <div style={{ width: `${(passedCount / milestones.length) * 100}%` }} />
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
              <span>index.html</span>
              <div className="pp-actions">
                <button type="button" onClick={resetCode}>Reset</button>
                <button type="button" onClick={showSolution}>Show solution</button>
              </div>
            </div>
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={onKeyDown}
              spellCheck={false}
              autoCapitalize="off"
              autoCorrect="off"
              aria-label="HTML code editor"
            />
          </div>
          <div className="pp-pane pp-preview">
            <div className="pp-bar-top">
              <span>Preview</span>
            </div>
            <iframe
              title="Page preview"
              srcDoc={preview}
              sandbox="allow-scripts allow-forms allow-modals"
            />
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
                  Great work. You built a full web page with HTML. This lesson is marked as completed.
                </p>
              </div>
            )}
          </div>

          <div className="pp-foot">
            {current && (
              <button type="button" className="pp-primary" onClick={checkMilestone}>
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
                {finished ? "Completed" : finishing ? "Checking..." : "Finish project"}
              </button>
            )}
            {tab === "start" && (
              <button type="button" className="pp-primary" onClick={() => selectTab(1)}>
                Start milestone 1
              </button>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}