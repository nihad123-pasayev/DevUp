import "./EntryPage.css";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "../supabaseclient";
import logo from "/photos/logo.png";
function BrandText() {
  return (
    <span>
      Dev
      <b>
        <svg
          viewBox="0 -20 68 120"
          aria-hidden="true"
          style={{
            height: "1.2em",
            verticalAlign: "0",
            margin: "0 0.02em 0 0.03em",
            overflow: "visible",
          }}
        >
          <path
            d="M10 28V70.5A21 21 0 0 0 52 70.5V10"
            fill="none"
            stroke="currentColor"
            strokeWidth="19"
          />
          <path d="M30 12L52 -16L74 12Z" fill="currentColor" />
        </svg>
        p
      </b>
    </span>
  );
}
const FIELD_LIST = [
  {
    name: "Frontend",
    desc: "HTML, CSS, JavaScript, React. Build what users see.",
    img: "/photos/fields/frontend.jpg",
  },
  {
    name: "Backend",
    desc: "Servers, databases, APIs. Build what makes apps work.",
    img: "/photos/fields/backend.jpg",
  },
  {
    name: "Mobile",
    desc: "Ship apps for iOS and Android.",
    img: "/photos/fields/mobile.jpg",
  },
  {
    name: "Cybersecurity",
    desc: "Networking basics, help desk, and how to defend systems.",
    img: "/photos/fields/cybersecurity.jpg",
  },
  {
    name: "Data",
    desc: "Collect, analyze and visualize data to turn it into useful insights.",
    img: "/photos/fields/data.jpg",
  },
  {
    name: "Artificial Intelligence",
    desc: "Learn how machine learning and AI models work and build intelligent applications.",
    img: "/photos/fields/ai.jpg",
  },
  {
    name: "DevOps & Cloud",
    desc: "Deploy, automate, and run software in the cloud.",
    img: "/photos/fields/devops.jpg",
  },
];
function EntryPage() {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);
  const [confirmLogout, setConfirmLogout] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setChecking(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
      },
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setConfirmLogout(false);
  };
  useEffect(() => {
    if (!confirmLogout) return;
    const onKey = (e) => e.key === "Escape" && setConfirmLogout(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [confirmLogout]);
  useEffect(() => {
    const items = document.querySelectorAll(".field-item");
    if (!("IntersectionObserver" in window)) {
      items.forEach((el) => el.classList.add("in-view"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in-view");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.25 },
    );
    items.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
  return (
    <div>
      <div className="wrap">
        <nav>
          <a className="brand" href="#">
            <img src={logo} alt="" />
            <BrandText />
          </a>
          <div className="links">
            <a href="#fields">Fields</a>
            <a href="#how">How it works</a>
            <a href="#about">About</a>
          </div>
          <div className="nav-cta">
            {!checking &&
              (user ? (
                <button
                  className="btn ghost"
                  type="button"
                  onClick={() => setConfirmLogout(true)}
                >
                  Log out
                </button>
              ) : (
                <Link class="animated-button" to="/login">
                  <svg
                    viewBox="0 0 24 24"
                    class="arr-2"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M16.1716 10.9999L10.8076 5.63589L12.2218 4.22168L20 11.9999L12.2218 19.778L10.8076 18.3638L16.1716 12.9999H4V10.9999H16.1716Z"></path>
                  </svg>
                  <span class="text">Log in </span>
                  <span class="circle"></span>
                  <svg
                    viewBox="0 0 24 24"
                    class="arr-1"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M16.1716 10.9999L10.8076 5.63589L12.2218 4.22168L20 11.9999L12.2218 19.778L10.8076 18.3638L16.1716 12.9999H4V10.9999H16.1716Z"></path>
                  </svg>
                </Link>
              ))}
            <Link className="cssbuttons-io" to={user ? "/dashboard" : "/login"}>
              <span>
                <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M0 0h24v24H0z" fill="none"></path>
                  <path
                    d="M24 12l-5.657 5.657-1.414-1.414L21.172 12l-4.243-4.243 1.414-1.414L24 12zM2.828 12l4.243 4.243-1.414 1.414L0 12l5.657-5.657L7.07 7.757 2.828 12zm6.96 9H7.66l6.552-18h2.128L9.788 21z"
                    fill="currentColor"
                  ></path>
                </svg>
                Get started
              </span>
            </Link>
          </div>
        </nav>

        <header className="hero">
          <div>
            <h1>Learn IT from zero. Level up every day.</h1>
            <p>
              DevUp gives you a clear roadmap for every IT field, from your
              first line of code to job-ready skills. Learn step by step and
              practice as you go.
            </p>
            <div className="actions">
              <Link className="hover-btn" to={user ? "/dashboard" : "/login"}>
                <span className="text">Start Learning</span>
              </Link>
              <a className="btn" href="#fields">
                Browse fields
              </a>
            </div>
          </div>

          <div className="tiles" aria-label="IT fields you can learn on DevUp">
            <div className="tile">
              <i>
                <svg viewBox="0 0 24 24">
                  <path d="M8 7l-5 5 5 5M16 7l5 5-5 5" />
                </svg>
              </i>
              Web
            </div>
            <div className="tile">
              <i>
                <svg viewBox="0 0 24 24">
                  <rect x="3" y="4" width="18" height="6" rx="1.5" />
                  <rect x="3" y="14" width="18" height="6" rx="1.5" />
                  <path d="M7 7h.01M7 17h.01" />
                </svg>
              </i>
              Backend
            </div>
            <div className="tile">
              <i>
                <svg viewBox="0 0 24 24">
                  <rect x="7" y="2" width="10" height="20" rx="2" />
                  <path d="M11 18h2" />
                </svg>
              </i>
              Mobile
            </div>
            <div className="tile">
              <i>
                <svg viewBox="0 0 24 24">
                  <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" />
                </svg>
              </i>
              Cybersecurity
            </div>
            <div className="tile">
              <i>
                <svg viewBox="0 0 24 24">
                  <ellipse cx="12" cy="5" rx="8" ry="3" />
                  <path d="M4 5v6c0 1.66 3.58 3 8 3s8-1.34 8-3V5" />
                  <path d="M4 11v6c0 1.66 3.58 3 8 3s8-1.34 8-3v-6" />
                </svg>
              </i>
              Data
            </div>
            <div className="tile">
              <i>
                <svg viewBox="0 0 24 24">
                  <rect x="7" y="7" width="10" height="10" rx="2" />
                  <path d="M9 3v4M15 3v4M9 17v4M15 17v4M3 9h4M3 15h4M17 9h4M17 15h4" />
                  <path d="M12 9.5l.9 1.6 1.6.9-1.6.9-.9 1.6-.9-1.6-1.6-.9 1.6-.9z" />
                </svg>
              </i>
              Artificial Intelligence
            </div>
            <div className="tile">
              <i>
                <svg viewBox="0 0 24 24">
                  <path d="M7 18a4 4 0 010-8 5 5 0 019.5-1A4.5 4.5 0 0117 18z" />
                </svg>
              </i>
              DevOps &amp; Cloud
            </div>
          </div>
        </header>
      </div>

      <section id="fields">
        <div className="wrap">
          <h2>Pick a field. Follow the roadmap.</h2>
          <p className="sub">
            Every field starts at zero and is split into small lessons, so you
            always know what to learn next.
          </p>
          <div className="fields-list">
            {FIELD_LIST.map((f, i) => (
              <article
                className={"field-item" + (i % 2 === 1 ? " reverse" : "")}
                key={f.name}
              >
                <div className="field-img">
                  <img src={f.img} alt={`${f.name} roadmap illustration`} />
                </div>
                <div className="field-text">
                  <span className="field-num">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h3>{f.name}</h3>
                  <p>{f.desc}</p>
                  <a className="field-link" href="#">
                    View roadmap
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M5 12h14M13 6l6 6-6 6" />
                    </svg>
                  </a>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="how" id="how">
        <div className="wrap">
          <h2>How DevUp works</h2>
          <p className="sub">
            Three steps, repeated until you reach your goal.
          </p>
          <ol>
            <li>
              <b>Choose a field</b>
              <span>Select the area you want to learn.</span>
            </li>
            <li>
              <b>Follow the path</b>
              <span>Complete short lessons in the right order.</span>
            </li>
            <li>
              <b>Practice and level up</b>
              <span>Do exercises and track your progress.</span>
            </li>
          </ol>
        </div>
      </section>

      <section className="cta" id="about">
        <div className="wrap">
          <h2>Ready to level up?</h2>
          <p>Create a free account and start your first lesson today.</p>
          <a className="btn primary" href="#">
            Get started
          </a>
        </div>
      </section>

      <div className="wrap">
        <footer>
          <span>© 2026 DevUp</span>
          <span>Contact · GitHub · Terms</span>
        </footer>
      </div>
      {confirmLogout && (
        <div className="lo-bg" onClick={() => setConfirmLogout(false)}>
          <div
            className="lo-box"
            role="dialog"
            aria-modal="true"
            aria-labelledby="lo-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="lo-title">Log out?</h2>
            <p>Are you sure you want to log out?</p>
            <div className="lo-actions">
              <button type="button" onClick={() => setConfirmLogout(false)}>
                Cancel
              </button>
              <button className="lo-yes" type="button" onClick={handleLogout}>
                Yes, log out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default EntryPage;
