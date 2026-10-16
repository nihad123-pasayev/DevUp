import { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import logo from "/photos/logo.png"; // digər səhifələrdəki ilə eyni yol
import { supabase } from "../supabaseclient"; // digər səhifələrdəki ilə eyni yazılış
import "./Dashboard.css";

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
    name: "Data & AI",
    desc: "Work with data and learn how machine learning works.",
    icon: (
      <>
        <circle cx="6" cy="6" r="2" />
        <circle cx="18" cy="8" r="2" />
        <circle cx="10" cy="18" r="2" />
        <path d="M7.5 7l9 1M7 8l3 8M17 10l-6 7" />
      </>
    ),
  },
  {
    name: "DevOps & Cloud",
    desc: "Deploy, automate, and run software in the cloud.",
    icon: <path d="M7 18a4 4 0 010-8 5 5 0 019.5-1A4.5 4.5 0 0117 18z" />,
  },
];
const MENU = [
  {
    items: [
      {
        label: "Dashboard",
        to: "/dashboard",
        icon: (
          <>
            <rect x="3" y="3" width="7" height="9" rx="1.5" />
            <rect x="14" y="3" width="7" height="5" rx="1.5" />
            <rect x="14" y="12" width="7" height="9" rx="1.5" />
            <rect x="3" y="16" width="7" height="5" rx="1.5" />
          </>
        ),
      },
    ],
  },
  {
    title: "Learn",
    items: [
      {
        label: "Lessons",
        to: "/lessons",
        icon: (
          <>
            <path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z" />
            <path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z" />
          </>
        ),
      },
      {
        label: "Projects",
        to: "/projects",
        icon: <path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2z" />,
      },
      {
        label: "Resources",
        to: "/resources",
        icon: <path d="M10 13a5 5 0 007.07 0l3-3a5 5 0 00-7.07-7.07l-1 1M14 11a5 5 0 00-7.07 0l-3 3a5 5 0 007.07 7.07l1-1" />,
      },
      {
        label: "Community",
        to: "/community",
        icon: <path d="M17 21v-2a4 4 0 00-4-4H7a4 4 0 00-4 4v2M10 11a4 4 0 100-8 4 4 0 000 8zM21 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />,
      },
    ],
  },
  {
    title: "My space",
    items: [
      {
        label: "Notes",
        to: "/notes",
        icon: <path d="M14 3H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V9zM14 3v6h6M8 13h8M8 17h5" />,
      },
      {
        label: "Saved",
        to: "/saved",
        icon: <path d="M6 3h12a1 1 0 011 1v17l-7-4-7 4V4a1 1 0 011-1z" />,
      },
      {
        label: "Achievements",
        to: "/achievements",
        icon: <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 01-10 0zM17 5h3v2a3 3 0 01-3 3M7 5H4v2a3 3 0 003 3" />,
      },
      {
        label: "Certificates",
        to: "/certificates",
        icon: (
          <>
            <circle cx="12" cy="9" r="6" />
            <path d="M8.5 14.5L7 22l5-3 5 3-1.5-7.5" />
          </>
        ),
      },
    ],
  },
  {
    title: "Account",
    items: [
      {
        label: "Settings",
        to: "/settings",
        icon: (
          <>
            <path d="M4 7h10M18 7h2M4 17h2M10 17h10" />
            <circle cx="16" cy="7" r="2" />
            <circle cx="8" cy="17" r="2" />
          </>
        ),
      },
      {
        label: "Help",
        to: "/help",
        icon: (
          <>
            <circle cx="12" cy="12" r="9" />
            <path d="M9.5 9a2.5 2.5 0 015 .5c0 1.5-2.5 2-2.5 3.5M12 17h.01" />
          </>
        ),
      },
    ],
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
  const { pathname } = useLocation();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState("");
  const [toDelete, setToDelete] = useState(null); // silinəcək sahənin adı
  const [saving, setSaving] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);

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
  if (!toDelete && !confirmLogout) return;
  const onKey = (e) => {
    if (e.key === "Escape" && !saving) {
      setToDelete(null);
      setConfirmLogout(false);
    }
  };
  window.addEventListener("keydown", onKey);
  return () => window.removeEventListener("keydown", onKey);
}, [toDelete, confirmLogout, saving]);
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

  // Dərslər və irəliləyiş cədvəlləri qurulana qədər 0.
  // Sonra bu dəyərlər user_progress cədvəlindən hesablanacaq.
  const stats = { lessons: 0, time: "0h 0m", streak: 0 };

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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const logoutIcon = (
    <Icon>
      <path d="M9 4H5a1 1 0 00-1 1v14a1 1 0 001 1h4M16 8l4 4-4 4M20 12H9" />
    </Icon>
  );

  return (
    <div className="dash">
      <aside className="side">
        <Link className="brand" to="/">
          <img src={logo} alt="" />
          <span>Dev<b>Up</b></span>
        </Link>

        <div className="menu" role="navigation" aria-label="Main">
  {MENU.map((group, gi) => (
    <div className="group" key={gi}>
      {group.title && <p className="gt">{group.title}</p>}
      {group.items.map((it) =>
        it.soon ? (
          <span className="mi soon" key={it.label} aria-disabled="true">
            <Icon>{it.icon}</Icon>
            {it.label}
            <em>Soon</em>
          </span>
        ) : (
          <Link
          className={`mi${pathname === it.to || pathname.startsWith(it.to + "/") ? " on" : ""}`}
          key={it.label}
          to={it.to}
        >
            <Icon>{it.icon}</Icon>
            {it.label}
          </Link>
        )
      )}
    </div>
  ))}
</div>

        <div className="me">
          <div className="user">
            <div className="av">{firstName[0].toUpperCase()}</div>
            <div>
              <b>{firstName}</b>
              <span>Learner</span>
            </div>
          </div>
         <button className="out" type="button" onClick={() => setConfirmLogout(true)}>
        {logoutIcon}
        Log out
      </button>
        </div>
      </aside>

      <header className="topbar">
        <Link className="brand" to="/">
          <img src={logo} alt="" />
          <span>Dev<b>Up</b></span>
        </Link>
        <button className="out" type="button" onClick={handleLogout}>
          {logoutIcon}
          Log out
        </button>
      </header>

      <main className="main">
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
          <h2>{firstField ? `Start ${firstField.name}` : "Choose your first roadmap"}</h2>
          <p>
            {firstField
              ? `${firstField.name} · Lesson 1`
              : "Add a roadmap below to begin"}
          </p>
          <div className="bar"><i style={{ width: "0%" }} /></div>
          <button className="btn" type="button" disabled>
            Lessons coming soon
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
            <b>{stats.streak} {stats.streak === 1 ? "day" : "days"}</b>
          </div>
        </div>

        <h3 className="sec">Your roadmaps</h3>
        {myFields.length > 0 ? (
          <div className="grid">
            {myFields.map((f) => (
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
                    <span className="m">Not started</span>
                  </div>
                </div>
                <div className="row">
                  Progress<em>0%</em>
                </div>
                <div className="bar"><i style={{ width: "0%" }} /></div>
              </div>
            ))}
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
                  <button className="add" type="button" onClick={() => addField(f.name)}>
                    Add roadmap
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </main>

      {toDelete && (
        <div className="modal-bg" onClick={() => !saving && setToDelete(null)}>
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="del-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="del-title">Remove roadmap?</h2>
            <p>
              Are you sure you want to remove <b>{toDelete}</b> from your roadmaps?
              You can add it again later.
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
              <button className="btn danger" type="button" onClick={removeField} disabled={saving}>
                {saving ? "Removing..." : "Yes, remove"}
              </button>
            </div>
          </div>
        </div>
      )}
      {confirmLogout && (
  <div className="modal-bg" onClick={() => setConfirmLogout(false)}>
    <div
      className="modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="out-title"
      onClick={(e) => e.stopPropagation()}
    >
      <h2 id="out-title">Log out?</h2>
      <p>Are you sure you want to log out?</p>
      <div className="actions">
        <button className="btn ghost" type="button" onClick={() => setConfirmLogout(false)}>
          Cancel
        </button>
        <button className="btn danger" type="button" onClick={handleLogout}>
          Yes, log out
        </button>
      </div>
    </div>
  </div>
)}
    </div>
  );
}