import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Sidebar from "../Sidebar";
import { supabase } from "../../supabaseclient";
import "./Resources.css";

const PAGE_SIZE = 24;
const NEW_DAYS = 14;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const TYPES = [
  { id: "book", label: "Books" },
  { id: "website", label: "Websites" },
  { id: "video", label: "Videos" },
  { id: "tool", label: "Tools" },
  { id: "cheatsheet", label: "Cheat sheets" },
  { id: "practice", label: "Practice" },
];

const TYPE_LABELS = {
  book: "Book",
  website: "Website",
  video: "Video",
  tool: "Tool",
  cheatsheet: "Cheat sheet",
  practice: "Practice",
};

const OPEN_LABELS = {
  book: "View",
  video: "Watch",
  website: "Open",
  tool: "Open",
  cheatsheet: "Open",
  practice: "Open",
};

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

const LANGUAGES = [
  { id: "all", label: "All languages" },
  { id: "en", label: "English" },
  { id: "az", label: "Azərbaycanca" },
  { id: "tr", label: "Türkçe" },
  { id: "ru", label: "Русский" },
];

const LANGUAGE_NAMES = { en: "English", az: "Azərbaycanca", tr: "Türkçe", ru: "Русский" };

const SORTS = [
  { id: "new", label: "Newest first" },
  { id: "az", label: "A–Z" },
];

const COVER_COLORS = {
  Web: "#1d4f9f",
  Backend: "#243b55",
  Mobile: "#5b3f99",
  Cybersecurity: "#7a2e3a",
  Data: "#1f6b5c",
  "Artificial Intelligence": "#6b4a1f",
  "DevOps & Cloud": "#2f4858",
};

function readParams() {
  const p = new URLSearchParams(window.location.search);
  const tab = p.get("tab");
  const field = p.get("field");
  const lang = p.get("lang");
  const sort = p.get("sort");
  return {
    type: TYPES.some((t) => t.id === tab) ? tab : "book",
    field: FIELDS.includes(field) ? field : "All fields",
    lang: LANGUAGES.some((l) => l.id === lang) ? lang : "all",
    sort: SORTS.some((s) => s.id === sort) ? sort : "new",
    q: (p.get("q") || "").slice(0, 80),
    r: p.get("r"),
  };
}

