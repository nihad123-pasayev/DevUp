import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "./Sidebar";
import { supabase } from "../supabaseclient.js";
import "./Dashboard.css";
import {
  getMyRoadmaps,
  getProgress,
  getStreak,
  fieldStats,
  nextLesson,
  roadmapStats,
} from "../progress.js";

const FIELDS = [
  {
    name: "Web",
    desc: "HTML, CSS, JavaScript, React. Build what users see.",
    icon: <path d="M8 7l-5 5 5 5M16 7l5 5-5 5" />,
  },
  {
    name: "Backend",
    desc: "Servers, databases, APIs. Build what makes apps work.",
    icon: (
      <>
        <rect x="3" y="4" width="18" height="6" rx="1.5" />
        <rect x="3" y="14" width="18" height="6" rx="1.5" />
        <path d="M7 7h.01M7 17h.01" />
      </>
    ),
  },
  {
    name: "Mobile",
    desc: "Ship apps for iOS and Android.",
    icon: (
      <>
        <rect x="7" y="2" width="10" height="20" rx="2" />
        <path d="M11 18h2" />
      </>
    ),
  },
  {
    name: "Cybersecurity",
    desc: "Networking basics, help desk, and how to defend systems.",
    icon: <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" />,
  },
  {
    name: "Data",
    desc: "Collect, analyze and visualize data to find insights.",
    icon: (
      <>
        <ellipse cx="12" cy="5" rx="8" ry="3" />
        <path d="M4 5v6c0 1.66 3.58 3 8 3s8-1.34 8-3V5" />
        <path d="M4 11v6c0 1.66 3.58 3 8 3s8-1.34 8-3v-6" />
      </>
    ),
  },
  {
    name: "Artificial Intelligence",
    desc: "Learn how machine learning and AI models work and build smart apps.",
    icon: (
      <>
        <rect x="7" y="7" width="10" height="10" rx="2" />
        <path d="M9 3v4M15 3v4M9 17v4M15 17v4M3 9h4M3 15h4M17 9h4M17 15h4" />
        <path d="M12 9.5l.9 1.6 1.6.9-1.6.9-.9 1.6-.9-1.6-1.6-.9 1.6-.9z" />
      </>
    ),
  },
  {
    name: "DevOps & Cloud",
    desc: "Deploy, automate, and run software in the cloud.",
    icon: <path d="M7 18a4 4 0 010-8 5 5 0 019.5-1A4.5 4.5 0 0117 18z" />,
  },
];

