import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseclient.js";
import "./MyProjects.css";

// "My projects" tab: every completed project lesson of the user
export default function MyProjects() {
  const navigate = useNavigate();
  const [items, setItems] = useState(null); // null = loading
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    async function load() {
      const { data: auth } = await supabase.auth.getUser();
      const user = auth?.user;
      if (!user) {
        if (alive) setItems([]);
        return;
      }

      const { data: done, error: e1 } = await supabase
        .from("user_progress")
        .select("lesson_id, completed_at, lessons!inner(id, title, kind, stages!inner(roadmaps!inner(field, track, title)))")
        .eq("user_id", user.id)
        .eq("status", "completed")
        .eq("lessons.kind", "project")
        .order("completed_at", { ascending: false });

      if (!alive) return;
      if (e1) {
        setError("Could not load your projects.");
        setItems([]);
        return;
      }
      const ids = (done || []).map((d) => d.lesson_id);
      if (!ids.length) {
        setItems([]);
        return;
      }

      const [contentRes, subRes] = await Promise.all([
        supabase.from("lesson_content").select("lesson_id, type:lab_data->>type, ptitle:lab_data->>title").in("lesson_id", ids),
        supabase.from("project_submissions").select("lesson_id, repo_url").eq("user_id", user.id).in("lesson_id", ids),
      ]);
      if (!alive) return;

      const content = new Map((contentRes.data || []).map((c) => [c.lesson_id, c]));
      const repos = new Map((subRes.data || []).map((s) => [s.lesson_id, s.repo_url]));

      setItems(
        done.map((d) => {
          const road = d.lessons?.stages?.roadmaps;
          const c = content.get(d.lesson_id);
          return {
            id: d.lesson_id,
            title: c?.ptitle || d.lessons?.title || "Project",
            type: c?.type,
            field: road?.field,
            roadmap: road?.title,
            completedAt: d.completed_at,
            repo: repos.get(d.lesson_id),
          };
        }),
      );
    }
    load();
    return () => {
      alive = false;
    };
  }, []);

  if (items === null) return <p className="mp-note">Loading…</p>;
  if (error) return <p className="mp-note">{error}</p>;
  if (!items.length) {
    return <p className="mp-note">No completed projects yet. Finish a project lesson and it will appear here.</p>;
  }

  return (
    <div className="mp-grid">
      {items.map((p) => (
        <button
          key={p.id}
          type="button"
          className="mp-card"
          onClick={() => navigate(p.type === "capstone" ? `/capstone/${p.id}` : `/project/${p.id}`)}
        >
          <span className="mp-badges">
            <span className="mp-badge is-done">Completed</span>
            {p.repo && <span className="mp-badge is-gh">On GitHub</span>}
          </span>
          <strong className="mp-title">{p.title}</strong>
          <span className="mp-meta">
            {[p.field, p.roadmap, p.type === "capstone" ? "Certification project" : "Unit project"].filter(Boolean).join(" · ")}
          </span>
        </button>
      ))}
    </div>
  );
}