import "./CapstonePage.css";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  SandpackProvider,
  SandpackCodeEditor,
  SandpackFileExplorer,
  SandpackPreview,
  SandpackConsole,
  useSandpack,
} from "@codesandbox/sandpack-react";
import { supabase } from "../supabaseclient.js";
import { markLessonComplete } from "../progress.js";

const THEME = {
  colors: {
    surface1: "#0f1a2e",
    surface2: "#22345a",
    surface3: "#18294a",
    clickable: "#8da2c0",
    base: "#c5d0e2",
    disabled: "#4b5d7d",
    hover: "#ffffff",
    accent: "#6cb2ff",
    error: "#ff9b9b",
    errorSurface: "#3a1c24",
  },
  syntax: {
    plain: "#c5d0e2",
    comment: { color: "#8da2c0", fontStyle: "italic" },
    keyword: "#6cb2ff",
    tag: "#5fe0cf",
    punctuation: "#c5d0e2",
    definition: "#e8dc9b",
    property: "#9ddcff",
    static: "#b5e0a0",
    string: "#f0a77e",
  },
  font: {
    body: "Inter, system-ui, sans-serif",
    mono: "'JetBrains Mono', ui-monospace, monospace",
    size: "13.5px",
    lineHeight: "22px",
  },
};

const storeKey = (id) => "capstone:" + id;
function readStore(id) {
  try {
    const v = JSON.parse(localStorage.getItem(storeKey(id)));
    if (v && typeof v === "object") return v;
  } catch {
    /* ignore */
  }
  return { part: 0, done: [], code: {} };
}
function writeStore(id, data) {
  try {
    localStorage.setItem(storeKey(id), JSON.stringify(data));
  } catch {
    /* ignore */
  }
}

