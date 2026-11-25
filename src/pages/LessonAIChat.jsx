import { useEffect, useRef, useState } from "react";
import { supabase } from "../supabaseclient.js";
import "./LessonAIChat.css";

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
  const blocks = text.split(/```[\w-]*\n?([\s\S]*?)```/g);
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

export default function LessonAIChat({ lessonId, lessonTitle }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const listRef = useRef(null);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages, loading]);

  async function ask(mode, text) {
    if (loading) return;
    const question = mode === "summary" ? "Make a summary (konspekt) of this lesson" : text.trim();
    if (!question) return;

    const next = [...messages, { role: "user", text: question }];
    setMessages(next);
    setInput("");
    setError("");
    setLoading(true);

    const { data, error: fnError } = await supabase.functions.invoke("lesson-ai", {
      body: { lessonId, mode, messages: next },
    });

    if (fnError) {
      let msg = "Something went wrong. Try again.";
      try {
        const body = await fnError.context.json();
        if (body?.error) msg = body.error;
      } catch {
        // keep the default message
      }
      setError(msg);
      setMessages(messages);
      setInput(mode === "summary" ? "" : question);
    } else {
      setMessages([...next, { role: "model", text: data.answer }]);
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

  return (
    <>
      <button type="button" className="ai-fab" onClick={() => setOpen(true)} aria-label="Open AI assistant">
        Ask AI
      </button>

      <aside className={`ai-panel ${open ? "ai-panel-open" : ""}`}>
        <div className="ai-header">
          <div>
            <p className="ai-title">AI Assistant</p>
            <p className="ai-subtitle">{lessonTitle}</p>
          </div>
          <button type="button" className="ai-close" onClick={() => setOpen(false)} aria-label="Close assistant">
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

          {messages.map((m, i) => (
            <div key={i} className={`ai-msg ${m.role === "user" ? "ai-msg-user" : "ai-msg-bot"}`}>
              {m.role === "user" ? m.text : renderAnswer(m.text)}
              {m.role === "model" && (
                <button type="button" className="ai-copy" onClick={() => copyAnswer(m.text)}>
                  Copy
                </button>
              )}
            </div>
          ))}

          {loading && <div className="ai-msg ai-msg-bot ai-typing">Thinking…</div>}
        </div>

        {error && <p className="ai-error">{error}</p>}

        <button type="button" className="ai-summary-btn" onClick={() => ask("summary", "")} disabled={loading}>
          Make a lesson summary
        </button>

        <form className="ai-form" onSubmit={handleSubmit}>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about this lesson…"
            rows={2}
            maxLength={2000}
            disabled={loading}
          />
          <button type="submit" disabled={loading || !input.trim()}>
            Send
          </button>
        </form>
      </aside>
    </>
  );
}