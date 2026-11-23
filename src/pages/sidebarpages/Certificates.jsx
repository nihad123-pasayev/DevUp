import "@fontsource/fraunces/400.css";
import "@fontsource/fraunces/400-italic.css";
import "./Certificates.css";
import { useEffect, useRef, useState } from "react";
import Sidebar from "../Sidebar";
import { supabase } from "/src/supabaseclient.js";

const ORG = "DevUp";
const PAPER_W = 1000;
const PAPER_H = 707;

// Roadmap-in sertifikatda görünən adı
function displayName(rm) {
  const f = rm?.field || "";
  if (f === "Web") return "Web Development";
  if (f === "Backend") return "Backend Development";
  if (f === "Mobile") return rm?.track ? `Mobile Development (${rm.track})` : "Mobile Development";
  if (f === "Data") return "Data Analytics";
  if (f) return f;
  return (rm?.title || "DevUp").replace(/\s*Roadmap.*$/i, "");
}

const BLURB = {
  Web: "Demonstrated the skills required to build modern, responsive web applications from scratch.",
  Backend: "Demonstrated the skills required to design, build and deploy reliable backend services.",
  Mobile: "Demonstrated the skills required to build and publish cross-platform mobile applications.",
  Cybersecurity: "Demonstrated the skills required to find, analyze and defend against security threats.",
  Data: "Demonstrated the skills required to collect, clean, analyze and present data.",
  "Artificial Intelligence": "Demonstrated the skills required to build and apply machine learning and AI systems.",
  "DevOps & Cloud": "Demonstrated the skills required to build, ship and operate software in the cloud.",
};

const dateText = (iso) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

