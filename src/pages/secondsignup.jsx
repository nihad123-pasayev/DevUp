import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import logo from "/photos/logo.png"; 
import { supabase } from "../supabaseclient";
import "./secondsignup.css";

const icons = {
  web: <path d="M8 7l-5 5 5 5M16 7l5 5-5 5" />,
  backend: (
    <>
      <rect x="3" y="4" width="18" height="6" rx="1.5" />
      <rect x="3" y="14" width="18" height="6" rx="1.5" />
      <path d="M7 7h.01M7 17h.01" />
    </>
  ),
  mobile: (
    <>
      <rect x="7" y="2" width="10" height="20" rx="2" />
      <path d="M11 18h2" />
    </>
  ),
  cyber: <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" />,
  data: (
    <>
      <circle cx="6" cy="6" r="2" />
      <circle cx="18" cy="8" r="2" />
      <circle cx="10" cy="18" r="2" />
      <path d="M7.5 7l9 1M7 8l3 8M17 10l-6 7" />
    </>
  ),
  cloud: <path d="M7 18a4 4 0 010-8 5 5 0 019.5-1A4.5 4.5 0 0117 18z" />,
};

const steps = [
  {
    key: "fields",
    q: "What do you want to learn?",
    s: "Pick one or more fields. You can change this later.",
    multi: true,
    grid: true,
    opts: [
      { label: "Web", icon: icons.web },
      { label: "Backend", icon: icons.backend },
      { label: "Mobile", icon: icons.mobile },
      { label: "Cybersecurity", icon: icons.cyber },
      { label: "Data & AI", icon: icons.data },
      { label: "DevOps & Cloud", icon: icons.cloud },
    ],
  },
  {
    key: "level",
    q: "What is your current level?",
    s: "Be honest, there is no wrong answer.",
    opts: [
      { label: "Complete beginner", desc: "I am starting from zero" },
      { label: "I know the basics", desc: "I have tried a few things" },
      { label: "Experienced", desc: "I want to go deeper" },
    ],
  },
  {
    key: "goal",
    q: "What is your goal?",
    s: "We will shape your roadmap around it.",
    opts: [
      { label: "Get a job", desc: "Build skills for a career in IT" },
      { label: "Learn for fun", desc: "Explore at my own pace" },
      { label: "University studies", desc: "Support what I learn at school" },
      { label: "Build my own project", desc: "Learn what I need to ship it" },
    ],
  },
  {
    key: "time",
    q: "How much time can you spend daily?",
    s: "Optional. We will use it to pace your roadmap.",
    optional: true,
    opts: [
      { label: "15 minutes", desc: "A little every day" },
      { label: "30 minutes", desc: "Steady progress" },
      { label: "1 hour", desc: "Serious learning" },
      { label: "2+ hours", desc: "Full speed" },
    ],
  },
];

export default function Secondsignup() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({ fields: [], level: [], goal: [], time: [] });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) navigate("/login");
      else setUser(data.session.user);
    });
  }, [navigate]);

  if (!user) return null;

  const current = steps[step];
  const selected = answers[current.key];
  const canContinue = current.optional || selected.length > 0;

  const choose = (label) => {
    setAnswers((prev) => {
      const list = prev[current.key];
      if (current.multi) {
        return {
          ...prev,
          [current.key]: list.includes(label)
            ? list.filter((x) => x !== label)
            : [...list, label],
        };
      }
      return { ...prev, [current.key]: [label] };
    });
  };

  const finish = async () => {
    setSaving(true);
    setError("");
    const { error: saveError } = await supabase.from("profiles").upsert({
      id: user.id,
      full_name: user.user_metadata?.full_name ?? null,
      fields: answers.fields,
      level: answers.level[0] ?? null,
      goal: answers.goal[0] ?? null,
      daily_time: answers.time[0] ?? null,
      onboarded: true,
    });
    setSaving(false);
    if (saveError) setError(saveError.message);
    else setDone(true);
  };

  const next = () => (step === steps.length - 1 ? finish() : setStep(step + 1));

  return (
    <div className="onboarding">
      <div className="top">
        <div className="brand">
          <img src={logo} alt="" />
          Dev<b>Up</b>
        </div>
        {!done && (
          <button className="skip" type="button" onClick={finish} disabled={saving}>
            Skip for now
          </button>
        )}
      </div>

      <main className="wrap">
        {done ? (
          <div className="done">
            <div className="tick">
              <svg viewBox="0 0 24 24"><path d="M5 12l5 5 9-10" /></svg>
            </div>
            <h1>You are all set!</h1>
            <p className="sub">Your roadmap is ready. Time to level up.</p>
            
            <Link className="btn primary" to="/">Go to dashboard</Link>
          </div>
        ) : (
          <>
            <div className="progress">
              {steps.map((_, i) => (
                <i key={i} className={i <= step ? "on" : ""} />
              ))}
            </div>
            <p className="count">Step {step + 1} of {steps.length}</p>
            <h1>{current.q}</h1>
            <p className="sub">{current.s}</p>

            <div className={current.grid ? "opts grid" : "opts"}>
              {current.opts.map((o) => (
                <button
                  key={o.label}
                  type="button"
                  className={selected.includes(o.label) ? "opt sel" : "opt"}
                  aria-pressed={selected.includes(o.label)}
                  onClick={() => choose(o.label)}
                >
                  {o.icon && (
                    <i>
                      <svg viewBox="0 0 24 24">{o.icon}</svg>
                    </i>
                  )}
                  <div>
                    <b>{o.label}</b>
                    {o.desc && <span>{o.desc}</span>}
                  </div>
                </button>
              ))}
            </div>

            {error && <p className="form-error">{error}</p>}

            <div className="nav">
              {step > 0 && (
                <button className="btn" type="button" onClick={() => setStep(step - 1)}>
                  Back
                </button>
              )}
              <button
                className="btn primary"
                type="button"
                onClick={next}
                disabled={!canContinue || saving}
              >
                {step === steps.length - 1 ? (saving ? "Saving..." : "Finish") : "Continue"}
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}