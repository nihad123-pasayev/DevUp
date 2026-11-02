import "./LessonPage.css";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Sidebar from "./Sidebar";
import { supabase } from "../supabaseclient.js";

const TABS = [
  { id: "theory", label: "Theory" },
  { id: "quiz", label: "Quiz" },
  { id: "lab", label: "Lab" },
];

export default function LessonPage() {
  const { id, part = "theory" } = useParams();
  const [lesson, setLesson] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
  let off = false;

  async function loadData() {
    setLoading(true); // Asinxron funksiyanın daxilində çağırıldığı üçün linter xəta vermir
    
    const { data, error } = await supabase
      .from("lessons")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (off) return;

    if (error) console.error("lesson error:", error.code, error.message);
    setLesson(data);
    setLoading(false);
  }

  loadData();

  return () => {
    off = true;
  };
}, [id]);

  const title = lesson?.title || lesson?.name || "Lesson";

  return (
    <Sidebar>
      <main className="lp-page">
        <Link className="lp-back" to="/lessons">← Lessons</Link>
        <h1>{loading ? "Loading..." : title}</h1>

        <nav className="lp-tabs" aria-label="Lesson parts">
          {TABS.map((t) => (
            <Link
              key={t.id}
              to={`/lessons/lesson/${id}/${t.id}`}
              className={"lp-tab" + (part === t.id ? " is-active" : "")}
            >
              {t.label}
            </Link>
          ))}
        </nav>

        {part === "theory" && (
          <article className="lp-pane">
            <div className="lp-video">Video will be added here</div>
            <div className="lp-text">
              <h2>{title}</h2>
              <p>Lesson text will be added here.</p>
            </div>
          </article>
        )}

        {part === "quiz" && (
          <article className="lp-pane lp-soon">
            <h2>Quiz</h2>
            <p>Coming soon.</p>
          </article>
        )}

        {part === "lab" && (
          <article className="lp-pane lp-soon">
            <h2>Lab</h2>
            <p>Coming soon.</p>
          </article>
        )}
      </main>
    </Sidebar>
  );
}