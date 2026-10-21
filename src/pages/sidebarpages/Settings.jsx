import Sidebar from "../Sidebar";
import "./Settings.css";
import { useEffect, useState } from "react";

const NAV = [
  { id: "profile", label: "Profile" },
  { id: "account", label: "Account" },
  { id: "language", label: "Language" },
  { id: "appearance", label: "Appearance" },
  { id: "notifications", label: "Notifications" },
  { id: "privacy", label: "Privacy" },
];

const LINKS = [
  { id: "github", label: "GitHub", placeholder: "https://github.com/username" },
  {
    id: "linkedin",
    label: "LinkedIn",
    placeholder: "https://linkedin.com/in/username",
  },
  {
    id: "portfolio",
    label: "Portfolio website",
    placeholder: "https://yourname.com",
  },
];

const CONNECTED = [
  { name: "Google", text: "Sign in with your Google account." },
  { name: "GitHub", text: "Sign in with your GitHub account." },
];

const THEMES = [
  { id: "light", label: "Light" },
  { id: "dark", label: "Dark" },
  { id: "system", label: "System" },
];

const NOTIFICATIONS = [
  {
    id: "reminder",
    title: "Daily learning reminder",
    text: "A reminder to keep your streak going.",
    on: true,
  },
  {
    id: "replies",
    title: "Replies to your questions",
    text: "When someone answers your question in the community.",
    on: true,
  },
  {
    id: "lessons",
    title: "New lessons and roadmaps",
    text: "When new learning content is added.",
    on: true,
  },
  {
    id: "updates",
    title: "Product updates",
    text: "News about new DevUp features.",
    on: false,
  },
];

// Tarixlər nümunədir, sonra bazadan gələcək
const DOCS = [
  { name: "Terms of Service", date: "Oct 12, 2026" },
  { name: "Privacy Policy", date: "Oct 12, 2026" },
  { name: "Cookie Policy", date: "Oct 12, 2026" },
  { name: "Community guidelines", date: "Oct 12, 2026" },
];