// `kod` yazılışını <code> elementinə çevirir
function rich(text) {
  return String(text || "")
    .split(/(`[^`]+`)/g)
    .map((s, i) =>
      s.startsWith("`") && s.endsWith("`") ? (
        <code key={i}>{s.slice(1, -1)}</code>
      ) : (
        s
      ),
    );
}

function Tick({ size = 12 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12l5 5 9-10" />
    </svg>
  );
}

function matches(pattern, text) {
  try {
    return new RegExp(pattern, "i").test(text);
  } catch {
    return false;
  }
}

// Yoxlama: test = regex mənbəsi (böyük/kiçik hərf fərqi yoxdur), "!" ilə başlasa olmamalıdır
function runChecks(part, files) {
  // Şərhlərdəki (TODO) mətn yoxlamaya düşməsin
  const strip = (t) =>
    String(t).replace(/<!--[\s\S]*?-->/g, "").replace(/\/\*[\s\S]*?\*\//g, "");
  const entries = Object.entries(files).map(([p, f]) => [p, { code: strip(f.code) }]);
  const result = {};
  for (const task of part.tasks) {
    let fail = null;
    for (const c of task.checks || []) {
      const src = c.file
        ? entries.filter(([p]) => p.endsWith(c.file)).map(([, f]) => f.code).join("\n")
        : entries.map(([, f]) => f.code).join("\n");
      const neg = c.test.startsWith("!");
      const hit = matches(neg ? c.test.slice(1) : c.test, src);
      if (neg ? hit : !hit) {
        fail = c.fail;
        break;
      }
    }
    result[task.id] = fail ? { ok: false, fail } : { ok: true };
  }
  return result;
}

function Workspace({ lessonId, title, data, store, setStore, onReset }) {
  const navigate = useNavigate();
  const { sandpack } = useSandpack();
  const parts = data.parts;
  const partIdx = Math.min(store.part, parts.length - 1);
  const part = parts[partIdx];
  const [results, setResults] = useState(null);
  const [tab, setTab] = useState("preview");
  const [saving, setSaving] = useState(false);
  const timer = useRef(null);

  const allDone =
    parts.length >= (data.total || parts.length) &&
    parts.every((_, i) => store.done.includes(i));
  const partDone = store.done.includes(partIdx);
  const passedCount = results
    ? part.tasks.filter((t) => results[t.id]?.ok).length
    : partDone
      ? part.tasks.length
      : 0;
  const firstFail = results ? part.tasks.map((t) => results[t.id]).find((r) => r && !r.ok) : null;

  // Kod dəyişəndə 600ms sonra yadda saxla
  useEffect(() => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setStore((s) => {
        const next = { ...s, code: { ...s.code, [partIdx]: sandpack.files } };
        writeStore(lessonId, next);
        return next;
      });
    }, 600);
    return () => clearTimeout(timer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sandpack.files]);

  function check() {
    const r = runChecks(part, sandpack.files);
    setResults(r);
    if (part.tasks.every((t) => r[t.id].ok) && !store.done.includes(partIdx)) {
      setStore((s) => {
        const next = { ...s, done: [...s.done, partIdx] };
        writeStore(lessonId, next);
        return next;
      });
    }
  }

  function goTo(i) {
    setStore((s) => {
      const next = { ...s, part: i };
      writeStore(lessonId, next);
      return next;
    });
  }

  async function submit() {
    setSaving(true);
    const ok = await markLessonComplete(lessonId);
    setSaving(false);
    if (ok) navigate("/lessons");
  }

  const canOpen = (i) => i <= partIdx || store.done.includes(i - 1) || store.done.includes(i);

  return (
    <div className="cp-shell">
      <header className="cp-top">
        <Link to="/lessons" className="cp-logo">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#6cb2ff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M8 7l-5 5 5 5M16 7l5 5-5 5" /></svg>
          DevUp
        </Link>
        <nav className="cp-crumb" aria-label="Breadcrumb">
          <Link to="/lessons">Lessons</Link>
          <span aria-hidden="true">/</span>
          <span className="cp-crumb-now">{title}</span>
        </nav>
        <div className="cp-actions">
          <button type="button" className="cp-btn is-dark" onClick={() => { if (window.confirm("Reset the code of this part to its starting version?")) { setResults(null); onReset(partIdx); } }}>Reset</button>
          <button type="button" className="cp-btn is-primary" onClick={() => { sandpack.runSandpack(); setTab("preview"); }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6 4l14 8-14 8z" /></svg>
            Run
          </button>
          <button type="button" className="cp-btn" disabled={!allDone || saving} onClick={submit}>Submit project</button>
        </div>
      </header>

      <main className="cp-main">
        <section className="cp-left" aria-label="Code editor">
          <div className="cp-editor">
            <div className="cp-files"><div className="cp-files-h">FILES</div><SandpackFileExplorer /></div>
            <div className="cp-code"><SandpackCodeEditor showTabs showLineNumbers showInlineErrors closableTabs={false} style={{ height: "100%" }} /></div>
          </div>
          <div className="cp-out">
            <div className="cp-out-tabs" role="tablist">
              {["preview", "console"].map((t) => (
                <button key={t} type="button" role="tab" aria-selected={tab === t} className={"cp-out-tab" + (tab === t ? " is-on" : "")} onClick={() => setTab(t)}>
                  {t === "preview" ? "Preview" : "Console"}
                </button>
              ))}
            </div>
            <div className="cp-out-body" style={{ display: tab === "preview" ? "block" : "none" }}>
              <SandpackPreview showNavigator showOpenInCodeSandbox={false} showRefreshButton style={{ height: "100%" }} />
            </div>
            <div className="cp-out-body" style={{ display: tab === "console" ? "block" : "none" }}>
              <SandpackConsole style={{ height: "100%" }} />
            </div>
          </div>
        </section>

        <aside className="cp-right" aria-label="Instructions">
          <div className="cp-card">
            <div className="cp-card-h">
              <span className="cp-label">PROJECT PARTS</span>
              <span className="cp-muted">{store.done.length} of {parts.length} done</span>
            </div>
            <div className="cp-steps">
              {parts.map((p, i) => {
                const d = store.done.includes(i);
                const cur = i === partIdx;
                return (
                  <button key={i} type="button" disabled={!canOpen(i)} onClick={() => { setResults(null); goTo(i); }} aria-current={cur ? "step" : undefined} className={"cp-step" + (d ? " is-done" : "") + (cur ? " is-cur" : "")}>
                    <span className="cp-dot">{d ? <Tick /> : i + 1}</span>
                    {p.short}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="cp-card cp-part">
            <div>
              <span className="cp-chip">Part {partIdx + 1} · Unit: {part.unit}</span>
              <h2>{part.title}</h2>
              <p>{rich(part.intro)}</p>
            </div>

            <div>
              <div className="cp-label">YOUR TASKS</div>
              <ul className="cp-tasks">
                {part.tasks.map((t) => {
                  const ok = results ? results[t.id]?.ok : partDone;
                  return (
                    <li key={t.id} className="cp-task">
                      <span className={"cp-box" + (ok ? " is-ok" : "")}>{ok && <Tick />}</span>
                      <span>{rich(t.text)}</span>
                    </li>
                  );
                })}
              </ul>
            </div>

            {part.hint && (
              <details className="cp-hint">
                <summary>Need a hint?</summary>
                <div>{rich(part.hint)}</div>
              </details>
            )}

            {results && (
              <div className={"cp-result" + (firstFail ? " is-bad" : " is-good")} role="status">
                <strong>{passedCount} of {part.tasks.length} checks passed.</strong>
                {firstFail ? <><br />{rich(firstFail.fail)}</> : <><br />Great work. You can move to the next part.</>}
              </div>
            )}

            <div className="cp-nav">
              <button type="button" className="cp-btn is-primary is-block" onClick={check}>
                <Tick size={16} />
                Check my work
              </button>
              <div className="cp-nav-row">
                <button type="button" className="cp-btn is-block" disabled={partIdx === 0} onClick={() => { setResults(null); goTo(partIdx - 1); }}>Previous part</button>
                <button type="button" className="cp-btn is-block" disabled={!partDone || partIdx === parts.length - 1} onClick={() => { setResults(null); goTo(partIdx + 1); }}>Next part</button>
              </div>
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}

function CapstoneInner({ id }) {
  const [state, setState] = useState({ loading: true, lesson: null, data: null });
  const [store, setStore] = useState(() => readStore(id));
  const [resetKey, setResetKey] = useState(0);

  function onReset(i) {
    setStore((s) => {
      const code = { ...s.code };
      delete code[i];
      const next = { ...s, code };
      writeStore(id, next);
      return next;
    });
    setResetKey((k) => k + 1);
  }

  useEffect(() => {
    let off = false;
    Promise.all([
      supabase.from("lessons").select("*").eq("id", id).maybeSingle(),
      supabase.from("lesson_content").select("lab_data").eq("lesson_id", id).maybeSingle(),
    ]).then(([l, c]) => {
      if (off) return;
      setState({ loading: false, lesson: l.data, data: c.data?.lab_data || null });
    });
    return () => { off = true; };
  }, [id]);

  const parts = state.data?.parts;
  const partIdx = parts ? Math.min(store.part, parts.length - 1) : 0;
  const part = parts ? parts[partIdx] : null;

  const files = useMemo(() => {
    if (!part) return null;
    return store.code[partIdx] || part.files;
    // faylları yalnız hissə dəyişəndə götür (yazarkən təkrar başlatma olmasın)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [part, partIdx, resetKey]);

  const current = useMemo(() => {
    if (!files) return null;
    const out = {};
    Object.entries(files).forEach(([p, f]) => {
      out[p] = { code: typeof f === "string" ? f : f.code };
    });
    return out;
  }, [files]);

  const options = useMemo(
    () =>
      part
        ? {
            visibleFiles: Object.keys(part.files),
            activeFile: part.active || Object.keys(part.files)[0],
            recompileMode: "delayed",
            recompileDelay: 600,
          }
        : null,
    [part],
  );

  if (state.loading) return <div className="cp-center">Loading...</div>;
  if (!state.lesson || !parts || !parts.length || !part)
    return (
      <div className="cp-center">
        <p>This project is not ready yet.</p>
        <Link to="/lessons" className="cp-btn is-primary">Back to lessons</Link>
      </div>
    );

  return (
    <SandpackProvider
      key={id + "-" + partIdx + "-" + resetKey}
      template={part.template || "static"}
      theme={THEME}
      files={current}
      options={options}
      customSetup={part.deps ? { dependencies: part.deps } : undefined}
    >
      <Workspace lessonId={id} title={nameOf(state.lesson)} data={state.data} store={store} setStore={setStore} onReset={onReset} />
    </SandpackProvider>
  );
}

function nameOf(row) {
  return row?.title || row?.name || "Building the Project";
}

export default function CapstonePage() {
  const { id } = useParams();
  return <CapstoneInner key={id} id={id} />;
}