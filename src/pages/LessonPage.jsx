import "./LessonPage.css";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "../supabaseclient.js";
import { lessonKind } from "../progress.js";

const PART_INFO = {
  quiz: { label: "Quiz", text: "Quiz questions will appear here." },
  lab: { label: "Lab", text: "Lab instructions will appear here." },
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

  // Quiz / project / exam dərsləri birbaşa öz növünü göstərir,
  // adi dərslərdə isə URL-dəki part (theory / quiz / lab) göstərilir
  const current = kind !== "lesson" ? kind : part;
  const info = PART_INFO[current];

  return (
    <main className="lp-page">
      <Link className="lp-back" to="/lessons">← Lessons</Link>
      <span className="lp-kind">{info ? info.label : "Theory"}</span>
      <h1>{loading ? "Loading..." : title}</h1>

      {current === "theory" && (
        <article className="lp-pane">
          <div className="lp-video">Video will be added here</div>
          <div className="lp-text">
            <h2>{title}</h2>
            <p>Lesson text will be added here.</p>
          </div>
        </article>
      )}

      {info && (
        <article className="lp-pane lp-soon">
          <h2>{info.label}</h2>
          <p>{info.text}</p>
        </article>
      )}
    </main>
  );
}