import { useState, useEffect, useRef } from "react";
import Sidebar from "../Sidebar";
import { supabase } from "/src/supabaseclient.js";
import "./Community.css";

const TABS = [
  { id: "question", label: "Questions" },
  { id: "poll", label: "Polls" },
  { id: "experience", label: "Experiences" },
];
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
  { id: "answers", label: "Most answered" },
  { id: "views", label: "Most viewed" },
];
const POLL_SORTS = [
  { id: "newest", label: "Newest" },
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
  const [refreshKey, setRefreshKey] = useState(0);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const [myVotes, setMyVotes] = useState({});
  const [myAnswerVotes, setMyAnswerVotes] = useState(() => new Set());
  const [notice, setNotice] = useState("");
  const noticeTimer = useRef(null);
  const pendingPoll = useRef(new Set());
  const pendingUpvote = useRef(new Set());

  const authorName =
    user?.user_metadata?.full_name ||
    (user?.email ? user.email.split("@")[0] : "");

  function flash(message) {
    setNotice(message);
    clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(""), 3500);
  }

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data?.user ?? null));
    return () => clearTimeout(noticeTimer.current);
  }, []);

  useEffect(() => {
    let cancelled = false;
    supabase
      .from("posts")
      .select(
        "id, user_id, kind, title, body, field, tags, views, solved, author_name, created_at, answers_count, poll_options(id, position, label, votes)",
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
      .select("id, user_id, body, author_name, is_accepted, votes, created_at")
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
    loadAnswers(post.id);
    // supabase queries only run once awaited or .then() is called
    supabase.rpc("increment_views", { post_id: post.id }).then(() => {});
  }

  function closePost() {
    setSelected(null);
    loadPosts();
  }

  function changeTab(id) {
    setTab(id);
    setLoading(true);
    setAskOpen(false);
    setSort("newest");
    setStatus("all");
    setFormError("");
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
    let error;
    if (isPoll) {
      ({ error } = await supabase.rpc("create_poll", {
        p_title: form.title.trim(),
        p_body: form.body.trim(),
        p_field: form.field,
        p_tags: tags,
        p_options: options,
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
      }));
    }
    setPosting(false);
    if (error) {
      setFormError(
        error.code === "P0001" && error.message ? error.message : "Couldn't post. Try again.",
      );
      return;
    }
    setForm(EMPTY_FORM);
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

  async function confirmDelete() {
    const { type, item } = deleteTarget;
    setDeleteTarget(null);
    if (type === "post") {
      const { error } = await supabase.from("posts").delete().eq("id", item.id);
      if (error) return;
      closePost();
      return;
    }
    const { error } = await supabase.from("answers").delete().eq("id", item.id);
    if (error) return;
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

  /* ----- answer upvotes ----- */

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
      flash("Log in to vote.");
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
      flash("Couldn't save your vote. Try again.");
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

  if (selected) {
    const isOwner = user && selected.user_id === user.id;
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
            <h1>{selected.title}</h1>
            <div className="community-meta">
              <span className="community-avatar">{initials(selected.author_name)}</span>
              <span>
                {selected.author_name} · {timeAgo(selected.created_at)} · {selected.views} views
              </span>
            </div>
            {selected.body.trim() && <Body text={selected.body} />}
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
          </article>
          {isOwner && (
            <button
              className="community-link-btn is-danger"
              onClick={() => setDeleteTarget({ type: "post", item: selected })}
            >
              Delete post
            </button>
          )}

          <h2 className="community-subtitle">{countLabel(answers.length, selected.kind)}</h2>

          <div className="community-answers">
            {ordered.map((a) => {
              const canMark = isOwner && selected.kind === "question" && !selected.solved;
              const canDelete = user && a.user_id === user.id;
              const own = user && a.user_id === user.id;
              const voted = myAnswerVotes.has(a.id);
              return (
                <div
                  key={a.id}
                  className={"community-answer" + (a.is_accepted ? " is-accepted" : "")}
                >
                  <div className="community-answer-row">
                    <button
                      type="button"
                      className={"community-upvote" + (voted ? " is-voted" : "")}
                      aria-pressed={voted}
                      aria-label={voted ? "Remove your vote" : "Upvote"}
                      title={own ? "You can't vote for your own " + words(selected.kind)[0] : "Upvote"}
                      disabled={!!own}
                      onClick={() => toggleUpvote(a)}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                        <path d="M12 4 3 16h6v4h6v-4h6z" />
                      </svg>
                      <span>{a.votes || 0}</span>
                    </button>
                    <div className="community-answer-main">
                      <div className="community-meta">
                        <span className="community-avatar">{initials(a.author_name)}</span>
                        <span>
                          {a.author_name} · {timeAgo(a.created_at)}
                        </span>
                        {a.is_accepted && <span className="community-solved">Best answer</span>}
                      </div>
                      <Body text={a.body} />
                      {(canMark || canDelete) && (
                        <div className="community-answer-actions">
                          {canMark && (
                            <button className="community-link-btn" onClick={() => markSolved(a)}>
                              Mark as solved
                            </button>
                          )}
                          {canDelete && (
                            <button
                              className="community-link-btn is-danger"
                              onClick={() => setDeleteTarget({ type: "answer", item: a })}
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      )}
                    </div>
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
              placeholder="Wrap code in three backticks to format it"
            />
            {answerError && <p className="community-error">{answerError}</p>}
            <button type="submit" className="community-primary">
              {selected.kind === "question"
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
          <button className="community-primary" onClick={() => setAskOpen(!askOpen)}>
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

            <label htmlFor="post-body">{isPoll ? "Details (optional)" : "Details"}</label>
            <textarea
              id="post-body"
              rows={isPoll ? 3 : 6}
              value={form.body}
              onChange={(e) => {
                setForm({ ...form, body: e.target.value });
                setFormError("");
              }}
              placeholder={
                isPoll
                  ? "Tell people what you are choosing for"
                  : "Wrap code in three backticks to format it"
              }
            />

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
                      {p.kind === "poll" && (
                        <span className="community-stats">{countLabel(answerCount(p), "poll")}</span>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </Sidebar>
  );
}