// characters that would break a PostgREST or() filter
function cleanTerm(s) {
  return s.replace(/[%*,():"\\]/g, " ").replace(/\s+/g, " ").trim();
}

function mapRow(r) {
  const created = r.created_at ? new Date(r.created_at).getTime() : 0;
  return { ...r, isNew: Date.now() - created < NEW_DAYS * 86400000 };
}

function hostOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function describe(r) {
  const parts = [];
  if (r.author) parts.push(r.author);
  if (r.formats && r.formats.length) parts.push(r.formats.join(", "));
  return parts.join(" · ") || null;
}

function embedSrc(r) {
  const u = r.embed_url || "";
  if (!u.startsWith("https://www.youtube.com/embed/")) return null;
  return u.replace("https://www.youtube.com/", "https://www.youtube-nocookie.com/");
}

function tiltMove(e) {
  if (e.pointerType !== "mouse") return;
  const el = e.currentTarget;
  const b = el.getBoundingClientRect();
  const x = (e.clientX - b.left) / b.width - 0.5;
  const y = (e.clientY - b.top) / b.height - 0.5;
  el.style.setProperty("--rx", `${(-y * 7).toFixed(2)}deg`);
  el.style.setProperty("--ry", `${(x * 7).toFixed(2)}deg`);
}

function tiltLeave(e) {
  e.currentTarget.style.setProperty("--rx", "0deg");
  e.currentTarget.style.setProperty("--ry", "0deg");
}

function BookmarkIcon({ filled }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M6 3h12v18l-6-4-6 4z" />
    </svg>
  );
}

function BookCover({ r, large }) {
  const color = COVER_COLORS[r.fields && r.fields[0]] || "#243b55";
  return (
    <div
      className={"resources-book" + (large ? " is-large" : "")}
      style={{ "--book": color }}
      aria-hidden="true"
    >
      <div className="resources-book-body">
        <div className="resources-book-front">
          <span className="resources-book-topic">{r.topic}</span>
          <strong className="resources-book-title">{r.title}</strong>
          {r.author ? <span className="resources-book-author">{r.author}</span> : null}
        </div>
        <div className="resources-book-pages" />
        <div className="resources-book-back" />
      </div>
    </div>
  );
}

function ResourceCard({ r, isSaved, onSave, onOpen }) {
  const host = hostOf(r.url);
  const meta = describe(r);
  const opensModal = r.type === "book" || r.type === "video";

  return (
    <div
      className={"resources-card is-" + r.type}
      onPointerMove={tiltMove}
      onPointerLeave={tiltLeave}
    >
      <div className="resources-card-top">
        <span className="resources-badge">{TYPE_LABELS[r.type]}</span>
        {r.isNew ? <span className="resources-new">New</span> : null}
        <button
          type="button"
          className={"resources-save" + (isSaved ? " is-saved" : "")}
          aria-label={isSaved ? "Remove from saved" : "Save resource"}
          aria-pressed={isSaved}
          onClick={() => onSave(r)}
        >
          <BookmarkIcon filled={isSaved} />
        </button>
      </div>

      {r.type === "book" ? (
        <button
          type="button"
          className="resources-media-btn"
          aria-label={"Open " + r.title}
          onClick={() => onOpen(r)}
        >
          <BookCover r={r} />
        </button>
      ) : null}

      {r.type === "video" ? (
        <button
          type="button"
          className="resources-media-btn"
          aria-label={"Watch " + r.title}
          onClick={() => onOpen(r)}
        >
          <span className="resources-thumb">
            {r.thumbnail_url ? (
              <img
                src={r.thumbnail_url}
                alt=""
                loading="lazy"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            ) : (
              <span className="resources-thumb-fallback">Playlist</span>
            )}
            <span className="resources-play" aria-hidden="true">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
            </span>
          </span>
        </button>
      ) : null}

      {!opensModal && host ? (
        <div className="resources-site">
          <img
            src={"https://www.google.com/s2/favicons?domain=" + host + "&sz=64"}
            alt=""
            width="20"
            height="20"
            loading="lazy"
            onError={(e) => {
              e.currentTarget.style.visibility = "hidden";
            }}
          />
          <span>{host}</span>
        </div>
      ) : null}

      <h3 className={r.type === "book" ? "resources-sr" : undefined}>{r.title}</h3>
      {meta ? <p>{meta}</p> : null}

      <div className="resources-tags">
        {r.topic ? <span>{r.topic}</span> : null}
        {r.language && r.language !== "en" ? (
          <span>{LANGUAGE_NAMES[r.language] || r.language}</span>
        ) : null}
        <span className="is-price">{r.price}</span>
      </div>

      {opensModal ? (
        <a
          className="resources-open"
          href={r.url}
          onClick={(e) => {
            e.preventDefault();
            onOpen(r);
          }}
        >
          {OPEN_LABELS[r.type]}
        </a>
      ) : (
        <a className="resources-open" href={r.url} target="_blank" rel="noreferrer">
          {OPEN_LABELS[r.type]}
        </a>
      )}
    </div>
  );
}

function ResourceModal({ r, isSaved, copied, onSave, onCopy, onClose }) {
  const closeRef = useRef(null);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    if (closeRef.current) closeRef.current.focus();
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const isBook = r.type === "book";
  const src = r.type === "video" ? embedSrc(r) : null;
  const isPdf = /\.pdf($|[?#])/i.test(r.url);
  const primary = isBook
    ? isPdf
      ? "Download PDF"
      : "Read online"
    : "Open on YouTube";

  return createPortal(
    <div
      className="resources-modal"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={"resources-dialog" + (isBook ? " is-book" : " is-video")}
        role="dialog"
        aria-modal="true"
        aria-labelledby="resources-dialog-title"
      >
        <button
          ref={closeRef}
          type="button"
          className="resources-dialog-close"
          aria-label="Close"
          onClick={onClose}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>

        {isBook ? (
          <div className="resources-dialog-cover">
            <BookCover r={r} large />
          </div>
        ) : src ? (
          <div className="resources-player">
            <iframe
              src={src}
              title={r.title}
              allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
            />
          </div>
        ) : null}

        <div className="resources-dialog-body">
          <h2 id="resources-dialog-title">{r.title}</h2>
          {r.author ? (
            <p className="resources-dialog-author">
              {r.type === "video" ? "By " : "Author: "}
              {r.author}
            </p>
          ) : null}

          <div className="resources-tags">
            {r.topic ? <span>{r.topic}</span> : null}
            {(r.formats || []).map((f) => (
              <span key={f}>{f}</span>
            ))}
            <span>{LANGUAGE_NAMES[r.language] || r.language}</span>
            <span className="is-price">{r.price}</span>
          </div>

          <div className="resources-dialog-actions">
            <a className="resources-primary" href={r.url} target="_blank" rel="noreferrer">
              {primary}
            </a>
            <button type="button" className="resources-secondary" onClick={() => onSave(r)}>
              <BookmarkIcon filled={isSaved} />
              {isSaved ? "Saved" : "Save"}
            </button>
            <button type="button" className="resources-secondary" onClick={() => onCopy(r)}>
              {copied ? "Link copied" : "Copy link"}
            </button>
          </div>

          {isBook ? (
            <p className="resources-dialog-note">
              Free book. The link goes to the author&apos;s or publisher&apos;s own page, so you
              always get the official version.
            </p>
          ) : null}
        </div>
      </div>
    </div>,
    document.body,
  );
}

export default function Resources() {
  const [init] = useState(readParams);
  const [type, setType] = useState(init.type);
  const [field, setField] = useState(init.field);
  const [lang, setLang] = useState(init.lang);
  const [sort, setSort] = useState(init.sort);
  const [query, setQuery] = useState(init.q);
  const [search, setSearch] = useState(init.q.trim());
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [reloadKey, setReloadKey] = useState(0);
  const [result, setResult] = useState({ key: "", base: "", rows: [], total: 0, error: null });
  const [saved, setSaved] = useState(() => new Set());
  const [selected, setSelected] = useState(null);
  const [copied, setCopied] = useState(false);
  const pendingSave = useRef(new Set());

  const base = JSON.stringify([type, field, lang, sort, search, reloadKey]);
  const key = base + limit;

  // debounce the search box
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(query.trim());
      setLimit(PAGE_SIZE);
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  // load the list from Supabase
  useEffect(() => {
    let ignore = false;
    let q = supabase
      .from("resources")
      .select("*", { count: "exact" })
      .eq("is_active", true)
      .eq("type", type);
    if (field !== "All fields") q = q.contains("fields", [field]);
    if (lang !== "all") q = q.eq("language", lang);
    const term = cleanTerm(search);
    if (term) q = q.or(`title.ilike.*${term}*,author.ilike.*${term}*`);
    q =
      sort === "az"
        ? q.order("title", { ascending: true })
        : q.order("created_at", { ascending: false }).order("title", { ascending: true });
    q = q.order("id", { ascending: true }).range(0, limit - 1);

    q.then(({ data, count, error }) => {
      if (ignore) return;
      setResult({
        key,
        base,
        rows: (data || []).map(mapRow),
        total: count || 0,
        error: error ? error.message : null,
      });
    });
    return () => {
      ignore = true;
    };
  }, [type, field, lang, sort, search, limit, key, base]);

  // which resources this user saved
  useEffect(() => {
    let ignore = false;
    supabase.auth.getUser().then(({ data }) => {
      const user = data && data.user;
      if (!user || ignore) return;
      supabase
        .from("saved_items")
        .select("item_id")
        .eq("user_id", user.id)
        .eq("item_type", "resource")
        .then(({ data: rows }) => {
          if (!ignore && rows) setSaved(new Set(rows.map((x) => x.item_id)));
        });
    });
    return () => {
      ignore = true;
    };
  }, []);

  // open a resource from a shared link (?r=...)
  useEffect(() => {
    if (!init.r || !UUID_RE.test(init.r)) return;
    let ignore = false;
    supabase
      .from("resources")
      .select("*")
      .eq("id", init.r)
      .eq("is_active", true)
      .maybeSingle()
      .then(({ data }) => {
        if (!ignore && data) setSelected(mapRow(data));
      });
    return () => {
      ignore = true;
    };
  }, [init]);

  // keep filters in the address bar so the view can be shared
  useEffect(() => {
    const p = new URLSearchParams();
    if (type !== "book") p.set("tab", type);
    if (field !== "All fields") p.set("field", field);
    if (lang !== "all") p.set("lang", lang);
    if (sort !== "new") p.set("sort", sort);
    if (search) p.set("q", search);
    if (selected) p.set("r", selected.id);
    const qs = p.toString();
    const url =
      window.location.pathname + (qs ? "?" + qs : "") + window.location.hash;
    window.history.replaceState(window.history.state, "", url);
  }, [type, field, lang, sort, search, selected]);

  const closeModal = useCallback(() => setSelected(null), []);

  function changeType(id) {
    setType(id);
    setLimit(PAGE_SIZE);
  }
  function changeField(f) {
    setField(f);
    setLimit(PAGE_SIZE);
  }
  function changeLang(v) {
    setLang(v);
    setLimit(PAGE_SIZE);
  }
  function changeSort(v) {
    setSort(v);
    setLimit(PAGE_SIZE);
  }
  function clearFilters() {
    setField("All fields");
    setLang("all");
    setQuery("");
    setSearch("");
    setLimit(PAGE_SIZE);
  }

  async function toggleSave(r) {
    if (pendingSave.current.has(r.id)) return;
    pendingSave.current.add(r.id);
    const was = saved.has(r.id);
    const flip = (on) =>
      setSaved((prev) => {
        const next = new Set(prev);
        if (on) next.add(r.id);
        else next.delete(r.id);
        return next;
      });
    flip(!was);

    const { data } = await supabase.auth.getUser();
    const user = data && data.user;
    let failed = !user;
    if (user) {
      const res = was
        ? await supabase
            .from("saved_items")
            .delete()
            .eq("user_id", user.id)
            .eq("item_type", "resource")
            .eq("item_id", r.id)
        : await supabase.from("saved_items").insert({
            user_id: user.id,
            item_type: "resource",
            item_id: r.id,
            title: r.title,
            description: describe(r),
            field: (r.fields && r.fields[0]) || null,
            link: r.url,
          });
      failed = Boolean(res.error);
    }
    if (failed) flip(was);
    pendingSave.current.delete(r.id);
  }

  async function copyLink(r) {
    const url = `${window.location.origin}${window.location.pathname}?tab=${r.type}&r=${r.id}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard not available */
    }
  }

  const loading = result.key !== key;
  const sameBase = result.base === base;
  const rows = sameBase ? result.rows : [];
  const showSkeleton = loading && !sameBase;
  const hasMore = sameBase && result.rows.length < result.total;
  const showError = !loading && result.error;
  const showEmpty = !loading && !result.error && rows.length === 0;
  const hasFilters = field !== "All fields" || lang !== "all" || search !== "";

  return (
    <Sidebar>
      <div className="resources-page">
        <header className="resources-header">
          <h1>Resources</h1>
          <p>Books, sites, videos and tools to learn from.</p>
        </header>

        <div className="resources-tabs" role="tablist">
          {TYPES.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={type === t.id}
              className={"resources-tab" + (type === t.id ? " is-active" : "")}
              onClick={() => changeType(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="resources-toolbar">
          <div className="resources-search">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
            <input
              type="search"
              aria-label="Search resources"
              placeholder="Search by title or author"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="resources-fields">
            {FIELDS.map((f) => (
              <button
                key={f}
                className={"resources-field" + (field === f ? " is-active" : "")}
                onClick={() => changeField(f)}
              >
                {f}
              </button>
            ))}
          </div>
          <div className="resources-selects">
            <select
              aria-label="Language"
              value={lang}
              onChange={(e) => changeLang(e.target.value)}
            >
              {LANGUAGES.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.label}
                </option>
              ))}
            </select>
            <select
              aria-label="Sort"
              value={sort}
              onChange={(e) => changeSort(e.target.value)}
            >
              {SORTS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
            {sameBase && !showError ? (
              <span className="resources-count" aria-live="polite">
                {result.total.toLocaleString()} {result.total === 1 ? "result" : "results"}
              </span>
            ) : null}
          </div>
        </div>

        <div role="tabpanel">
          {showError ? (
            <div className="resources-empty">
              <h2>Couldn&apos;t load resources</h2>
              <p className="resources-empty-text">Check your connection and try again.</p>
              <button
                type="button"
                className="resources-clear"
                onClick={() => setReloadKey((k) => k + 1)}
              >
                Try again
              </button>
            </div>
          ) : showEmpty ? (
            <div className="resources-empty">
              {hasFilters ? (
                <>
                  <h2>No results</h2>
                  <p className="resources-empty-text">Try a different search or filter.</p>
                  <button type="button" className="resources-clear" onClick={clearFilters}>
                    Clear filters
                  </button>
                </>
              ) : (
                <>
                  <h2>Nothing here yet</h2>
                  <p className="resources-empty-text">Check back soon.</p>
                </>
              )}
            </div>
          ) : (
            <div className="resources-grid">
              {showSkeleton
                ? Array.from({ length: 8 }, (_, i) => (
                    <div className="resources-card resources-skeleton" key={i} aria-hidden="true">
                      <span />
                      <span />
                      <span />
                    </div>
                  ))
                : rows.map((r) => (
                    <ResourceCard
                      key={r.id}
                      r={r}
                      isSaved={saved.has(r.id)}
                      onSave={toggleSave}
                      onOpen={setSelected}
                    />
                  ))}
            </div>
          )}
        </div>

        {hasMore ? (
          <div className="resources-more">
            <button
              type="button"
              className="resources-more-btn"
              disabled={loading}
              onClick={() => setLimit((n) => n + PAGE_SIZE)}
            >
              {loading ? "Loading…" : "Load more"}
            </button>
          </div>
        ) : null}

        <p className="resources-credit">
          Most resources come from the community-curated{" "}
          <a
            href="https://github.com/EbookFoundation/free-programming-books"
            target="_blank"
            rel="noreferrer"
          >
            free-programming-books
          </a>{" "}
          list (CC BY 4.0).
        </p>
      </div>

      {selected ? (
        <ResourceModal
          r={selected}
          isSaved={saved.has(selected.id)}
          copied={copied}
          onSave={toggleSave}
          onCopy={copyLink}
          onClose={closeModal}
        />
      ) : null}
    </Sidebar>
  );
}