function Icon({ children }) {
  return (
    <svg className="i" viewBox="0 0 24 24">
      {children}
    </svg>
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState("");
  const [toDelete, setToDelete] = useState(null);
  const [saving, setSaving] = useState(false);
  const [roadmaps, setRoadmaps] = useState([]);
  const [progress, setProgress] = useState({});
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        navigate("/login");
        return;
      }
      const u = data.session.user;
      const { data: p } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", u.id)
        .maybeSingle();
      setUser(u);
      setProfile(p);
    };
    load();
  }, [navigate]);

  useEffect(() => {
    if (!toDelete) return;
    const onKey = (e) => {
      if (e.key === "Escape" && !saving) setToDelete(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toDelete, saving]);
  useEffect(() => {
    if (!user) return;
    Promise.all([getMyRoadmaps(), getProgress(), getStreak()]).then(
      ([r, p, s]) => {
        setRoadmaps(r);
        setProgress(p);
        setStreak(s);
      },
    );
  }, [user, profile]);

  if (!user) return null;

  const fullName =
    profile?.full_name ??
    user.user_metadata?.full_name ??
    user.user_metadata?.name ??
    user.email.split("@")[0];
  const firstName = fullName.split(" ")[0];

  const myFieldNames = profile?.fields ?? [];
  const myFields = FIELDS.filter((f) => myFieldNames.includes(f.name));
  const otherFields = FIELDS.filter((f) => !myFieldNames.includes(f.name));
  const firstField = myFields[0];

  const fStats = fieldStats(roadmaps, progress);
  const firstRoadmap = roadmaps.find((r) => r.field === firstField?.name);
  const firstStats = firstRoadmap ? roadmapStats(firstRoadmap, progress) : null;
  const next = firstRoadmap ? nextLesson(firstRoadmap, progress) : null;

  const stats = {
    lessons: roadmaps.reduce((n, r) => n + roadmapStats(r, progress).done, 0),
    time: "0h 0m",
    streak,
  };

  const statusOf = (p) =>
    p >= 100 ? "Completed" : p > 0 ? "In progress" : "Not started";

  const saveFields = async (fields) => {
    const { error: saveError } = await supabase
      .from("profiles")
      .upsert({ id: user.id, fields });
    if (saveError) {
      setError(saveError.message);
      return false;
    }
    setProfile((prev) => ({ ...(prev ?? {}), id: user.id, fields }));
    return true;
  };

  const addField = async (name) => {
    setError("");
    await saveFields([...myFieldNames, name]);
  };

  const removeField = async () => {
    setError("");
    setSaving(true);
    await saveFields(myFieldNames.filter((n) => n !== toDelete));
    setSaving(false);
    setToDelete(null);
  };

  return (
    <Sidebar>
      <div className="dpage">
        <h1>Welcome back, {firstName}</h1>
        <div className="chips">
          <span className="chip">
            Daily goal: <b>{profile?.daily_time ?? "Not set"}</b>
          </span>
          <span className="chip">
            Goal: <b>{profile?.goal ?? "Not set"}</b>
          </span>
        </div>

        {error && <p className="form-error">{error}</p>}

        <section className="cont">
          <small>Continue learning</small>
          <h2>
            {firstField
              ? `${firstStats?.done ? "Continue" : "Start"} ${firstField.name}`
              : "Choose your first roadmap"}
          </h2>
          <p>
            {firstField
              ? next
                ? `${firstField.name} · ${next.title || next.name}`
                : `${firstField.name} · All lessons completed`
              : "Add a roadmap below to begin"}
          </p>
          <div className="bar">
            <i style={{ width: `${firstStats?.percent ?? 0}%` }} />
          </div>
          <button
            className="btn"
            type="button"
            disabled={!firstField}
            onClick={() => navigate("/lessons")}
          >
            {firstField ? "Go to lessons" : "Lessons coming soon"}
          </button>
          <svg className="deco" viewBox="0 0 24 24">
            <path d="M5 19L19 5M9 5h10v10" />
          </svg>
        </section>

        <div className="stats">
          <div className="stat">
            <span>Lessons completed</span>
            <b>{stats.lessons}</b>
          </div>
          <div className="stat">
            <span>Learning time</span>
            <b>{stats.time}</b>
          </div>
          <div className="stat">
            <span>Day streak</span>
            <b>
              {stats.streak} {stats.streak === 1 ? "day" : "days"}
            </b>
          </div>
        </div>

        <h3 className="sec">Your roadmaps</h3>
        {myFields.length > 0 ? (
          <div className="grid">
            {myFields.map((f) => {
              const pct = fStats[f.name]?.percent ?? 0;
              return (
                <div className="card" key={f.name}>
                  <button
                    className="del"
                    type="button"
                    aria-label={`Remove ${f.name} roadmap`}
                    onClick={() => setToDelete(f.name)}
                  >
                    <Icon>
                      <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 10v6M14 10v6" />
                    </Icon>
                  </button>
                  <div className="top">
                    <div className="ic">
                      <Icon>{f.icon}</Icon>
                    </div>
                    <div>
                      <b>{f.name}</b>
                      <span className="m">{statusOf(pct)}</span>
                    </div>
                  </div>
                  <div className="row">
                    Progress<em>{pct}%</em>
                  </div>
                  <div className="bar">
                    <i style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="empty">
            <b>You have not chosen any fields yet.</b>
            <span>Pick a field below to start your first roadmap.</span>
          </div>
        )}

        {otherFields.length > 0 && (
          <>
            <h3 className="sec">Explore other fields</h3>
            <div className="list">
              {otherFields.map((f) => (
                <div className="item" key={f.name}>
                  <div className="ic">
                    <Icon>{f.icon}</Icon>
                  </div>
                  <div className="txt">
                    <b>{f.name}</b>
                    <span>{f.desc}</span>
                  </div>
                  <button
                    className="add"
                    type="button"
                    onClick={() => addField(f.name)}
                  >
                    Add roadmap
                  </button>
                </div>
              ))}
            </div>
          </>
        )}

        {toDelete && (
          <div
            className="modal-bg"
            onClick={() => !saving && setToDelete(null)}
          >
            <div
              className="modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="del-title"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 id="del-title">Remove roadmap?</h2>
              <p>
                Are you sure you want to remove <b>{toDelete}</b> from your
                roadmaps? You can add it again later.
              </p>
              <div className="actions">
                <button
                  className="btn ghost"
                  type="button"
                  onClick={() => setToDelete(null)}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  className="btn danger"
                  type="button"
                  onClick={removeField}
                  disabled={saving}
                >
                  {saving ? "Removing..." : "Yes, remove"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Sidebar>
  );
}
