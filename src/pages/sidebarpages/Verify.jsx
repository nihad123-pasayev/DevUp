import "@fontsource/fraunces/500.css";
import "./Verify.css";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "/src/supabaseclient.js";

// Certificates.jsx ilə eyni ad məntiqi
function displayName(rm) {
  const f = rm?.field || "";
  if (f === "Web") return "Web Development";
  if (f === "Backend") return "Backend Development";
  if (f === "Mobile")
    return rm?.track
      ? `Mobile Development (${rm.track})`
      : "Mobile Development";
  if (f === "Data") return "Data Analytics";
  if (f) return f;
  return (rm?.title || "DevUp").replace(/\s*Roadmap.*$/i, "");
}

const dateText = (iso) =>
  new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

function Logo() {
  return (
    <div className="vf-brand">
      <svg className="vf-icon" viewBox="0 0 244 248" aria-hidden="true">
        <path
          d="M15 10 L11 14 L12 139 L114 85 L99 68 L101 62 L160 55 L173 55 L175 57 L167 130 L161 130 L143 113 L92 165 L92 238 L134 238 L153 235 L178 225 L197 212 L211 197 L225 172 L233 138 L233 110 L229 88 L217 60 L207 46 L184 26 L169 18 L139 10Z"
          fill="#132039"
        />
        <path
          d="M73 129 L11 161 L11 238 L72 238 L75 235 L75 131Z"
          fill="#0b72f5"
        />
      </svg>
      <svg className="vf-logo" viewBox="0 0 514 242" role="img" aria-label="DevUp">
        <path
          d="M205 112L230 188L268 189L295 112L262 113L251 166L249 165L238 113ZM137 118L126 131L122 145L122 160L124 168L128 175L138 185L155 191L176 191L192 187L193 167L179 172L165 172L159 170L153 164L154 161L201 160L201 143L199 134L191 120L183 114L171 110L155 110L143 114ZM152 142L153 137L160 129L166 129L172 135L172 144L154 144ZM11 80L10 188L66 189L81 185L94 177L105 164L109 156L112 143L111 115L103 98L92 88L78 82L67 80ZM44 105L58 105L67 109L74 116L78 125L78 143L74 152L67 160L58 164L44 164L42 162L42 107Z"
          fill="#132039"
          fillRule="evenodd"
        />
        <path
          d="M487 112L481 110L466 110L460 112L451 120L449 119L448 112L416 113L417 225L449 224L450 181L456 187L464 191L477 191L489 185L499 173L503 162L504 153L503 134L498 122ZM457 133L465 134L470 139L472 145L472 154L470 161L462 168L456 168L453 166L448 157L449 141ZM383 10L380 11L349 51L366 52L368 54L368 143L366 151L360 158L352 161L342 160L335 154L332 149L331 78L302 78L302 145L304 157L308 166L317 177L326 184L339 189L360 189L374 183L385 174L390 167L395 155L396 54L398 52L415 51Z"
          fill="#0b72f5"
          fillRule="evenodd"
        />
      </svg>
    </div>
  );
}

/* Nəticə kartı (yalnız görünüş) */
export function VerifyResult({ status, row, code }) {
  if (status === "loading") {
    return (
      <div className="vf-state">
        <p className="vf-muted">Checking…</p>
      </div>
    );
  }
  if (status === "error") {
    return (
      <div className="vf-state is-error" role="alert">
        <h2>Couldn't check right now</h2>
        <p>Please try again in a moment.</p>
      </div>
    );
  }
  if (status === "notfound") {
    return (
      <div className="vf-state is-bad" role="status">
        <div className="vf-mark is-bad" aria-hidden="true">!</div>
        <h2>Certificate not found</h2>
        <p>
          No certificate matches <b className="vf-code">{code}</b>. Check the
          code and try again.
        </p>
      </div>
    );
  }
  const revoked = !!row.revoked_at;
  return (
    <div className={"vf-state " + (revoked ? "is-bad" : "is-ok")} role="status">
      <div className={"vf-mark " + (revoked ? "is-bad" : "is-ok")} aria-hidden="true">
        {revoked ? "!" : "\u2713"}
      </div>
      <h2>{revoked ? "Certificate revoked" : "Valid certificate"}</h2>
      <p className="vf-lead">
        {revoked
          ? "This certificate is no longer valid."
          : "This certificate was issued by DevUp Academy."}
      </p>
      <dl className="vf-list">
        <div>
          <dt>Awarded to</dt>
          <dd className="vf-big">{row.recipient_name}</dd>
        </div>
        <div>
          <dt>Program</dt>
          <dd>{displayName(row)}</dd>
        </div>
        <div>
          <dt>Issued</dt>
          <dd>{dateText(row.issued_at)}</dd>
        </div>
        <div>
          <dt>Certificate ID</dt>
          <dd className="vf-code">{row.code}</dd>
        </div>
        <div>
          <dt>Issued by</dt>
          <dd>DevUp Academy</dd>
        </div>
      </dl>
    </div>
  );
}

/* Giriş sahəsi: kod dəyişəndə `key` ilə yenidən yaranır */
function VerifyForm({ initial }) {
  const navigate = useNavigate();
  const [input, setInput] = useState(initial);

  function submit(e) {
    e.preventDefault();
    const c = input.trim().toUpperCase();
    if (c) navigate(`/verify/${encodeURIComponent(c)}`);
  }

  return (
    <form className="vf-form" onSubmit={submit}>
      <input
        className="vf-input"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="DU-XXXXXXXXXX"
        aria-label="Certificate ID"
        autoComplete="off"
        spellCheck={false}
      />
      <button type="submit" className="vf-btn" disabled={!input.trim()}>
        Verify
      </button>
    </form>
  );
}

export default function Verify() {
  const { code: param } = useParams();
  const code = (param || "").trim().toUpperCase();
  // nəticə hansı koda aiddirsə, onunla birlikdə saxlanır
  const [res, setRes] = useState({ code: "", status: "idle", row: null });

  useEffect(() => {
    document.title = "Verify certificate | DevUp";
  }, []);

  useEffect(() => {
    if (!code) return undefined;
    let off = false;
    (async () => {
      const { data, error } = await supabase.rpc("verify_certificate", {
        p_code: code,
      });
      if (off) return;
      if (error) {
        console.error("verify:", error.message);
        setRes({ code, status: "error", row: null });
      } else if (!data || data.length === 0) {
        setRes({ code, status: "notfound", row: null });
      } else {
        setRes({ code, status: "found", row: data[0] });
      }
    })();
    return () => {
      off = true;
    };
  }, [code]);

  // kod var, amma nəticə hələ başqa koda aiddirsə → yüklənir
  const status = !code ? "idle" : res.code === code ? res.status : "loading";

  return (
    <main className="vf-page">
      <div className="vf-card">
        <Logo />
        <h1 className="vf-title">Verify a certificate</h1>
        <p className="vf-muted">
          Enter the certificate ID or scan the QR code on the certificate.
        </p>

        <VerifyForm key={code} initial={code} />

        {status !== "idle" && (
          <VerifyResult status={status} row={res.row} code={code} />
        )}
      </div>
    </main>
  );
}