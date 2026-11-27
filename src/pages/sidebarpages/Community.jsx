import { useState, useEffect, useRef, useCallback } from "react";
import Sidebar from "../Sidebar";
import { supabase } from "/src/supabaseclient.js";
import "./Community.css";

const TABS = [
  { id: "question", label: "Questions" },
  { id: "poll", label: "Polls" },
  { id: "experience", label: "Experiences" },
];
const TAB_HINTS = {
  question: "Stuck on something? Ask a question and other learners will help you.",
  poll: "Can't decide between options? Create a poll and let the community vote.",
  experience: "Share your experience and your success. Your story can help other learners.",
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
const POST_FIELDS = FIELDS.slice(1);
const SORTS = [
  { id: "newest", label: "Newest" },
  { id: "likes", label: "Most liked" },
  { id: "answers", label: "Most answered" },
  { id: "views", label: "Most viewed" },
];
const POLL_SORTS = [
  { id: "newest", label: "Newest" },
  { id: "likes", label: "Most liked" },
  { id: "votes", label: "Most votes" },
  { id: "views", label: "Most viewed" },
];
const STATUSES = [
  { id: "all", label: "All" },
  { id: "unanswered", label: "Unanswered" },
  { id: "solved", label: "Solved" },
];
const ADD_LABELS = {
  question: "+ Ask a question",
  poll: "+ Create a poll",
  experience: "+ Share an experience",
};
const MAX_OPTIONS = 6;
const EMPTY_FORM = { field: "Web", title: "", body: "", tags: "", options: ["", ""] };

const BUCKET = "community-images";
const MAX_IMAGES = 3;
const MAX_BYTES = 2 * 1024 * 1024;
const MAX_SIDE = 1600;
const EXTENSIONS = { "image/webp": "webp", "image/jpeg": "jpg", "image/png": "png" };

function timeAgo(date) {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return minutes + " min ago";
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return hours + (hours === 1 ? " hour ago" : " hours ago");
  const days = Math.floor(hours / 24);
  if (days < 7) return days + (days === 1 ? " day ago" : " days ago");
  return new Date(date).toLocaleDateString();
}

function initials(name) {
  if (!name) return "?";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

function words(kind) {
  if (kind === "question") return ["answer", "answers"];
  if (kind === "poll") return ["comment", "comments"];
  return ["reply", "replies"];
}

function countLabel(n, kind) {
  const [one, many] = words(kind);
  return n + " " + (n === 1 ? one : many);
}

function answerCount(p) {
  return p.answers_count ?? 0;
}

function pollTotal(p) {
  return (p.poll_options || []).reduce((sum, o) => sum + o.votes, 0);
}

function normalizePost(p) {
  return {
    ...p,
    poll_options: [...(p.poll_options || [])].sort((a, b) => a.position - b.position),
  };
}

/* ---------- images ---------- */

function imageUrl(path) {
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

// Shrinks big photos in the browser before upload. If the browser cannot do it,
// the original file is used as is (the 2 MB limit is still checked afterwards).
async function compressImage(file) {
  if (!/^image\/(png|jpe?g|webp)$/.test(file.type)) {
    throw new Error("Only PNG, JPG and WebP images are allowed.");
  }
  if (typeof createImageBitmap !== "function") return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    if (bitmap.close) bitmap.close();
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/webp", 0.85));
    return blob && blob.size < file.size ? blob : file;
  } catch {
    return file;
  }
}

async function removeImages(paths) {
  if (!paths.length) return;
  try {
    await supabase.storage.from(BUCKET).remove(paths);
  } catch {
    /* best effort */
  }
}

function useImagePicker() {
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");
  const counter = useRef(0);

  async function add(files) {
    setError("");
    const room = MAX_IMAGES - items.length;
    if (room <= 0) {
      setError("You can add up to " + MAX_IMAGES + " images.");
      return;
    }
    if (files.length > room) setError("You can add up to " + MAX_IMAGES + " images.");
    const added = [];
    for (const file of files.slice(0, room)) {
      try {
        const blob = await compressImage(file);
        if (blob.size > MAX_BYTES) {
          setError("Each image must be under 2 MB.");
          continue;
        }
        counter.current += 1;
        added.push({
          id: "img" + counter.current,
          blob,
          url: URL.createObjectURL(blob),
          name: file.name || "screenshot",
        });
      } catch (e) {
        setError(e.message);
      }
    }
    if (added.length) setItems((prev) => [...prev, ...added].slice(0, MAX_IMAGES));
  }

  function remove(id) {
    const gone = items.find((it) => it.id === id);
    if (gone) URL.revokeObjectURL(gone.url);
    setItems((prev) => prev.filter((it) => it.id !== id));
    setError("");
  }

  function clear() {
    items.forEach((it) => URL.revokeObjectURL(it.url));
    setItems([]);
    setError("");
  }

  return { items, error, add, remove, clear };
}

function pasteImages(e, picker) {
  const files = [...(e.clipboardData?.files || [])].filter((f) => f.type.startsWith("image/"));
  if (files.length) {
    e.preventDefault();
    picker.add(files);
  }
}

function ImageField({ picker, id }) {
  const inputRef = useRef(null);
  return (
    <div className="community-imagefield">
      {picker.items.length > 0 && (
        <div className="community-previews">
          {picker.items.map((it) => (
            <div key={it.id} className="community-preview-item">
              <img src={it.url} alt={it.name} />
              <button
                type="button"
                className="community-preview-remove"
                aria-label={"Remove " + it.name}
                onClick={() => picker.remove(it.id)}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="community-imagefield-row">
        <button
          type="button"
          className="community-secondary community-add-image"
          disabled={picker.items.length >= MAX_IMAGES}
          onClick={() => inputRef.current && inputRef.current.click()}
        >
          Add image
        </button>
        <span className="community-image-hint">
          PNG, JPG or WebP, up to {MAX_IMAGES} images. You can also paste a screenshot with Ctrl+V.
        </span>
      </div>
      <input
        ref={inputRef}
        id={id}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        multiple
        hidden
        aria-label="Choose images"
        onChange={(e) => {
          const files = [...e.target.files];
          e.target.value = "";
          picker.add(files);
        }}
      />
      {picker.error && (
        <p className="community-error" role="alert">
          {picker.error}
        </p>
      )}
    </div>
  );
}

function ImageGrid({ paths, onOpen, small }) {
  if (!paths || paths.length === 0) return null;
  return (
    <div className={"community-images" + (small ? " is-small" : "")}>
      {paths.map((p, i) => (
        <button
          key={p}
          type="button"
          className="community-image-btn"
          aria-label={"View image " + (i + 1)}
          onClick={() => onOpen(paths, i)}
        >
          <img src={imageUrl(p)} alt="" loading="lazy" />
        </button>
      ))}
    </div>
  );
}

function Lightbox({ images, index, onClose, onIndex }) {
  const many = images.length > 1;
  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") onClose();
      if (many && e.key === "ArrowRight") onIndex((index + 1) % images.length);
      if (many && e.key === "ArrowLeft") onIndex((index - 1 + images.length) % images.length);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, images.length, many, onClose, onIndex]);

  return (
    <div className="community-lightbox" role="dialog" aria-modal="true" aria-label="Image viewer" onClick={onClose}>
      <button type="button" className="community-lightbox-close" aria-label="Close" autoFocus onClick={onClose}>
        ×
      </button>
      {many && (
        <button
          type="button"
          className="community-lightbox-nav is-prev"
          aria-label="Previous image"
          onClick={(e) => {
            e.stopPropagation();
            onIndex((index - 1 + images.length) % images.length);
          }}
        >
          ‹
        </button>
      )}
      <img src={imageUrl(images[index])} alt="" onClick={(e) => e.stopPropagation()} />
      {many && (
        <button
          type="button"
          className="community-lightbox-nav is-next"
          aria-label="Next image"
          onClick={(e) => {
            e.stopPropagation();
            onIndex((index + 1) % images.length);
          }}
        >
          ›
        </button>
      )}
    </div>
  );
}

/* ---------- likes ---------- */

function LikeButton({ liked, count, disabled, title, onClick }) {
  return (
    <button
      type="button"
      className={"community-like" + (liked ? " is-liked" : "")}
      aria-pressed={liked}
      aria-label={liked ? "Remove like" : "Like"}
      title={title}
      disabled={disabled}
      onClick={onClick}
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill={liked ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21.2l7.8-7.7 1-1.1a5.5 5.5 0 0 0 0-7.8z" />
      </svg>
      <span>{count}</span>
    </button>
  );
}

/* ---------- code blocks ---------- */

const KEYWORDS = new Set(
  (
    "const let var function return if else for while do switch case break continue new class extends " +
    "import export from default async await try catch finally throw typeof instanceof in of null undefined " +
    "true false this super def lambda pass None True False and or not is with as elif except raise yield " +
    "public private protected static void int string bool float double fn mut struct enum interface type " +
    "package func select where join insert update delete create table"
  ).split(" "),
);
const TOKEN_SLASH =
  /(\/\*[\s\S]*?\*\/|\/\/[^\n]*)|("(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'|`(?:\\.|[^`\\])*`)|(\b\d+(?:\.\d+)?\b)|([A-Za-z_$][\w$]*)/g;
const TOKEN_HASH =
  /(\/\*[\s\S]*?\*\/|\/\/[^\n]*|#[^\n]*)|("(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'|`(?:\\.|[^`\\])*`)|(\b\d+(?:\.\d+)?\b)|([A-Za-z_$][\w$]*)/g;

function highlight(code, lang) {
  if (code.length > 20000) return code;
  const re = /^(py|python|bash|sh|shell|yaml|yml|ruby|rb)$/i.test(lang) ? TOKEN_HASH : TOKEN_SLASH;
  const out = [];
  let last = 0;
  let key = 0;
  for (const m of code.matchAll(re)) {
    if (m.index > last) out.push(code.slice(last, m.index));
    let cls = null;
    if (m[1] !== undefined) cls = "tok-c";
    else if (m[2] !== undefined) cls = "tok-s";
    else if (m[3] !== undefined) cls = "tok-n";
    else if (KEYWORDS.has(m[4])) cls = "tok-k";
    out.push(
      cls ? (
        <span key={key++} className={cls}>
          {m[0]}
        </span>
      ) : (
        m[0]
      ),
    );
    last = m.index + m[0].length;
  }
  if (last < code.length) out.push(code.slice(last));
  return out;
}

function CodeBlock({ code, lang }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef(null);

  useEffect(() => () => clearTimeout(timer.current), []);

  function copy() {
    const done = () => {
      setCopied(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 1500);
    };
    try {
      navigator.clipboard.writeText(code).then(done, () => {});
    } catch {
      /* clipboard is not available */
    }
  }

  return (
    <div className="community-codeblock">
      <div className="community-codebar">
        <span>{lang || "code"}</span>
        <button type="button" onClick={copy}>
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="community-code">
        <code>{highlight(code, lang)}</code>
      </pre>
    </div>
  );
}

function Body({ text }) {
  const parts = text.split("```");
  return (
    <div className="community-body">
      {parts.map((part, i) => {
        if (i % 2 === 0) return part.trim() && <p key={i}>{part.trim()}</p>;
        const m = part.match(/^([\w+#-]*)\n/);
        const code = (m ? part.slice(m[0].length) : part).replace(/^\n+|\s+$/g, "");
        return <CodeBlock key={i} code={code} lang={m ? m[1] : ""} />;
      })}
    </div>
  );
}

/* ---------- poll ---------- */

function PollBox({ post, myVote, onVote, compact }) {
  const options = post.poll_options || [];
  const total = pollTotal(post);
  return (
    <div className={"community-poll" + (compact ? " is-compact" : "")}>
      {options.map((o) => {
        const pct = total ? Math.round((o.votes / total) * 100) : 0;
        const mine = myVote === o.id;
        return (
          <button
            key={o.id}
            type="button"
            className={"community-option" + (mine ? " is-mine" : "")}
            aria-pressed={mine}
            onClick={() => onVote(post, o.id)}
          >
            <span className="community-option-fill" style={{ width: pct + "%" }} />
            <span className="community-option-label">
              {mine ? "✓ " : ""}
              {o.label}
            </span>
            <span className="community-option-pct">{pct}%</span>
          </button>
        );
      })}
      <p className="community-poll-foot">
        {total} {total === 1 ? "vote" : "votes"}
        {myVote ? " · tap your choice again to remove your vote" : " · tap an option to vote"}
      </p>
    </div>
  );
}

export default function Community() {
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState("question");
  const [field, setField] = useState("All fields");
  const [status, setStatus] = useState("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("newest");
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  const [askOpen, setAskOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [posting, setPosting] = useState(false);

  const [selected, setSelected] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [answerText, setAnswerText] = useState("");
  const [answerError, setAnswerError] = useState("");
  const [answering, setAnswering] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [editing, setEditing] = useState(null);
  const [editError, setEditError] = useState("");
  const [saving, setSaving] = useState(false);

  const [myVotes, setMyVotes] = useState({});
  const [myLikes, setMyLikes] = useState(() => new Set());
  const [myAnswerVotes, setMyAnswerVotes] = useState(() => new Set());
  const [notice, setNotice] = useState("");
  const [lightbox, setLightbox] = useState(null);
  const noticeTimer = useRef(null);
  const pendingPoll = useRef(new Set());
  const pendingLike = useRef(new Set());
  const pendingUpvote = useRef(new Set());
  const postPicker = useImagePicker();
  const answerPicker = useImagePicker();

  const authorName =
    user?.user_metadata?.full_name ||
    (user?.email ? user.email.split("@")[0] : "");

  function flash(message) {
    setNotice(message);
    clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(""), 3500);
  }

  const openLightbox = useCallback((paths, index) => setLightbox({ paths, index }), []);
  const closeLightbox = useCallback(() => setLightbox(null), []);
  const moveLightbox = useCallback((index) => setLightbox((l) => (l ? { ...l, index } : l)), []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data?.user ?? null));
    return () => clearTimeout(noticeTimer.current);
  }, []);

  useEffect(() => {
    let cancelled = false;
    supabase
      .from("posts")
      .select(
        "id, user_id, kind, title, body, field, tags, views, solved, author_name, created_at, answers_count, likes, images, edited_at, poll_options(id, position, label, votes)",
      )
      .eq("kind", tab)
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (cancelled) return;
        setPosts(!error && data ? data.map(normalizePost) : []);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tab, refreshKey]);

  const userId = user?.id;
  useEffect(() => {
    if (!userId || tab !== "poll") return;
    let cancelled = false;
    supabase
      .from("poll_votes")
      .select("post_id, option_id")
      .then(({ data, error }) => {
        if (cancelled || error || !data) return;
        const map = {};
        data.forEach((v) => {
          map[v.post_id] = v.option_id;
        });
        setMyVotes(map);
      });
    return () => {
      cancelled = true;
    };
  }, [userId, tab, refreshKey]);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    supabase
      .from("post_likes")
      .select("post_id")
      .then(({ data, error }) => {
        if (cancelled || error || !data) return;
        setMyLikes(new Set(data.map((v) => v.post_id)));
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  useEffect(() => {
    if (!deleteTarget) return;
    function onKey(e) {
      if (e.key === "Escape") setDeleteTarget(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [deleteTarget]);

  const loadPosts = () => setRefreshKey((k) => k + 1);

  async function loadAnswers(postId) {
    const { data, error } = await supabase
      .from("answers")
      .select("id, user_id, body, author_name, is_accepted, votes, images, edited_at, created_at")
      .eq("post_id", postId)
      .order("created_at", { ascending: true });
    const list = !error && data ? data : [];
    setAnswers(list);
    if (userId && list.length) {
      const res = await supabase
        .from("answer_votes")
        .select("answer_id")
        .in(
          "answer_id",
          list.map((a) => a.id),
        );
      setMyAnswerVotes(new Set((res.data || []).map((v) => v.answer_id)));
    } else {
      setMyAnswerVotes(new Set());
    }
  }

  function openPost(post) {
    setSelected({ ...post, views: post.views + 1 });
    setAnswers([]);
    setMyAnswerVotes(new Set());
    setAnswerText("");
    setAnswerError("");
    setEditing(null);
    answerPicker.clear();
    loadAnswers(post.id);
    // supabase queries only run once awaited or .then() is called
    supabase.rpc("increment_views", { post_id: post.id }).then(() => {});
  }

  function closePost() {
    setSelected(null);
    answerPicker.clear();
    loadPosts();
  }

  function changeTab(id) {
    setTab(id);
    setLoading(true);
    setAskOpen(false);
    setSort("newest");
    setStatus("all");
    setFormError("");
    postPicker.clear();
  }

  function closeForm() {
    setAskOpen(false);
    postPicker.clear();
  }

  /* ----- uploads ----- */

  async function uploadAll(items) {
    const paths = [];
    for (const it of items) {
      const ext = EXTENSIONS[it.blob.type] || "webp";
      const id =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : Date.now().toString(36) + Math.random().toString(36).slice(2);
      const path = user.id + "/" + id + "." + ext;
      const { error } = await supabase.storage.from(BUCKET).upload(path, it.blob, {
        contentType: it.blob.type,
        cacheControl: "31536000",
        upsert: false,
      });
      if (error) {
        await removeImages(paths);
        throw error;
      }
      paths.push(path);
    }
    return paths;
  }

  /* ----- create ----- */

  function setOption(i, value) {
    const options = form.options.map((o, idx) => (idx === i ? value : o));
    setForm({ ...form, options });
    setFormError("");
  }

  async function submitPost(e) {
    e.preventDefault();
    if (posting) return;
    const isPoll = tab === "poll";
    if (!form.title.trim() || (!isPoll && !form.body.trim())) {
      setFormError(isPoll ? "Enter your question." : "Enter a title and details.");
      return;
    }
    if (!user) {
      setFormError("Log in to post.");
      return;
    }
    const tags = form.tags
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean)
      .slice(0, 5);

    let options = [];
    if (isPoll) {
      options = form.options.map((o) => o.trim()).filter(Boolean);
      if (form.title.trim().length < 5) {
        setFormError("The question must be at least 5 characters.");
        return;
      }
      if (options.length < 2) {
        setFormError("Add at least two options.");
        return;
      }
      if (new Set(options.map((o) => o.toLowerCase())).size !== options.length) {
        setFormError("Options must be different.");
        return;
      }
    }

    setPosting(true);
    let paths;
    try {
      paths = await uploadAll(postPicker.items);
    } catch {
      setPosting(false);
      setFormError("Couldn't upload the images. Try again.");
      return;
    }

    let error;
    if (isPoll) {
      ({ error } = await supabase.rpc("create_poll", {
        p_title: form.title.trim(),
        p_body: form.body.trim(),
        p_field: form.field,
        p_tags: tags,
        p_options: options,
        p_images: paths,
      }));
    } else {
      ({ error } = await supabase.from("posts").insert({
        user_id: user.id,
        kind: tab,
        title: form.title.trim(),
        body: form.body.trim(),
        field: form.field,
        tags,
        author_name: authorName,
        images: paths,
      }));
    }
    setPosting(false);
    if (error) {
      await removeImages(paths);
      setFormError(
        error.code === "P0001" && error.message ? error.message : "Couldn't post. Try again.",
      );
      return;
    }
    setForm(EMPTY_FORM);
    setFormError("");
    setAskOpen(false);
    postPicker.clear();
    loadPosts();
  }

  async function submitAnswer(e) {
    e.preventDefault();
    if (answering) return;
    if (!answerText.trim()) {
      setAnswerError("Write something first.");
      return;
    }
    if (!user) {
      setAnswerError("Log in to reply.");
      return;
    }
    setAnswering(true);
    let paths;
    try {
      paths = await uploadAll(answerPicker.items);
    } catch {
      setAnswering(false);
      setAnswerError("Couldn't upload the images. Try again.");
      return;
    }
    const { error } = await supabase.from("answers").insert({
      post_id: selected.id,
      user_id: user.id,
      body: answerText.trim(),
      author_name: authorName,
      images: paths,
    });
    setAnswering(false);
    if (error) {
      await removeImages(paths);
      setAnswerError("Couldn't send. Try again.");
      return;
    }
    setAnswerText("");
    setAnswerError("");
    answerPicker.clear();
    loadAnswers(selected.id);
  }

  function startEdit(type, item) {
    setEditError("");
    setEditing({ type, id: item.id, title: item.title || "", body: item.body });
  }

  async function saveEdit(e) {
    e.preventDefault();
    if (saving || !editing) return;
    const body = editing.body.trim();
    const title = editing.title.trim();
    const isPost = editing.type === "post";
    if (isPost ? !title : !body) {
      setEditError(isPost ? "The title can't be empty." : "Write something first.");
      return;
    }
    if (isPost && selected.kind !== "poll" && !body) {
      setEditError("Enter a title and details.");
      return;
    }
    setSaving(true);
    const { error } = isPost
      ? await supabase.from("posts").update({ title, body }).eq("id", editing.id)
      : await supabase.from("answers").update({ body }).eq("id", editing.id);
    setSaving(false);
    if (error) {
      setEditError("Couldn't save. Try again.");
      return;
    }
    const edited_at = new Date().toISOString();
    if (isPost) setSelected((s) => ({ ...s, title, body, edited_at }));
    else setAnswers((prev) => prev.map((a) => (a.id === editing.id ? { ...a, body, edited_at } : a)));
    setEditing(null);
    setEditError("");
  }

  async function markSolved(answer) {
    const { error: e1 } = await supabase
      .from("answers")
      .update({ is_accepted: true })
      .eq("id", answer.id);
    const { error: e2 } = await supabase
      .from("posts")
      .update({ solved: true })
      .eq("id", selected.id);
    if (e1 || e2) return;
    setSelected({ ...selected, solved: true });
    setAnswers(
      answers.map((a) =>
        a.id === answer.id ? { ...a, is_accepted: true } : a,
      ),
    );
  }

  async function confirmDelete() {
    const { type, item } = deleteTarget;
    setDeleteTarget(null);
    const mine = (paths) => paths.filter((p) => p.startsWith(user.id + "/"));
    if (type === "post") {
      const { error } = await supabase.from("posts").delete().eq("id", item.id);
      if (error) return;
      removeImages(mine([...(item.images || []), ...answers.flatMap((a) => a.images || [])]));
      closePost();
      return;
    }
    const { error } = await supabase.from("answers").delete().eq("id", item.id);
    if (error) return;
    removeImages(mine(item.images || []));
    setAnswers((prev) => prev.filter((a) => a.id !== item.id));
    if (item.is_accepted) setSelected((s) => ({ ...s, solved: false }));
  }

  /* ----- poll votes ----- */

  function applyPollVote(postId, from, to) {
    const bump = (p) =>
      p.id !== postId
        ? p
        : {
            ...p,
            poll_options: p.poll_options.map((o) => {
              let votes = o.votes;
              if (o.id === from) votes -= 1;
              if (o.id === to) votes += 1;
              return { ...o, votes: Math.max(votes, 0) };
            }),
          };
    setPosts((ps) => ps.map(bump));
    setSelected((s) => (s ? bump(s) : s));
    setMyVotes((m) => {
      const next = { ...m };
      if (to) next[postId] = to;
      else delete next[postId];
      return next;
    });
  }

  async function votePoll(post, optionId) {
    if (!user) {
      flash("Log in to vote.");
      return;
    }
    if (pendingPoll.current.has(post.id)) return;
    const prev = myVotes[post.id] ?? null;
    const next = prev === optionId ? null : optionId;
    pendingPoll.current.add(post.id);
    applyPollVote(post.id, prev, next);

    const votes = supabase.from("poll_votes");
    let result;
    if (prev === null) {
      result = await votes.insert({ post_id: post.id, user_id: user.id, option_id: next });
    } else if (next === null) {
      result = await votes.delete().eq("post_id", post.id).eq("user_id", user.id);
    } else {
      result = await votes
        .update({ option_id: next })
        .eq("post_id", post.id)
        .eq("user_id", user.id);
    }
    pendingPoll.current.delete(post.id);
    if (result.error) {
      applyPollVote(post.id, next, prev);
      flash("Couldn't save your vote. Try again.");
    }
  }

  /* ----- likes on posts ----- */

  function applyPostLike(postId, add) {
    const bump = (p) =>
      p.id !== postId ? p : { ...p, likes: Math.max((p.likes || 0) + (add ? 1 : -1), 0) };
    setPosts((ps) => ps.map(bump));
    setSelected((s) => (s ? bump(s) : s));
    setMyLikes((prev) => {
      const next = new Set(prev);
      if (add) next.add(postId);
      else next.delete(postId);
      return next;
    });
  }

  async function togglePostLike(post) {
    if (!user) {
      flash("Log in to like.");
      return;
    }
    if (post.user_id === user.id) return;
    if (pendingLike.current.has(post.id)) return;
    const had = myLikes.has(post.id);
    pendingLike.current.add(post.id);
    applyPostLike(post.id, !had);

    const table = supabase.from("post_likes");
    const result = had
      ? await table.delete().eq("post_id", post.id).eq("user_id", user.id)
      : await table.insert({ post_id: post.id, user_id: user.id });
    pendingLike.current.delete(post.id);
    if (result.error) {
      applyPostLike(post.id, had);
      flash("Couldn't save your like. Try again.");
    }
  }

  /* ----- likes on answers and comments ----- */

  function applyUpvote(answerId, add) {
    setAnswers((prev) =>
      prev.map((a) =>
        a.id === answerId ? { ...a, votes: Math.max((a.votes || 0) + (add ? 1 : -1), 0) } : a,
      ),
    );
    setMyAnswerVotes((prev) => {
      const next = new Set(prev);
      if (add) next.add(answerId);
      else next.delete(answerId);
      return next;
    });
  }

  async function toggleUpvote(answer) {
    if (!user) {
      flash("Log in to like.");
      return;
    }
    if (answer.user_id === user.id) return;
    if (pendingUpvote.current.has(answer.id)) return;
    const had = myAnswerVotes.has(answer.id);
    pendingUpvote.current.add(answer.id);
    applyUpvote(answer.id, !had);

    const table = supabase.from("answer_votes");
    const result = had
      ? await table.delete().eq("answer_id", answer.id).eq("user_id", user.id)
      : await table.insert({ answer_id: answer.id, user_id: user.id });
    pendingUpvote.current.delete(answer.id);
    if (result.error) {
      applyUpvote(answer.id, had);
      flash("Couldn't save your like. Try again.");
    }
  }

  const isQuestion = tab === "question";
  const isPoll = tab === "poll";
  const sorts = isPoll ? POLL_SORTS : SORTS;

  const visible = posts
    .filter((p) => {
      const q = query.trim().toLowerCase();
      const okField = field === "All fields" || p.field === field;
      const okQuery =
        p.title.toLowerCase().includes(q) ||
        (p.tags || []).some((t) => t.includes(q));
      const okStatus =
        !isQuestion ||
        status === "all" ||
        (status === "solved" ? p.solved : !p.solved && answerCount(p) === 0);
      return okField && okQuery && okStatus;
    })
    .sort((a, b) => {
      if (sort === "likes") return (b.likes || 0) - (a.likes || 0);
      if (sort === "answers") return answerCount(b) - answerCount(a);
      if (sort === "votes") return pollTotal(b) - pollTotal(a);
      if (sort === "views") return b.views - a.views;
      return 0;
    });

  const notices = notice ? (
    <div className="community-notice" role="status">
      {notice}
    </div>
  ) : null;

  const viewer = lightbox ? (
    <Lightbox
      images={lightbox.paths}
      index={lightbox.index}
      onClose={closeLightbox}
      onIndex={moveLightbox}
    />
  ) : null;

  const likeTitle = (item) =>
    user && item.user_id === user.id ? "You can't like your own post" : undefined;

  if (selected) {
    const isOwner = user && selected.user_id === user.id;
    const postEditing = editing && editing.type === "post";
    const ordered = [...answers].sort(
      (a, b) =>
        Number(b.is_accepted) - Number(a.is_accepted) ||
        (b.votes || 0) - (a.votes || 0) ||
        new Date(a.created_at) - new Date(b.created_at),
    );
    const [, manyWord] = words(selected.kind);
    return (
      <Sidebar>
        <div className="community-page">
          <button className="community-back" onClick={closePost}>
            ← Back to community
          </button>
          {notices}

          <article className="community-detail">
            <div className="community-card-top">
              <span className="community-field">{selected.field}</span>
              {selected.kind === "poll" && <span className="community-kind">Poll</span>}
              {selected.solved && <span className="community-solved">Solved</span>}
            </div>
            {postEditing ? (
              <form className="community-edit" onSubmit={saveEdit}>
                <input
                  type="text"
                  aria-label="Edit title"
                  maxLength={150}
                  value={editing.title}
                  onChange={(e) => {
                    setEditing({ ...editing, title: e.target.value });
                    setEditError("");
                  }}
                />
                <textarea
                  aria-label="Edit text"
                  rows={6}
                  value={editing.body}
                  onChange={(e) => {
                    setEditing({ ...editing, body: e.target.value });
                    setEditError("");
                  }}
                />
                {editError && (
                  <p className="community-error" role="alert">
                    {editError}
                  </p>
                )}
                <div className="community-form-actions">
                  <button type="submit" className="community-primary" disabled={saving}>
                    {saving ? "Saving…" : "Save"}
                  </button>
                  <button type="button" className="community-secondary" onClick={() => setEditing(null)}>
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <>
                <h1>{selected.title}</h1>
                <div className="community-meta">
                  <span className="community-avatar">{initials(selected.author_name)}</span>
                  <span>
                    {selected.author_name} · {timeAgo(selected.created_at)}
                    {selected.edited_at ? " · edited" : ""} · {selected.views} views
                  </span>
                </div>
                {selected.body.trim() && <Body text={selected.body} />}
              </>
            )}
            <ImageGrid paths={selected.images} onOpen={openLightbox} />
            {selected.kind === "poll" && (
              <PollBox post={selected} myVote={myVotes[selected.id]} onVote={votePoll} />
            )}
            {(selected.tags || []).length > 0 && (
              <div className="community-tags">
                {selected.tags.map((t) => (
                  <span key={t}>{t}</span>
                ))}
              </div>
            )}
            <div className="community-post-actions">
              <LikeButton
                liked={myLikes.has(selected.id)}
                count={selected.likes || 0}
                disabled={!!isOwner}
                title={likeTitle(selected)}
                onClick={() => togglePostLike(selected)}
              />
            </div>
          </article>
          {isOwner && (
            <div className="community-owner-actions">
              {!editing && (
                <button className="community-link-btn" onClick={() => startEdit("post", selected)}>
                  Edit post
                </button>
              )}
              <button
                className="community-link-btn is-danger"
                onClick={() => setDeleteTarget({ type: "post", item: selected })}
              >
                Delete post
              </button>
            </div>
          )}

          <h2 className="community-subtitle">{countLabel(answers.length, selected.kind)}</h2>

          <div className="community-answers">
            {ordered.map((a) => {
              const canMark = isOwner && selected.kind === "question" && !selected.solved;
              const own = user && a.user_id === user.id;
              return (
                <div
                  key={a.id}
                  className={"community-answer" + (a.is_accepted ? " is-accepted" : "")}
                >
                  <div className="community-meta">
                    <span className="community-avatar">{initials(a.author_name)}</span>
                    <span>
                      {a.author_name} · {timeAgo(a.created_at)}
                      {a.edited_at ? " · edited" : ""}
                    </span>
                    {a.is_accepted && <span className="community-solved">Best answer</span>}
                  </div>
                  {editing && editing.type === "answer" && editing.id === a.id ? (
                    <form className="community-edit" onSubmit={saveEdit}>
                      <textarea
                        aria-label="Edit text"
                        rows={4}
                        autoFocus
                        value={editing.body}
                        onChange={(e) => {
                          setEditing({ ...editing, body: e.target.value });
                          setEditError("");
                        }}
                      />
                      {editError && (
                        <p className="community-error" role="alert">
                          {editError}
                        </p>
                      )}
                      <div className="community-form-actions">
                        <button type="submit" className="community-primary" disabled={saving}>
                          {saving ? "Saving…" : "Save"}
                        </button>
                        <button type="button" className="community-secondary" onClick={() => setEditing(null)}>
                          Cancel
                        </button>
                      </div>
                    </form>
                  ) : (
                    <Body text={a.body} />
                  )}
                  <ImageGrid paths={a.images} onOpen={openLightbox} />
                  <div className="community-answer-actions">
                    <LikeButton
                      liked={myAnswerVotes.has(a.id)}
                      count={a.votes || 0}
                      disabled={!!own}
                      title={own ? "You can't like your own " + words(selected.kind)[0] : undefined}
                      onClick={() => toggleUpvote(a)}
                    />
                    {canMark && (
                      <button className="community-link-btn" onClick={() => markSolved(a)}>
                        Mark as solved
                      </button>
                    )}
                    {own && !editing && (
                      <button className="community-link-btn" onClick={() => startEdit("answer", a)}>
                        Edit
                      </button>
                    )}
                    {own && (
                      <button
                        className="community-link-btn is-danger"
                        onClick={() => setDeleteTarget({ type: "answer", item: a })}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
            {answers.length === 0 && (
              <p className="community-empty-text">
                No {manyWord} yet. Be the first to write one.
              </p>
            )}
          </div>

          <form className="community-form" onSubmit={submitAnswer}>
            <label htmlFor="answer-text">
              {selected.kind === "question"
                ? "Your answer"
                : selected.kind === "poll"
                  ? "Your comment"
                  : "Your reply"}
            </label>
            <textarea
              id="answer-text"
              rows={5}
              value={answerText}
              onChange={(e) => {
                setAnswerText(e.target.value);
                setAnswerError("");
              }}
              onPaste={(e) => pasteImages(e, answerPicker)}
              placeholder="Wrap code in three backticks to format it"
            />
            <ImageField picker={answerPicker} id="answer-images" />
            {answerError && <p className="community-error">{answerError}</p>}
            <button type="submit" className="community-primary" disabled={answering}>
              {answering
                ? "Posting…"
                : selected.kind === "question"
                  ? "Post answer"
                  : selected.kind === "poll"
                    ? "Post comment"
                    : "Post reply"}
            </button>
          </form>
          {deleteTarget && (
            <div className="community-modal-backdrop" onClick={() => setDeleteTarget(null)}>
              <div
                className="community-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="delete-title"
                onClick={(e) => e.stopPropagation()}
              >
                <h2 id="delete-title">
                  {deleteTarget.type === "post" ? "Delete this post?" : "Delete this answer?"}
                </h2>
                <p>
                  {deleteTarget.type === "post"
                    ? "Its answers will be deleted too. This can't be undone."
                    : "This can't be undone."}
                </p>
                <div className="community-modal-actions">
                  <button
                    className="community-secondary"
                    autoFocus
                    onClick={() => setDeleteTarget(null)}
                  >
                    Cancel
                  </button>
                  <button className="community-danger" onClick={confirmDelete}>
                    Delete
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
        {viewer}
      </Sidebar>
    );
  }

  const emptyTitle = isQuestion ? "No questions yet" : isPoll ? "No polls yet" : "No experiences yet";
  const emptyText = isQuestion
    ? "Be the first to ask a question."
    : isPoll
      ? "Torn between two options? Ask the community to vote."
      : "Share what you've learned along the way.";

  return (
    <Sidebar>
      <div className="community-page">
        <header className="community-header">
          <div>
            <h1>Community</h1>
            <p>Ask questions, share experiences and help other learners.</p>
          </div>
          <button className="community-primary" onClick={() => (askOpen ? closeForm() : setAskOpen(true))}>
            {ADD_LABELS[tab]}
          </button>
        </header>

        <div className="community-tabs" role="tablist">
          {TABS.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              className={"community-tab" + (tab === t.id ? " is-active" : "")}
              onClick={() => changeTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
        <p className="community-hint">{TAB_HINTS[tab]}</p>

        {notices}

        {askOpen && (
          <form className="community-form" onSubmit={submitPost}>
            <label htmlFor="post-field">Field</label>
            <select
              id="post-field"
              value={form.field}
              onChange={(e) => setForm({ ...form, field: e.target.value })}
            >
              {POST_FIELDS.map((f) => (
                <option key={f}>{f}</option>
              ))}
            </select>

            <label htmlFor="post-title">{isPoll ? "Your question" : "Title"}</label>
            <input
              id="post-title"
              type="text"
              maxLength={150}
              value={form.title}
              onChange={(e) => {
                setForm({ ...form, title: e.target.value });
                setFormError("");
              }}
              placeholder={
                isQuestion
                  ? "How do I center a div with Flexbox?"
                  : isPoll
                    ? "React or Vue: which should I learn first?"
                    : "How I learned React"
              }
            />

            <label htmlFor="post-body">
              {isPoll ? "Details (optional)" : isQuestion ? "Details" : "Your experience"}
            </label>
            <textarea
              id="post-body"
              rows={isPoll ? 3 : 6}
              value={form.body}
              onChange={(e) => {
                setForm({ ...form, body: e.target.value });
                setFormError("");
              }}
              onPaste={(e) => pasteImages(e, postPicker)}
              placeholder={
                isPoll
                  ? "Tell people what you are choosing for"
                  : isQuestion
                    ? "Wrap code in three backticks to format it"
                    : "What did you do, what worked, and what would you tell someone starting today?"
              }
            />

            <ImageField picker={postPicker} id="post-images" />

            {isPoll && (
              <>
                <span className="community-label">Options (2 to {MAX_OPTIONS})</span>
                <div className="community-option-inputs">
                  {form.options.map((o, i) => (
                    <div key={i} className="community-option-input">
                      <input
                        type="text"
                        aria-label={"Option " + (i + 1)}
                        maxLength={80}
                        value={o}
                        placeholder={"Option " + (i + 1)}
                        onChange={(e) => setOption(i, e.target.value)}
                      />
                      {form.options.length > 2 && (
                        <button
                          type="button"
                          className="community-icon-btn"
                          aria-label={"Remove option " + (i + 1)}
                          onClick={() =>
                            setForm({
                              ...form,
                              options: form.options.filter((_, idx) => idx !== i),
                            })
                          }
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                {form.options.length < MAX_OPTIONS && (
                  <button
                    type="button"
                    className="community-link-btn"
                    onClick={() => setForm({ ...form, options: [...form.options, ""] })}
                  >
                    + Add option
                  </button>
                )}
              </>
            )}

            <label htmlFor="post-tags">Tags</label>
            <input
              id="post-tags"
              type="text"
              value={form.tags}
              onChange={(e) => setForm({ ...form, tags: e.target.value })}
              placeholder="react, css, git (up to 5, separated by commas)"
            />

            {formError && (
              <p className="community-error" role="alert">
                {formError}
              </p>
            )}
            <div className="community-form-actions">
              <button type="submit" className="community-primary" disabled={posting}>
                {posting ? "Posting…" : "Post"}
              </button>
              <button type="button" className="community-secondary" onClick={closeForm}>
                Cancel
              </button>
            </div>
          </form>
        )}

        <div className="community-toolbar">
          <div className="community-search">
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
              aria-label="Search posts"
              placeholder="Search by title or tag"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <select
            className="community-sort"
            aria-label="Sort posts"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            {sorts.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        {isQuestion && (
          <div className="community-statuses" role="group" aria-label="Status">
            {STATUSES.map((s) => (
              <button
                key={s.id}
                type="button"
                aria-pressed={status === s.id}
                className={"community-status" + (status === s.id ? " is-active" : "")}
                onClick={() => setStatus(s.id)}
              >
                {s.label}
              </button>
            ))}
          </div>
        )}

        <div className="community-fields">
          {FIELDS.map((f) => (
            <button
              key={f}
              className={"community-pill" + (field === f ? " is-active" : "")}
              onClick={() => setField(f)}
            >
              {f}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="community-list" aria-busy="true">
            {[0, 1, 2].map((i) => (
              <div key={i} className="community-card community-skeleton" />
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="community-empty">
            <h2>{emptyTitle}</h2>
            <p className="community-empty-text">{emptyText}</p>
          </div>
        ) : visible.length === 0 ? (
          <div className="community-empty">
            <h2>No results</h2>
            <p className="community-empty-text">Try a different search, status or field.</p>
          </div>
        ) : (
          <div className="community-list">
            {visible.map((p) => {
              const count = p.kind === "poll" ? pollTotal(p) : answerCount(p);
              const sideWord =
                p.kind === "poll"
                  ? count === 1
                    ? "vote"
                    : "votes"
                  : words(p.kind)[count === 1 ? 0 : 1];
              const stateClass = p.solved
                ? " is-solved"
                : p.kind === "question" && count === 0
                  ? " is-open"
                  : count > 0
                    ? " is-active"
                    : "";
              return (
                <article
                  key={p.id}
                  className="community-card"
                  onClick={(e) => {
                    if (!e.target.closest("button, a, input")) openPost(p);
                  }}
                >
                  <div className="community-card-side">
                    <div className={"community-stat" + stateClass}>
                      <strong>{count}</strong>
                      <span>{sideWord}</span>
                    </div>
                    <div className="community-views">
                      {p.views} {p.views === 1 ? "view" : "views"}
                    </div>
                  </div>
                  <div className="community-card-main">
                    <div className="community-card-top">
                      <span className="community-field">{p.field}</span>
                      {p.kind === "poll" && <span className="community-kind">Poll</span>}
                      {p.solved && <span className="community-solved">Solved</span>}
                    </div>
                    <h3>
                      <button type="button" className="community-title-btn" onClick={() => openPost(p)}>
                        {p.title}
                      </button>
                    </h3>
                    {p.kind === "poll" ? (
                      <PollBox post={p} myVote={myVotes[p.id]} onVote={votePoll} compact />
                    ) : (
                      <p className="community-preview">
                        {p.body.replace(/```[\s\S]*?```/g, " [code] ").replace(/```/g, "")}
                      </p>
                    )}
                    <ImageGrid paths={p.images} onOpen={openLightbox} small />
                    {(p.tags || []).length > 0 && (
                      <div className="community-tags">
                        {p.tags.map((t) => (
                          <span key={t}>{t}</span>
                        ))}
                      </div>
                    )}
                    <div className="community-card-bottom">
                      <div className="community-meta">
                        <span className="community-avatar">{initials(p.author_name)}</span>
                        <span>
                          {p.author_name} · {timeAgo(p.created_at)}
                        </span>
                      </div>
                      <div className="community-stats">
                        {p.kind === "poll" && <span>{countLabel(answerCount(p), "poll")}</span>}
                        <LikeButton
                          liked={myLikes.has(p.id)}
                          count={p.likes || 0}
                          disabled={!!user && p.user_id === user.id}
                          title={likeTitle(p)}
                          onClick={() => togglePostLike(p)}
                        />
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
      {viewer}
    </Sidebar>
  );
}