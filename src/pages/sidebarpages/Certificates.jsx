import { useEffect, useState } from "react";
import Sidebar from "../Sidebar";
import { supabase } from "/src/supabaseclient.js";
import "./Certificates.css";

const TABS = [
  { id: "earned", label: "Earned" },
  { id: "progress", label: "In progress" },
];

const FIELDS = ["All fields", "Frontend", "Backend", "Cybersecurity", "Mobile"];

function formatDate(date) {
  return new Date(date).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function Certificates() {
  const [user, setUser] = useState(null);
  const [certs, setCerts] = useState([]);
  const [courses, setCourses] = useState([]);
  const [progress, setProgress] = useState({});
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("earned");
  const [field, setField] = useState("All fields");

  const userName =
    user?.user_metadata?.full_name ||
    (user?.email ? user.email.split("@")[0] : "");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data?.user ?? null));
  }, []);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      supabase
        .from("certificates")
        .select("id, course_id, code, issued_at, courses(title, field)")
        .order("issued_at", { ascending: false }),
      supabase.from("courses").select("id, title, field, lesson_count"),
      supabase
        .from("user_progress")
        .select("lessons(course_id)")
        .eq("completed", true),
    ]).then(([certRes, courseRes, progRes]) => {
      if (cancelled) return;
      setCerts(!certRes.error && certRes.data ? certRes.data : []);
      setCourses(!courseRes.error && courseRes.data ? courseRes.data : []);
      const counts = {};
      (!progRes.error && progRes.data ? progRes.data : []).forEach((r) => {
        const id = r.lessons?.course_id;
        if (id) counts[id] = (counts[id] || 0) + 1;
      });
      setProgress(counts);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const earnedIds = new Set(certs.map((c) => c.course_id));

  const visibleEarned = certs.filter(
    (c) => field === "All fields" || c.courses?.field === field,
  );

  const visibleProgress = courses.filter(
    (c) =>
      !earnedIds.has(c.id) &&
      (progress[c.id] || 0) > 0 &&
      (field === "All fields" || c.field === field),
  );

  const isEarned = tab === "earned";
  const list = isEarned ? visibleEarned : visibleProgress;
  const totalCount = isEarned
    ? certs.length
    : courses.filter((c) => !earnedIds.has(c.id) && (progress[c.id] || 0) > 0)
        .length;

  return (
    <div className="certs-layout">
      <Sidebar />
      <main className="certs-main">
        <div className="certs-page">
          <header className="certs-header">
            <h1>Certificates</h1>
            <p>Finish a roadmap to earn its certificate of completion.</p>
          </header>

          <div className="certs-tabs" role="tablist">
            {TABS.map((t) => (
              <button
                key={t.id}
                role="tab"
                aria-selected={tab === t.id}
                className={"certs-tab" + (tab === t.id ? " is-active" : "")}
                onClick={() => setTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="certs-fields">
            {FIELDS.map((f) => (
              <button
                key={f}
                className={"certs-field" + (field === f ? " is-active" : "")}
                onClick={() => setField(f)}
              >
                {f}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="certs-empty">
              <p className="certs-empty-text">Loading...</p>
            </div>
          ) : totalCount === 0 ? (
            <div className="certs-empty">
              <h2>
                {isEarned ? "No certificates yet" : "Nothing in progress"}
              </h2>
              <p className="certs-empty-text">
                {isEarned
                  ? "Finish a roadmap to earn your first certificate."
                  : "Start a lesson and your roadmap will show up here."}
              </p>
            </div>
          ) : list.length === 0 ? (
            <div className="certs-empty">
              <h2>No results</h2>
              <p className="certs-empty-text">Try a different field.</p>
            </div>
          ) : isEarned ? (
            <div className="certs-grid">
              {visibleEarned.map((c) => (
                <article className="certs-card" key={c.id}>
                  <div className="certs-preview">
                    <span className="certs-brand">DEVUP</span>
                    <span className="certs-kind">
                      Certificate of completion
                    </span>
                    <span className="certs-name">{userName}</span>
                    <span className="certs-kind">has completed</span>
                    <span className="certs-course">{c.courses?.title}</span>
                  </div>
                  <div className="certs-row">
                    <span className="certs-badge">{c.courses?.field}</span>
                    <span className="certs-date">
                      Issued {formatDate(c.issued_at)}
                    </span>
                  </div>
                  <span className="certs-code">ID: {c.code}</span>
                  <div className="certs-actions">
                    {/* onClick (View və Download PDF) sonrakı mərhələdə əlavə olunacaq */}
                    <button className="certs-btn-primary">View</button>
                    <button className="certs-btn-outline">Download PDF</button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="certs-grid">
              {visibleProgress.map((c) => {
                const done = progress[c.id] || 0;
                const total = c.lesson_count || 0;
                const percent = total
                  ? Math.min(100, Math.round((done / total) * 100))
                  : 0;
                return (
                  <article className="certs-card certs-card-locked" key={c.id}>
                    <div className="certs-row">
                      <span className="certs-badge">{c.field}</span>
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <rect x="5" y="11" width="14" height="9" rx="2" />
                        <path d="M8 11V8a4 4 0 0 1 8 0v3" />
                      </svg>
                    </div>
                    <h3>{c.title}</h3>
                    <div className="certs-bar">
                      <div
                        className="certs-bar-fill"
                        style={{ width: percent + "%" }}
                      />
                    </div>
                    <p className="certs-note">
                      {done} / {total} lessons. Finish all lessons to earn this
                      certificate.
                    </p>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
