import { useEffect, useRef, useState } from "react";
import { supabase } from "../supabaseclient.js";
import "./LessonAIChat.css";

const FUNCTION_NAME = "dynamic-endpoint";
const BOT_AVATAR = "/photos/ai-bot.png";

// Small Markdown renderer: code blocks, `inline code`, **bold**, headings
function renderInline(line, keyPrefix) {
  const pieces = line.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return pieces.map((piece, i) => {
    const key = `${keyPrefix}-${i}`;
    if (piece.startsWith("**") && piece.endsWith("**") && piece.length > 4) {
      return <strong key={key}>{piece.slice(2, -2)}</strong>;
    }
    if (piece.startsWith("`") && piece.endsWith("`") && piece.length > 2) {
      return <code key={key} className="ai-inline-code">{piece.slice(1, -1)}</code>;
    }
    return piece;
  });
}

function renderAnswer(text) {
  // While the answer is still being typed, a code block may not be closed yet
  const unclosed = (text.match(/```/g) || []).length % 2 === 1;
  const source = unclosed ? text + "\n```" : text;
  const blocks = source.split(/```[\w-]*\n?([\s\S]*?)```/g);
  return blocks.map((block, i) => {
    if (i % 2 === 1) {
      return (
        <pre key={i} className="ai-code-block">
          <code>{block.replace(/\n$/, "")}</code>
        </pre>
      );
    }
    return (
      <div key={i} className="ai-text">
        {block.split("\n").map((line, j) => {
          const heading = line.match(/^#{1,6}\s+(.*)$/);
          if (heading) {
            return (
              <p key={j} className="ai-heading">
                {renderInline(heading[1], `${i}-${j}`)}
              </p>
            );
          }
          return (
            <p key={j} className={line.trim() ? "" : "ai-gap"}>
              {renderInline(line, `${i}-${j}`)}
            </p>
          );
        })}
      </div>
    );
  });
}

function Avatar() {
  return <img className="ai-avatar" src={BOT_AVATAR} alt="AI" />;
}

export default function LessonAIChat({ lessonId, lessonTitle }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false); // used on phones only
  const listRef = useRef(null);
  const abortRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages, loading]);

  // Stop everything if the student leaves the lesson
  useEffect(() => {
    return () => {
      if (abortRef.current) abortRef.current.abort();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  async function ask(mode, text) {
    if (loading) return;
    const question = mode === "summary" ? "Make a summary of this lesson" : text.trim();
    if (!question) return;

    const next = [...messages, { role: "user", text: question }];
    setMessages(next);
    setInput("");
    setError("");
    setLoading(true);

    const controller = new AbortController();
    abortRef.current = controller;

    let full = ""; // everything received so far
    let shown = 0; // how many characters are visible
    let streamEnded = false;
    let failure = "";

    // Types the received text on screen a little at a time
    const typing = new Promise((resolve) => {
      timerRef.current = setInterval(() => {
        if (shown < full.length) {
          const gap = full.length - shown;
          shown = Math.min(full.length, shown + Math.max(2, Math.ceil(gap / 20)));
          setMessages([...next, { role: "model", text: full.slice(0, shown) }]);
        } else if (streamEnded) {
          clearInterval(timerRef.current);
          resolve();
        }
      }, 30);
    });

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token ?? "";
      const baseUrl = supabase.supabaseUrl || import.meta.env.VITE_SUPABASE_URL;
      const anonKey = supabase.supabaseKey || import.meta.env.VITE_SUPABASE_ANON_KEY;

      const res = await fetch(`${baseUrl}/functions/v1/${FUNCTION_NAME}`, {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
          ...(anonKey ? { apikey: anonKey } : {}),
        },
        body: JSON.stringify({ lessonId, mode, messages: next }),
      });

      if (!res.ok || !res.body) {
        let msg = "Something went wrong. Try again.";
        try {
          const body = await res.json();
          if (body?.error) msg = body.error;
        } catch {
          // keep the default message
        }
        throw new Error(msg);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          let event;
          try {
            event = JSON.parse(line);
          } catch {
            continue;
          }
          if (event.t) full += event.t;
          if (event.error) failure = event.error;
        }
      }
    } catch (err) {
      if (err?.name === "AbortError") return;
      failure = err?.message || "Something went wrong. Try again.";
    }

    streamEnded = true;
    await typing;

    if (failure) {
      setError(failure);
      if (!full) {
        // nothing was answered: remove the question and give the text back
        setMessages(messages);
        setInput(mode === "summary" ? "" : question);
      }
    }
    setLoading(false);
  }

  function handleSubmit(e) {
    e.preventDefault();
    ask("chat", input);
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      ask("chat", input);
    }
  }

  async function copyAnswer(text) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // clipboard not available
    }
  }

  const waiting = loading && messages[messages.length - 1]?.role === "user";

  return (
    <>
      <button
        type="button"
        className="ai-fab"
        onClick={() => setOpen(true)}
        aria-label="Open AI assistant"
      >
        Ask AI
      </button>

      <aside className={`ai-panel ${open ? "ai-panel-open" : ""}`}>
        <div className="ai-header">
          <Avatar />
          <div className="ai-header-text">
            <p className="ai-title">AI Assistant</p>
            <p className="ai-subtitle">{lessonTitle}</p>
          </div>
          <button
            type="button"
            className="ai-close"
            onClick={() => setOpen(false)}
            aria-label="Close assistant"
          >
            ×
          </button>
        </div>

        <div className="ai-messages" ref={listRef}>
          {messages.length === 0 && (
            <div className="ai-empty">
              <p>Didn't understand something in this lesson? Ask here.</p>
              <p className="ai-empty-example">For example: "Explain this with a simple example"</p>
            </div>
          )}

          {messages.map((m, i) =>
            m.role === "user" ? (
              <div key={i} className="ai-row ai-row-user">
                <div className="ai-msg ai-msg-user">{m.text}</div>
              </div>
            ) : (
              <div key={i} className="ai-row ai-row-bot">
                <Avatar />
                <div className="ai-msg ai-msg-bot">
                  {renderAnswer(m.text)}
                  {!loading && (
                    <button type="button" className="ai-copy" onClick={() => copyAnswer(m.text)}>
                      Copy
                    </button>
                  )}
                </div>
              </div>
            ),
          )}

          {waiting && (
            <div className="ai-row ai-row-bot">
              <Avatar />
              <span className="ai-thinking">Thinking…</span>
            </div>
          )}
        </div>

        {error && <p className="ai-error">{error}</p>}

        <button
          type="button"
          className="ai-summary-btn"
          onClick={() => ask("summary", "")}
          disabled={loading}
        >
          Make a lesson summary
        </button>

        <form className="ai-form" onSubmit={handleSubmit}>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message"
            rows={1}
            maxLength={2000}
            disabled={loading}
          />
          <button type="submit" className="ai-send" disabled={loading || !input.trim()} aria-label="Send">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 19V5" />
              <path d="M5 12l7-7 7 7" />
            </svg>
          </button>
        </form>
      </aside>
    </>
  );
}