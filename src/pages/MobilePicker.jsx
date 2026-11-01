import "./MobilePicker.css";
import { useEffect } from "react";

const OPTIONS = [
  {
    id: "React Native",
    icon: "⚛️",
    title: "React Native",
    desc: "Build Android and iOS apps using JavaScript or TypeScript and React.",
    points: [
      ["💻", "Uses JavaScript / TypeScript"],
      ["⚛️", "React-based development"],
      ["🔄", "Share code across Android and iOS"],
      ["🌐", "Great choice for React developers"],
    ],
    best: "Developers who already know React or want to use their JavaScript skills in mobile development.",
  },
  {
    id: "Flutter",
    icon: "🦋",
    title: "Flutter",
    desc: "Build cross-platform apps using Google's Flutter framework.",
    points: [
      ["🎯", "Uses Dart"],
      ["🌍", "Single codebase for Android, iOS (and web & desktop)"],
      ["🎨", "Rich UI customization with Widgets"],
      ["⚡", "Fast development with Hot Reload"],
    ],
    best: "Developers who want a dedicated cross-platform framework and highly customizable UI.",
  },
];

export default function MobilePicker({ open, current, onPick, onClose }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  return (
    <div
      className={"mp-overlay" + (open ? " is-open" : "")}
      onClick={onClose}
      aria-hidden={!open}
    >
      <div
        className="mp-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="mp-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mp-bar">
          <h2 id="mp-title">Choose Your Mobile Development Path</h2>
          <button
            className="mp-close"
            type="button"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="mp-body">
          <p className="mp-sub">
            Two great frameworks, one mobile journey. Which fits you best?
          </p>

          <div className="mp-grid">
            {OPTIONS.map((o) => (
              <div
                key={o.id}
                className={
                  "mp-card" + (current && current === o.id ? " is-current" : "")
                }
              >
                <div className="mp-card-top">
                  <span className="mp-icon" aria-hidden="true">
                    {o.icon}
                  </span>
                  <h3>{o.title}</h3>
                </div>
                <p className="mp-desc">{o.desc}</p>
                <ul>
                  {o.points.map(([ic, t]) => (
                    <li key={t}>
                      <span aria-hidden="true">{ic}</span>
                      {t}
                    </li>
                  ))}
                </ul>
                <p className="mp-best">
                  <b>Best for:</b> {o.best}
                </p>
                <button
                  type="button"
                  className="mp-btn"
                  onClick={() => onPick(o.id)}
                >
                  {current && current === o.id
                    ? "Selected"
                    : `Choose ${o.title}`}
                </button>
              </div>
            ))}
          </div>

          <p className="mp-foot">
            🚀 Pick the technology that matches your goals and start building
            your first mobile app!
          </p>
        </div>
      </div>
    </div>
  );
}