/* ---------- Sertifikat kağızı (1000 x 707) ---------- */
function Paper({ name, program, skills, blurb, issued }) {
  return (
    <div className="cf-paper" style={{ width: PAPER_W, height: PAPER_H }}>
      <div className="cf-left">
        <svg className="cf-logo" viewBox="0 0 514 242" role="img" aria-label="DevUp">
          <path d="M205 112L230 188L268 189L295 112L262 113L251 166L249 165L238 113ZM137 118L126 131L122 145L122 160L124 168L128 175L138 185L155 191L176 191L192 187L193 167L179 172L165 172L159 170L153 164L154 161L201 160L201 143L199 134L191 120L183 114L171 110L155 110L143 114ZM152 142L153 137L160 129L166 129L172 135L172 144L154 144ZM11 80L10 188L66 189L81 185L94 177L105 164L109 156L112 143L111 115L103 98L92 88L78 82L67 80ZM44 105L58 105L67 109L74 116L78 125L78 143L74 152L67 160L58 164L44 164L42 162L42 107Z" fill="#132039" fillRule="evenodd" />
          <path d="M487 112L481 110L466 110L460 112L451 120L449 119L448 112L416 113L417 225L449 224L450 181L456 187L464 191L477 191L489 185L499 173L503 162L504 153L503 134L498 122ZM457 133L465 134L470 139L472 145L472 154L470 161L462 168L456 168L453 166L448 157L449 141ZM383 10L380 11L349 51L366 52L368 54L368 143L366 151L360 158L352 161L342 160L335 154L332 149L331 78L302 78L302 145L304 157L308 166L317 177L326 184L339 189L360 189L374 183L385 174L390 167L395 155L396 54L398 52L415 51Z" fill="#0b72f5" fillRule="evenodd" />
        </svg>

        <svg className="cf-seal" viewBox="0 0 150 190" role="img" aria-label="Seal">
          <defs>
            <path id="cf-ring" d="M75,23 a52,52 0 1,1 -0.01,0" />
          </defs>
          <polygon points="52,120 36,184 62,170 76,188 84,124" fill="#264a8a" />
          <polygon points="98,120 114,184 88,170 74,188 66,124" fill="#0b72f5" />
          <circle cx="75" cy="75" r="68" fill="#0b72f5" />
          <circle cx="75" cy="75" r="64" fill="none" stroke="#ffffff" strokeWidth="1" opacity="0.5" />
          <text fontSize="11" fontWeight="500" fill="#ffffff" letterSpacing="2" fontFamily="Arial, Helvetica, sans-serif">
            <textPath href="#cf-ring" textLength="318" lengthAdjust="spacing">DEVUP TEAM  ·  DEVUP TEAM  ·</textPath>
          </text>
          <circle cx="75" cy="75" r="42" fill="#ffffff" />
          <svg x="51" y="50" width="48" height="49" viewBox="0 0 244 248">
            <path d="M15 10 L11 14 L12 139 L114 85 L99 68 L101 62 L160 55 L173 55 L175 57 L167 130 L161 130 L143 113 L92 165 L92 238 L134 238 L153 235 L178 225 L197 212 L211 197 L225 172 L233 138 L233 110 L229 88 L217 60 L207 46 L184 26 L169 18 L139 10Z" fill="#132039" />
            <path d="M73 129 L11 161 L11 238 L72 238 L75 235 L75 131Z" fill="#0b72f5" />
          </svg>
        </svg>
        <div />
      </div>

      <div className="cf-right">
        <div className="cf-kicker">Certificate of completion</div>
        <div className="cf-rule" />
        <div className="cf-small">This is proudly presented to</div>
        <div className="cf-name">{name}</div>
        <div className="cf-for">for completing</div>
        <div className="cf-program">{program}</div>
        <div className="cf-chips">
          {skills.map((s) => (
            <span key={s} className="cf-chip">{s}</span>
          ))}
        </div>
        <div className="cf-blurb">{blurb}</div>

        <div className="cf-foot">
          <div>
            <div className="cf-label">Issued</div>
            <div className="cf-date">{issued}</div>
          </div>
          <div className="cf-sign">
            <div className="cf-sign-script">DevUp Academy</div>
            <div className="cf-sign-line" />
            <div className="cf-label">Authorized signature</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* Kağızı konteynerin enine görə kiçildir */
function Scaled({ paperRef, children }) {
  const box = useRef(null);
  const [scale, setScale] = useState(0.6);
  useEffect(() => {
    const el = box.current;
    if (!el) return undefined;
    const ro = new ResizeObserver(() => setScale(el.clientWidth / PAPER_W));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <div ref={box} className="cf-frame" style={{ height: PAPER_H * scale }}>
      <div className="cf-scale" style={{ transform: `scale(${scale})` }}>
        <div ref={paperRef}>{children}</div>
      </div>
    </div>
  );
}

function EarnedCard({ cert, name }) {
  const paperRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [shownName, setShownName] = useState(cert.recipient_name || name);
  const [changesLeft, setChangesLeft] = useState(Math.max(0, 2 - (cert.name_changes || 0)));
  const [nameSet, setNameSet] = useState(!!cert.name_set);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [nameErr, setNameErr] = useState("");
  const rm = cert.roadmap;
  const program = displayName(rm);
  const issued = dateText(cert.issued_at);
  const paper = (
    <Paper
      name={shownName}
      program={program}
      skills={cert.skills}
      blurb={BLURB[rm?.field] || "Completed every unit, the certification project and the final exam."}
      issued={issued}
    />
  );

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  async function download() {
    const node = paperRef.current?.firstChild;
    if (!node) return;
    setBusy(true);
    setErr("");
    try {
      const [{ toPng }, { jsPDF }] = await Promise.all([import("html-to-image"), import("jspdf")]);
      const png = await toPng(node, {
        pixelRatio: 2,
        cacheBust: true,
        width: PAPER_W,
        height: PAPER_H,
        style: { transform: "none" },
      });
      const pdf = new jsPDF({ orientation: "landscape", unit: "px", format: [PAPER_W, PAPER_H], compress: true });
      pdf.addImage(png, "PNG", 0, 0, PAPER_W, PAPER_H);
      pdf.save(`DevUp - ${program} certificate.pdf`);
    } catch (e) {
      console.error("certificate pdf:", e);
      setErr("Couldn't create the PDF. Try again.");
    } finally {
      setBusy(false);
    }
  }

  function startEdit() {
    setDraft(shownName);
    setNameErr("");
    setEditing(true);
  }

  async function saveName(e) {
    e.preventDefault();
    const v = draft.trim().replace(/\s+/g, " ");
    if (v.length < 2 || v.length > 60) {
      setNameErr("Name must be 2 to 60 characters.");
      return;
    }
    if (v === shownName) {
      setEditing(false);
      return;
    }
    setSaving(true);
    setNameErr("");
    const { data, error } = await supabase.rpc("update_certificate_name", { p_id: cert.id, p_name: v });
    setSaving(false);
    if (error || !data?.ok) {
      if (error) console.error("update name:", error.code, error.message);
      setNameErr(data?.error === "limit" ? "You have no name changes left." : "Couldn't save the name. Try again.");
      return;
    }
    setShownName(data.name);
    setChangesLeft(data.left);
    setNameSet(true);
    setEditing(false);
  }

  function linkedin() {
    const d = new Date(cert.issued_at);
    const q = new URLSearchParams({
      startTask: "CERTIFICATION_NAME",
      name: `${program} Certificate`,
      organizationName: ORG,
      issueYear: String(d.getFullYear()),
      issueMonth: String(d.getMonth() + 1),
      certId: cert.code,
    });
    window.open(`https://www.linkedin.com/profile/add?${q.toString()}`, "_blank", "noopener,noreferrer");
  }

  return (
    <article className="certs-card certs-earned">
      <div className="certs-row">
        <span className="certs-badge">{rm?.field}</span>
        <span className="certs-status is-earned">Earned</span>
      </div>
      <Scaled>{paper}</Scaled>
      <div className="certs-row">
        <h3>{program}</h3>
        <span className="certs-note">Issued {issued}</span>
      </div>
      {!nameSet && (
        <p className="certs-warn">
          Your full name isn't set yet. Open the certificate and use Edit name before you download it.
        </p>
      )}
      <button type="button" className="certs-start" onClick={() => setOpen(true)}>
        View certificate
      </button>

      {open && (
        <div className="cf-overlay" onClick={() => setOpen(false)}>
          <div
            className="cf-modal"
            role="dialog"
            aria-modal="true"
            aria-label={`${program} certificate`}
            onClick={(e) => e.stopPropagation()}
          >
            <button type="button" className="cf-close" aria-label="Close" onClick={() => setOpen(false)}>
              &times;
            </button>
            <Scaled paperRef={paperRef}>{paper}</Scaled>
            <div className="cf-row">
              <div>
                <h2 className="cf-title">{program}</h2>
                <p className="cf-meta">Issued {issued}</p>
              </div>
              <div className="cf-actions">
                <button type="button" className="cf-btn is-primary" onClick={download} disabled={busy}>
                  {busy ? "Preparing PDF…" : "Download PDF"}
                </button>
                <button type="button" className="cf-btn" onClick={linkedin}>Add to LinkedIn</button>
                {changesLeft > 0 && !editing && (
                  <button type="button" className={"cf-btn" + (nameSet ? "" : " is-primary")} onClick={startEdit}>{nameSet ? "Edit name" : "Set your name"}</button>
                )}
              </div>
            </div>
            {editing && (
              <form className="cf-edit" onSubmit={saveName}>
                <label htmlFor={`cf-name-${cert.id}`}>Name on certificate</label>
                <div className="cf-edit-row">
                  <input
                    id={`cf-name-${cert.id}`}
                    className="cf-input"
                    value={draft}
                    maxLength={60}
                    autoFocus
                    onChange={(e) => setDraft(e.target.value)}
                  />
                  <button type="submit" className="cf-btn is-primary" disabled={saving}>
                    {saving ? "Saving…" : "Save"}
                  </button>
                  <button type="button" className="cf-btn" onClick={() => setEditing(false)} disabled={saving}>
                    Cancel
                  </button>
                </div>
                <p className="cf-hint">
                  {nameSet
                    ? `You can change the name ${changesLeft === 1 ? "1 more time" : `${changesLeft} more times`}. Check the spelling before saving.`
                    : "Write your full name as it should appear. This first save is free; after it you can change it 2 more times."}
                </p>
                {nameErr && <p className="cf-error" role="alert">{nameErr}</p>}
              </form>
            )}
            {err && <p className="cf-error" role="alert">{err}</p>}
          </div>
        </div>
      )}
    </article>
  );
}

const FIELDS = [
  "All fields",
  "Web",
  "Backend",
  "Mobile",
  "Cybersecurity",
  "Data",
  "Artificial Intelligence",
  "DevOps & Cloud",
];
const RANK = { earned: 0, progress: 1, new: 2 };
const TABS = [
  { id: "all", label: "All" },
  { id: "earned", label: "Earned" },
  { id: "progress", label: "In progress" },
  { id: "new", label: "Not started" },
];
const EMPTY = {
  earned: ["No certificates yet", "Pass a roadmap's Final Exam to earn your first certificate."],
  progress: ["Nothing in progress", "Start a lesson and your roadmap will show up here."],
  new: ["Everything started", "You've started every roadmap."],
  all: ["No roadmaps yet", "Roadmaps and certificates will appear here soon."],
};

export default function Certificates() {
  const [data, setData] = useState({ loading: true, error: "", name: "", roadmaps: [], certs: [], prog: {}, stages: [] });
  const [tab, setTab] = useState("all");
  const [field, setField] = useState("All fields");

  useEffect(() => {
    let off = false;
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      const user = auth?.user;
      if (!user) {
        if (!off) setData((d) => ({ ...d, loading: false, error: "Sign in to see your certificates." }));
        return;
      }
      const [rm, ct, pr, st, pg] = await Promise.all([
        supabase.from("roadmaps").select("id, title, field, track").order("field"),
        supabase
          .from("certificates")
          .select("id, code, issued_at, roadmap_id, recipient_name, name_changes, name_set")
          .eq("user_id", user.id),
        supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
        supabase.from("stages").select("roadmap_id, title, position, kind").eq("kind", "learning").order("position"),
        supabase.rpc("my_roadmap_progress"),
      ]);
      if (off) return;
      if (rm.error) console.error("roadmaps:", rm.error.message);
      if (ct.error) console.error("certificates:", ct.error.message);
      if (pg.error) console.error("progress:", pg.error.message);
      const prog = {};
      (pg.data || []).forEach((r) => {
        prog[r.roadmap_id] = { total: r.total, done: r.done };
      });

      // Final Exam keçilib, amma sertifikat hələ yaranmayıbsa, yarat
      let certRows = ct.data || [];
      const missing = (rm.data || []).filter((r) => {
        const p = prog[r.id];
        return p && p.total > 0 && p.done >= p.total && !certRows.some((c) => c.roadmap_id === r.id);
      });
      if (missing.length) {
        const ex = await supabase.from("lessons").select("id, stage:stages(roadmap_id)").eq("kind", "exam");
        const exams = (ex.data || []).map((x) => ({
          id: x.id,
          roadmapId: (Array.isArray(x.stage) ? x.stage[0] : x.stage)?.roadmap_id,
        }));
        for (const r of missing) {
          const e = exams.find((x) => x.roadmapId === r.id);
          if (e) await supabase.functions.invoke("send-certificate-email", { body: { lessonId: e.id } }).catch(() => {});
        }
        const again = await supabase
          .from("certificates")
          .select("id, code, issued_at, roadmap_id, recipient_name, name_changes, name_set")
          .eq("user_id", user.id);
        if (!again.error) certRows = again.data || [];
        if (off) return;
      }
      const name =
        pr.data?.full_name ||
        user.user_metadata?.full_name ||
        (user.email || "").split("@")[0] ||
        "DevUp Learner";
      setData({
        loading: false,
        error: rm.error ? "Couldn't load roadmaps." : "",
        name,
        roadmaps: rm.data || [],
        certs: certRows,
        prog,
        stages: st.data || [],
      });
    })();
    return () => {
      off = true;
    };
  }, []);

  const { loading, error, name, roadmaps, certs, prog, stages } = data;

  const certByRoadmap = {};
  certs.forEach((c) => {
    certByRoadmap[c.roadmap_id] = c;
  });

  const items = roadmaps
    .map((rm) => {
      const cert = certByRoadmap[rm.id];
      const p = prog[rm.id] || { total: 0, done: 0 };
      const state = cert ? "earned" : p.done > 0 ? "progress" : "new";
      return { rm, cert, p, state };
    })
    .sort((a, b) => RANK[a.state] - RANK[b.state]);

  const counts = {
    all: items.length,
    earned: items.filter((i) => i.state === "earned").length,
    progress: items.filter((i) => i.state === "progress").length,
    new: items.filter((i) => i.state === "new").length,
  };

  const visible = items.filter(
    (i) => (tab === "all" || i.state === tab) && (field === "All fields" || i.rm.field === field)
  );

  return (
    <Sidebar>
      <div className="certs-page cf-page">
        <header className="cf-head">
          <h1>Certificates</h1>
          <p>Pass a roadmap's Final Exam to earn its certificate of completion.</p>
        </header>

        <div className="certs-tabs" role="tablist">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              className={"certs-tab" + (tab === t.id ? " is-active" : "")}
              onClick={() => setTab(t.id)}
            >
              {t.label} <span className="certs-count">{counts[t.id]}</span>
            </button>
          ))}
        </div>

        <div className="certs-fields">
          {FIELDS.map((f) => (
            <button
              key={f}
              type="button"
              className={"certs-field" + (field === f ? " is-active" : "")}
              onClick={() => setField(f)}
            >
              {f}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="certs-empty"><p className="certs-empty-text">Loading...</p></div>
        ) : error ? (
          <div className="certs-empty"><p className="certs-empty-text" role="alert">{error}</p></div>
        ) : counts[tab] === 0 ? (
          <div className="certs-empty">
            <h2>{EMPTY[tab][0]}</h2>
            <p className="certs-empty-text">{EMPTY[tab][1]}</p>
          </div>
        ) : visible.length === 0 ? (
          <div className="certs-empty">
            <h2>No results</h2>
            <p className="certs-empty-text">Try a different field.</p>
          </div>
        ) : (
          <div className="certs-grid">
            {visible.map(({ rm, cert, p, state }) => {
              if (state === "earned") {
                const skills = stages
                  .filter((s) => s.roadmap_id === rm.id && !/additional tools/i.test(s.title))
                  .map((s) => s.title);
                return (
                  <EarnedCard key={rm.id} cert={{ ...cert, roadmap: rm, skills }} name={name} />
                );
              }
              const percent = p.total ? Math.min(100, Math.round((p.done / p.total) * 100)) : 0;
              return (
                <article className="certs-card" key={rm.id}>
                  <div className="certs-row">
                    <span className="certs-badge">{rm.field}</span>
                    <span className={"certs-status" + (state === "progress" ? " is-progress" : "")}>
                      {state === "progress" ? "In progress" : "Not started"}
                    </span>
                  </div>
                  <h3>{displayName(rm)}</h3>
                  <div className="certs-bar">
                    <div className="certs-bar-fill" style={{ width: percent + "%" }} />
                  </div>
                  <p className="certs-note">
                    {p.done} / {p.total} lessons. Pass the Final Exam to earn this certificate.
                  </p>
                  <a className="certs-start" href="/lessons">
                    {state === "progress" ? "Continue" : "Start roadmap"}
                  </a>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </Sidebar>
  );
}