import { useEffect, useState } from "react";
import Sidebar from "../Sidebar";
import { supabase } from "/src/supabaseclient.js";
import "./Certificates.css";

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
const RANK = { earned: 0, progress: 1, new: 2 };

const EMPTY = {
  earned: [
    "No certificates yet",
    "Finish a roadmap to earn your first certificate.",
  ],
  progress: [
    "Nothing in progress",
    "Start a lesson and your roadmap will show up here.",
  ],
  new: ["Everything started", "You've started every roadmap."],
  all: [
    "No certificates yet",
    "Roadmaps and certificates will appear here soon.",
  ],
};

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
  const [tab, setTab] = useState("all");
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
      supabase.from("certificates").select("id, course_id, code, issued_at"),
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

  const certByCourse = {};
  certs.forEach((c) => {
    certByCourse[c.course_id] = c;
  });

  const items = courses
    .map((course) => {
      const cert = certByCourse[course.id];
      const done = progress[course.id] || 0;
      const state = cert ? "earned" : done > 0 ? "progress" : "new";
      return { course, cert, done, state };
    })
    .sort((a, b) => RANK[a.state] - RANK[b.state]);

  const counts = {
    all: items.length,
    earned: items.filter((i) => i.state === "earned").length,
    progress: items.filter((i) => i.state === "progress").length,
    new: items.filter((i) => i.state === "new").length,
  };

  const TABS = [
    { id: "all", label: "All" },
    { id: "earned", label: "Earned" },
    { id: "progress", label: "In progress" },
    { id: "new", label: "Not started" },
  ];

  const visible = items.filter(
    (i) =>
      (tab === "all" || i.state === tab) &&
      (field === "All fields" || i.course.field === field),
  );

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
                {t.label} <span className="certs-count">{counts[t.id]}</span>
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
          ) : counts[tab] === 0 ? (
            <div className="certs-empty">
              <h2>{EMPTY[tab][0]}</h2>
              <p className="certs-empty-text">{EMPTY[tab][1]}</p>
            </div>
          ) : visible.length === 0 ? (
            <div className="certs-empty">
              <h2>No results</h2>
              <p className="certs-empty-text">Try a different field.</p>
            </div>
          ) : (
            <div className="certs-grid">
              {visible.map(({ course, cert, done, state }) => {
                if (state === "earned") {
                  return (
                    <article className="certs-card" key={course.id}>
                      <div className="certs-preview">
                        <span className="certs-brand">DEVUP</span>
                        <span className="certs-kind">
                          Certificate of completion
                        </span>
                        <span className="certs-name">{userName}</span>
                        <span className="certs-kind">has completed</span>
                        <span className="certs-course">{course.title}</span>
                      </div>
                      <div className="certs-row">
                        <span className="certs-badge">{course.field}</span>
                        <span className="certs-date">
                          Issued {formatDate(cert.issued_at)}
                        </span>
                      </div>
                      <span className="certs-code">ID: {cert.code}</span>
                      <div className="certs-actions">
                        {/* onClick (View və Download PDF) sonrakı mərhələdə əlavə olunacaq */}
                        <button className="certs-btn-primary">View</button>
                        <button className="certs-btn-outline">
                          Download PDF
                        </button>
                      </div>
                    </article>
                  );
                }

                const total = course.lesson_count || 0;
                const percent = total
                  ? Math.min(100, Math.round((done / total) * 100))
                  : 0;
                return (
                  <article
                    className="certs-card certs-card-locked"
                    key={course.id}
                  >
                    <div className="certs-row">
                      <span className="certs-badge">{course.field}</span>
                      <span
                        className={
                          "certs-status" +
                          (state === "progress" ? " is-progress" : "")
                        }
                      >
                        {state === "progress" ? "In progress" : "Not started"}
                      </span>
                    </div>
                    <h3>{course.title}</h3>
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
                    <a className="certs-start" href="/lessons">
                      {state === "progress" ? "Continue" : "Start roadmap"}
                    </a>
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
