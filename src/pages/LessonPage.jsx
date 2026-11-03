import "./LessonPage.css";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Sidebar from "../Sidebar";
import { supabase } from "../supabaseclient.js";
import { lessonKind } from "../progress.js";

const TABS = [
  { id: "theory", label: "Theory" },
  { id: "quiz", label: "Quiz" },
  { id: "lab", label: "Lab" },
];

const KIND_INFO = {
  quiz: { label: "Quiz", text: "Quiz questions will appear here." },
  project: { label: "Project", text: "Project instructions and submission will appear here." },
  exam: { label: "Exam", text: "The exam will appear here." },
};

export default function LessonPage() {
  const { id, part = "theory" } = useParams();
  const [res, setRes] = useState({ id: null, lesson: null });

  useEffect(() => {
    let off = false;
    supabase
      .from("lessons")
      .select("*")
      .eq("id", id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (off) return;
        if (error) console.error("lesson error:", error.code, error.message);
        setRes({ id, lesson: data });
      });
    return () => {
      off = true;
    };
  }, [id]);

  const loading = res.id !== id;
  const lesson = loading ? null : res.lesson;
  const title = lesson?.title || lesson?.name || "Lesson";
  const kind = lesson ? lessonKind(lesson) : "lesson";
  const direct = kind !== "lesson";

  return (
    <Sidebar>
      <main className="lp-page">
        <Link className="lp-back" to="/lessons">← Lessons</Link>
        {direct && <span className="lp-kind">{KIND_INFO[kind].label}</span>}
        <h1>{loading ? "Loading..." : title}</h1>

        {/* Quiz / layihə / imtahan: tabsız, birbaşa məzmun */}
        {direct && (
          <article className="lp-pane lp-soon">
            <h2>{KIND_INFO[kind].label}</h2>
            <p>{KIND_INFO[kind].text}</p>
          </article>
        )}

        {/* Adi dərs: Theory / Quiz / Lab */}
        {!direct && (
          <>
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
          </>
        )}
      </main>
    </Sidebar>
  );
}