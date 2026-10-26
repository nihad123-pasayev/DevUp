import { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import logo from "/photos/logo.png";
import { supabase } from "../supabaseclient.js";
import "./Sidebar.css";

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
        icon: (
          <path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
        ),
      },
      {
        label: "Resources",
        to: "/resources",
        icon: (
          <path d="M10 13a5 5 0 007.07 0l3-3a5 5 0 00-7.07-7.07l-1 1M14 11a5 5 0 00-7.07 0l-3 3a5 5 0 007.07 7.07l1-1" />
        ),
      },
      {
        label: "Community",
        to: "/community",
        icon: (
          <path d="M17 21v-2a4 4 0 00-4-4H7a4 4 0 00-4 4v2M10 11a4 4 0 100-8 4 4 0 000 8zM21 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
        ),
      },
    ],
  },
  {
    title: "My space",
    items: [
      {
        label: "Notes",
        to: "/notes",
        icon: (
          <path d="M14 3H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V9zM14 3v6h6M8 13h8M8 17h5" />
        ),
      },
      {
        label: "Saved",
        to: "/saved",
        icon: <path d="M6 3h12a1 1 0 011 1v17l-7-4-7 4V4a1 1 0 011-1z" />,
      },
      {
        label: "Achievements",
        to: "/achievements",
        icon: (
          <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 01-10 0zM17 5h3v2a3 3 0 01-3 3M7 5H4v2a3 3 0 003 3" />
        ),
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
    <svg className="i" viewBox="0 0 24 24" aria-hidden="true">
      {children}
    </svg>
  );
}
function BrandText() {
  return (
    <span>
      Dev
      <b>
        <svg
          viewBox="0 0 70 120"
          aria-hidden="true"
          style={{
            height: "1.2em",
            verticalAlign: "-0.01em",
            margin: "0 0.12em 0 0.02em",
            overflow: "visible",
          }}
        >
          <path
            d="M10 46V86A25 25 0 0 0 60 86V30"
            fill="none"
            stroke="currentColor"
            strokeWidth="16"
          />
          <path d="M38 31L60 2L82 31Z" fill="currentColor" />
        </svg>
        p
      </b>
    </span>
  );
}
export default function DashboardLayout({ children }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [user, setUser] = useState(null);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) navigate("/login");
      else setUser(data.session.user);
    });
  }, [navigate]);

  useEffect(() => {
    if (!confirmLogout) return;
    const onKey = (e) => e.key === "Escape" && setConfirmLogout(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [confirmLogout]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!user) return null;

  const fullName =
    user.user_metadata?.full_name ??
    user.user_metadata?.name ??
    user.email.split("@")[0];
  const firstName = fullName.split(" ")[0];

  const isActive = (to) => pathname === to || pathname.startsWith(to + "/");

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
    <div className={"dash" + (open ? " open" : "")}>
      <aside className="side">
        <Link className="brand" to="/">
          <img src={logo} alt="" />
          <BrandText />
        </Link>

        <div className="menu" role="navigation" aria-label="Main">
          {MENU.map((group, gi) => (
            <div className="group" key={gi}>
              {group.title && <p className="gt">{group.title}</p>}
              {group.items.map((it) => (
                <Link
                  className={`mi${isActive(it.to) ? " on" : ""}`}
                  key={it.label}
                  to={it.to}
                  onClick={() => setOpen(false)}
                >
                  <Icon>{it.icon}</Icon>
                  {it.label}
                </Link>
              ))}
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
          <button
            className="out"
            type="button"
            onClick={() => setConfirmLogout(true)}
          >
            {logoutIcon}
            Log out
          </button>
        </div>
      </aside>

      <header className="topbar">
        <div className="top-left">
          <button
            className="menu-btn"
            type="button"
            aria-label="Open menu"
            aria-expanded={open}
            onClick={() => setOpen(true)}
          >
            <Icon>
              <path d="M4 6h16M4 12h16M4 18h16" />
            </Icon>
          </button>
          <Link className="brand" to="/">
            <img src={logo} alt="" />
            <BrandText />
          </Link>
        </div>
        <button
          className="out"
          type="button"
          onClick={() => setConfirmLogout(true)}
        >
          {logoutIcon}
          Log out
        </button>
      </header>

      {open && <div className="side-bg" onClick={() => setOpen(false)} />}

      <main className="main">{children}</main>

      {confirmLogout && (
        <div className="out-bg" onClick={() => setConfirmLogout(false)}>
          <div
            className="out-box"
            role="dialog"
            aria-modal="true"
            aria-labelledby="out-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="out-title">Log out?</h2>
            <p>Are you sure you want to log out?</p>
            <div className="out-actions">
              <button
                type="button"
                autoFocus
                onClick={() => setConfirmLogout(false)}
              >
                Cancel
              </button>
              <button className="out-yes" type="button" onClick={handleLogout}>
                Yes, log out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