export default function Settings() {
  const [active, setActive] = useState(NAV[0].id);

  useEffect(() => {
    function onScroll() {
      const atBottom =
        window.innerHeight + window.scrollY >=
        document.documentElement.scrollHeight - 4;
      if (atBottom) {
        setActive(NAV[NAV.length - 1].id);
        return;
      }
      let current = NAV[0].id;
      NAV.forEach((n) => {
        const el = document.getElementById(n.id);
        if (el && el.getBoundingClientRect().top <= 120) current = n.id;
      });
      setActive(current);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <div className="settings-layout">
      <Sidebar />
      <main className="settings-main">
        <div className="settings-page">
          <header className="settings-header">
            <h1>Settings</h1>
            <p>Manage your profile, account and preferences.</p>
          </header>

          <div className="settings-body">
            <nav className="settings-nav" aria-label="Settings sections">
              {NAV.map((n) => (
                <a
                  key={n.id}
                  href={"#" + n.id}
                  className={
                    "settings-nav-link" + (active === n.id ? " is-active" : "")
                  }
                  aria-current={active === n.id ? "true" : undefined}
                >
                  {n.label}
                </a>
              ))}
            </nav>

            <div className="settings-content">
              <section id="profile" className="settings-section">
                <h2>Profile</h2>
                <p className="settings-section-text">
                  This is how you appear to other learners.
                </p>
                <div className="settings-card">
                  <div className="settings-avatar-row">
                    <div className="settings-avatar">N</div>
                    <div className="settings-avatar-actions">
                      <button type="button" className="settings-btn">
                        Upload photo
                      </button>
                      <button type="button" className="settings-btn-text">
                        Remove
                      </button>
                    </div>
                  </div>

                  <div className="settings-grid">
                    <div className="settings-field">
                      <label htmlFor="full-name">Full name</label>
                      <input id="full-name" type="text" defaultValue="Nihat" />
                    </div>
                    <div className="settings-field">
                      <label htmlFor="username">Username</label>
                      <input id="username" type="text" placeholder="username" />
                    </div>
                    <div className="settings-field settings-wide">
                      <label htmlFor="bio">Bio</label>
                      <textarea
                        id="bio"
                        rows={3}
                        placeholder="Tell others a little about yourself"
                      />
                    </div>
                    <div className="settings-field">
                      <label htmlFor="country">Country</label>
                      <input
                        id="country"
                        type="text"
                        placeholder="Azerbaijan"
                      />
                    </div>
                  </div>

                  <h3 className="settings-subtitle">Links</h3>
                  <div className="settings-grid">
                    {LINKS.map((l) => (
                      <div className="settings-field" key={l.id}>
                        <label htmlFor={"link-" + l.id}>{l.label}</label>
                        <input
                          id={"link-" + l.id}
                          type="url"
                          placeholder={l.placeholder}
                        />
                      </div>
                    ))}
                  </div>

                  <div className="settings-footer">
                    <button type="button" className="settings-primary">
                      Save changes
                    </button>
                  </div>
                </div>
              </section>

              <section id="account" className="settings-section">
                <h2>Account</h2>
                <p className="settings-section-text">
                  Sign-in details and account security.
                </p>
                <div className="settings-card">
                  <div className="settings-row">
                    <div className="settings-row-text">
                      <h4>Email</h4>
                      <p>you@example.com</p>
                    </div>
                    <button type="button" className="settings-btn">
                      Change email
                    </button>
                  </div>
                  <div className="settings-row">
                    <div className="settings-row-text">
                      <h4>Password</h4>
                      <p>Choose a strong password you don't use elsewhere.</p>
                    </div>
                    <button type="button" className="settings-btn">
                      Change password
                    </button>
                  </div>
                  {CONNECTED.map((c) => (
                    <div className="settings-row" key={c.name}>
                      <div className="settings-row-text">
                        <h4>{c.name}</h4>
                        <p>{c.text}</p>
                      </div>
                      <button type="button" className="settings-btn">
                        Connect
                      </button>
                    </div>
                  ))}
                  <div className="settings-row">
                    <div className="settings-row-text">
                      <h4>Two-factor authentication</h4>
                      <p>Add a second step when you sign in.</p>
                    </div>
                    <button type="button" className="settings-btn">
                      Enable
                    </button>
                  </div>
                  <div className="settings-row">
                    <div className="settings-row-text">
                      <h4>Sign out of all devices</h4>
                      <p>You'll need to sign in again everywhere.</p>
                    </div>
                    <button type="button" className="settings-btn">
                      Sign out everywhere
                    </button>
                  </div>
                  <div className="settings-row">
                    <div className="settings-row-text">
                      <h4>Export your data</h4>
                      <p>
                        Download a copy of your profile, notes and projects.
                      </p>
                    </div>
                    <button type="button" className="settings-btn">
                      Download data
                    </button>
                  </div>
                </div>

                <div className="settings-card settings-danger">
                  <h3 className="settings-danger-title">Danger zone</h3>
                  <div className="settings-row">
                    <div className="settings-row-text">
                      <h4>Reset progress</h4>
                      <p>
                        Clear all lesson progress and start over. Your account
                        stays.
                      </p>
                    </div>
                    <button type="button" className="settings-btn-danger">
                      Reset progress
                    </button>
                  </div>
                  <div className="settings-row">
                    <div className="settings-row-text">
                      <h4>Delete account</h4>
                      <p>Permanently delete your account and all your data.</p>
                    </div>
                    <button type="button" className="settings-btn-danger-solid">
                      Delete account
                    </button>
                  </div>
                </div>
              </section>

              <section id="language" className="settings-section">
                <h2>Language</h2>
                <p className="settings-section-text">
                  Choose the language DevUp uses.
                </p>
                <div className="settings-card">
                  <div className="settings-field settings-narrow">
                    <label htmlFor="language-select">Display language</label>
                    <select id="language-select" defaultValue="en">
                      <option value="en">English</option>
                      <option value="az" disabled>
                        Azərbaycanca (coming soon)
                      </option>
                    </select>
                  </div>
                  <p className="settings-hint">
                    More languages are coming soon.
                  </p>
                </div>
              </section>

              <section id="appearance" className="settings-section">
                <h2>Appearance</h2>
                <p className="settings-section-text">
                  Pick how DevUp looks for you.
                </p>
                <div className="settings-card">
                  <div
                    className="settings-themes"
                    role="radiogroup"
                    aria-label="Theme"
                  >
                    {THEMES.map((t) => (
                      <label className="settings-theme" key={t.id}>
                        <input
                          type="radio"
                          name="theme"
                          value={t.id}
                          defaultChecked={t.id === "light"}
                        />
                        <span className={"settings-theme-preview is-" + t.id}>
                          <span className="settings-theme-bar" />
                          <span className="settings-theme-line" />
                          <span className="settings-theme-line is-short" />
                        </span>
                        <span className="settings-theme-name">{t.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </section>

              <section id="notifications" className="settings-section">
                <h2>Notifications</h2>
                <p className="settings-section-text">
                  Choose what we email you about.
                </p>
                <div className="settings-card">
                  {NOTIFICATIONS.map((n) => (
                    <div className="settings-row" key={n.id}>
                      <div className="settings-row-text">
                        <h4>{n.title}</h4>
                        <p>{n.text}</p>
                      </div>
                      <label className="settings-switch">
                        <input
                          type="checkbox"
                          aria-label={n.title}
                          defaultChecked={n.on}
                        />
                        <span className="settings-slider" />
                      </label>
                    </div>
                  ))}
                </div>
              </section>

              <section id="privacy" className="settings-section">
                <h2>Privacy</h2>
                <p className="settings-section-text">
                  The agreements you accepted when you joined DevUp.
                </p>
                <div className="settings-card">
                  {DOCS.map((d) => (
                    <div className="settings-row" key={d.name}>
                      <div className="settings-row-text">
                        <h4>{d.name}</h4>
                        <p>Accepted on {d.date}</p>
                      </div>
                      <a href="#privacy" className="settings-link">
                        Read
                      </a>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
