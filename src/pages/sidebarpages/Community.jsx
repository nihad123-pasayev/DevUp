import { useState, useEffect } from "react";
import Sidebar from "../Sidebar";
import { supabase } from "/src/supabaseclient.js";
import "./Community.css";

const TABS = [
  { id: "question", label: "Questions" },
  { id: "experience", label: "Experiences" },
];
const FIELDS = ["All fields", "Frontend", "Backend", "Cybersecurity", "Mobile"];
const POST_FIELDS = FIELDS.slice(1);
const SORTS = [
  { id: "newest", label: "Newest" },
  { id: "answers", label: "Most answered" },
  { id: "views", label: "Most viewed" },
];

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

function countLabel(n, kind) {
  const word = kind === "question" ? "answer" : "reply";
  return n + " " + word + (n === 1 ? "" : "s");
}

function Body({ text }) {
  const parts = text.split("```");
  return (
    <div className="community-body">
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <pre key={i} className="community-code">
            <code>{part.replace(/^\w*\n/, "").trim()}</code>
          </pre>
        ) : (
          part.trim() && <p key={i}>{part.trim()}</p>
        ),
      )}
    </div>
  );
}

export default function Community() {
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState("question");
  const [field, setField] = useState("All fields");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("newest");
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  const [askOpen, setAskOpen] = useState(false);
  const [form, setForm] = useState({
    field: "Frontend",
    title: "",
    body: "",
    tags: "",
  });
  const [formError, setFormError] = useState("");

  const [selected, setSelected] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [answerText, setAnswerText] = useState("");
  const [answerError, setAnswerError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const authorName =
    user?.user_metadata?.full_name ||
    (user?.email ? user.email.split("@")[0] : "");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data?.user ?? null));
  }, []);

  useEffect(() => {
    let cancelled = false;
    supabase
      .from("posts")
      .select(
        "id, user_id, kind, title, body, field, tags, views, solved, author_name, created_at, answers(count)",
      )
      .eq("kind", tab)
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (cancelled) return;
        setPosts(!error && data ? data : []);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tab, refreshKey]);

  const loadPosts = () => setRefreshKey((k) => k + 1);

  async function loadAnswers(postId) {
    const { data, error } = await supabase
      .from("answers")
      .select("id, user_id, body, author_name, is_accepted, created_at")
      .eq("post_id", postId)
      .order("created_at", { ascending: true });
    setAnswers(!error && data ? data : []);
  }

  function openPost(post) {
    setSelected({ ...post, views: post.views + 1 });
    setAnswers([]);
    setAnswerText("");
    setAnswerError("");
    loadAnswers(post.id);
    supabase.rpc("increment_views", { post_id: post.id });
  }

  function closePost() {
    setSelected(null);
    loadPosts();
  }

  async function submitPost(e) {
    e.preventDefault();
    if (!form.title.trim() || !form.body.trim()) {
      setFormError("Enter a title and details.");
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
    const { error } = await supabase.from("posts").insert({
      user_id: user.id,
      kind: tab,
      title: form.title.trim(),
      body: form.body.trim(),
      field: form.field,
      tags,
      author_name: authorName,
    });
    if (error) {
      setFormError("Couldn't post. Try again.");
      return;
    }
    setForm({ field: "Frontend", title: "", body: "", tags: "" });
    setFormError("");
    setAskOpen(false);
    loadPosts();
  }

  async function submitAnswer(e) {
    e.preventDefault();
    if (!answerText.trim()) {
      setAnswerError("Write something first.");
      return;
    }
    if (!user) {
      setAnswerError("Log in to reply.");
      return;
    }
    const { error } = await supabase.from("answers").insert({
      post_id: selected.id,
      user_id: user.id,
      body: answerText.trim(),
      author_name: authorName,
    });
    if (error) {
      setAnswerError("Couldn't send. Try again.");
      return;
    }
    setAnswerText("");
    setAnswerError("");
    loadAnswers(selected.id);
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
  async function deleteAnswer(answer) {
    if (!window.confirm("Delete this answer?")) return;
    const { error } = await supabase
      .from("answers")
      .delete()
      .eq("id", answer.id);
    if (error) return;
    setAnswers((prev) => prev.filter((a) => a.id !== answer.id));
    if (answer.is_accepted) setSelected((s) => ({ ...s, solved: false }));
  }

  const answerCount = (p) => p.answers?.[0]?.count ?? 0;

  const visible = posts
    .filter((p) => {
      const q = query.trim().toLowerCase();
      const okField = field === "All fields" || p.field === field;
      const okQuery =
        p.title.toLowerCase().includes(q) ||
        (p.tags || []).some((t) => t.includes(q));
      return okField && okQuery;
    })
    .sort((a, b) => {
      if (sort === "answers") return answerCount(b) - answerCount(a);
      if (sort === "views") return b.views - a.views;
      return 0;
    });

  const isQuestion = tab === "question";

  if (selected) {
    const isOwner = user && selected.user_id === user.id;
    return (
      <div className="community-layout">
        <Sidebar />
        <main className="community-main">
          <div className="community-page">
            <button className="community-back" onClick={closePost}>
              ← Back to community
            </button>

            <article className="community-detail">
              <div className="community-card-top">
                <span className="community-field">{selected.field}</span>
                {selected.solved && (
                  <span className="community-solved">Solved</span>
                )}
              </div>
              <h1>{selected.title}</h1>
              <div className="community-meta">
                <span className="community-avatar">
                  {initials(selected.author_name)}
                </span>
                <span>
                  {selected.author_name} · {timeAgo(selected.created_at)} ·{" "}
                  {selected.views} views
                </span>
              </div>
              <Body text={selected.body} />
              {(selected.tags || []).length > 0 && (
                <div className="community-tags">
                  {selected.tags.map((t) => (
                    <span key={t}>{t}</span>
                  ))}
                </div>
              )}
            </article>

            <h2 className="community-subtitle">
              {countLabel(answers.length, selected.kind)}
            </h2>

            <div className="community-answers">
              {answers.map((a) => {
                const canMark =
                  isOwner && selected.kind === "question" && !selected.solved;
                const canDelete = user && a.user_id === user.id;
                return (
                  <div
                    key={a.id}
                    className={
                      "community-answer" + (a.is_accepted ? " is-accepted" : "")
                    }
                  >
                    <div className="community-meta">
                      <span className="community-avatar">
                        {initials(a.author_name)}
                      </span>
                      <span>
                        {a.author_name} · {timeAgo(a.created_at)}
                      </span>
                      {a.is_accepted && (
                        <span className="community-solved">Accepted</span>
                      )}
                    </div>
                    <Body text={a.body} />
                    {(canMark || canDelete) && (
                      <div className="community-answer-actions">
                        {canMark && (
                          <button
                            className="community-link-btn"
                            onClick={() => markSolved(a)}
                          >
                            Mark as solved
                          </button>
                        )}
                        {canDelete && (
                          <button
                            className="community-link-btn is-danger"
                            onClick={() => deleteAnswer(a)}
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <form className="community-form" onSubmit={submitAnswer}>
              <label htmlFor="answer-text">
                {selected.kind === "question" ? "Your answer" : "Your reply"}
              </label>
              <textarea
                id="answer-text"
                rows={5}
                value={answerText}
                onChange={(e) => {
                  setAnswerText(e.target.value);
                  setAnswerError("");
                }}
                placeholder="Wrap code in three backticks to format it"
              />
              {answerError && <p className="community-error">{answerError}</p>}
              <button type="submit" className="community-primary">
                {selected.kind === "question" ? "Post answer" : "Post reply"}
              </button>
            </form>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="community-layout">
      <Sidebar />
      <main className="community-main">
        <div className="community-page">
          <header className="community-header">
            <div>
              <h1>Community</h1>
              <p>Ask questions, share experiences and help other learners.</p>
            </div>
            <button
              className="community-primary"
              onClick={() => setAskOpen(!askOpen)}
            >
              {isQuestion ? "+ Ask a question" : "+ Share an experience"}
            </button>
          </header>

          <div className="community-tabs" role="tablist">
            {TABS.map((t) => (
              <button
                key={t.id}
                role="tab"
                aria-selected={tab === t.id}
                className={"community-tab" + (tab === t.id ? " is-active" : "")}
                onClick={() => {
                  setTab(t.id);
                  setLoading(true);
                  setAskOpen(false);
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

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

              <label htmlFor="post-title">Title</label>
              <input
                id="post-title"
                type="text"
                value={form.title}
                onChange={(e) => {
                  setForm({ ...form, title: e.target.value });
                  setFormError("");
                }}
                placeholder={
                  isQuestion
                    ? "How do I center a div with Flexbox?"
                    : "How I learned React"
                }
              />

              <label htmlFor="post-body">Details</label>
              <textarea
                id="post-body"
                rows={6}
                value={form.body}
                onChange={(e) => {
                  setForm({ ...form, body: e.target.value });
                  setFormError("");
                }}
                placeholder="Wrap code in three backticks to format it"
              />

              <label htmlFor="post-tags">Tags</label>
              <input
                id="post-tags"
                type="text"
                value={form.tags}
                onChange={(e) => setForm({ ...form, tags: e.target.value })}
                placeholder="react, css, git (up to 5, separated by commas)"
              />

              {formError && <p className="community-error">{formError}</p>}
              <div className="community-form-actions">
                <button type="submit" className="community-primary">
                  Post
                </button>
                <button
                  type="button"
                  className="community-secondary"
                  onClick={() => setAskOpen(false)}
                >
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
              {SORTS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

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
            <div className="community-empty">
              <p className="community-empty-text">Loading...</p>
            </div>
          ) : posts.length === 0 ? (
            <div className="community-empty">
              <h2>{isQuestion ? "No questions yet" : "No experiences yet"}</h2>
              <p className="community-empty-text">
                {isQuestion
                  ? "Be the first to ask a question."
                  : "Share what you've learned along the way."}
              </p>
            </div>
          ) : visible.length === 0 ? (
            <div className="community-empty">
              <h2>No results</h2>
              <p className="community-empty-text">
                Try a different search or field.
              </p>
            </div>
          ) : (
            <div className="community-list">
              {visible.map((p) => (
                <article
                  key={p.id}
                  className="community-card"
                  role="button"
                  tabIndex={0}
                  onClick={() => openPost(p)}
                  onKeyDown={(e) => e.key === "Enter" && openPost(p)}
                >
                  <div className="community-card-top">
                    <span className="community-field">{p.field}</span>
                    {p.solved && (
                      <span className="community-solved">Solved</span>
                    )}
                  </div>
                  <h3>{p.title}</h3>
                  <p className="community-preview">
                    {p.body.replace(/```/g, "")}
                  </p>
                  {(p.tags || []).length > 0 && (
                    <div className="community-tags">
                      {p.tags.map((t) => (
                        <span key={t}>{t}</span>
                      ))}
                    </div>
                  )}
                  <div className="community-card-bottom">
                    <div className="community-meta">
                      <span className="community-avatar">
                        {initials(p.author_name)}
                      </span>
                      <span>
                        {p.author_name} · {timeAgo(p.created_at)}
                      </span>
                    </div>
                    <div className="community-stats">
                      <span>{countLabel(answerCount(p), p.kind)}</span>
                      <span>{p.views} views</span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
