import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FcGoogle } from "react-icons/fc";
import { FaGithub } from "react-icons/fa";
import { supabase } from "../supabaseclient";
import logo from "/photos/logo.png";
import "./LoginPage.css";

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

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    const messages = {
      "Invalid login credentials": "Incorrect email or password.",
      "Email not confirmed": "Please confirm your email first.",
    };

    if (signInError) {
      setLoading(false);
      setError(messages[signInError.message] ?? signInError.message);
      return;
    }

    navigate("/");
  };

  const handleOAuth = async (provider) => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/` },
    });
    if (error) setError(error.message);
  };

  return (
    <div className="auth">
      <aside className="side">
        <Link className="brand" to="/">
          <span className="chip">
            <img src={logo} alt="" />
          </span>
          <BrandText />
        </Link>

        <div>
          <h1>
            Welcome back. <em>Keep leveling up.</em>
          </h1>
          <p>Pick up right where you left off on your roadmap.</p>
          <ul className="perks">
            <li>
              <svg viewBox="0 0 24 24">
                <path d="M5 12l5 5 9-10" />
              </svg>
              Roadmaps for every IT field
            </li>
            <li>
              <svg viewBox="0 0 24 24">
                <path d="M5 12l5 5 9-10" />
              </svg>
              Short lessons with real practice
            </li>
            <li>
              <svg viewBox="0 0 24 24">
                <path d="M5 12l5 5 9-10" />
              </svg>
              Track your progress every day
            </li>
          </ul>

          
        </div>

        <small>© 2026 DevUp</small>
      </aside>

      <main className="main">
        <div className="card">
          <Link className="brand mobile" to="/">
            <span className="chip">
              <img src={logo} alt="" />
            </span>
            <BrandText />
          </Link>

          <h2>Log in</h2>
          <p className="sub">Enter your details to continue learning.</p>

          <form onSubmit={handleSubmit}>
            <label className="field">
              <span>Email</span>
              <input
                type="email"
                name="email"
                className={error ? "invalid" : ""}
                placeholder="you@example.com"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </label>

            <label className="field">
              <div className="pass-row">
                <p style={{ fontWeight: "bold" }}>Password</p>{" "}
                <Link to="/forgot-password" className="forgot-pssw">
                  Forgot password?
                </Link>
              </div>
              <div className="pw-wrap">
                <input
                  type={showPw ? "text" : "password"}
                  name="password"
                  className={error ? "invalid" : ""}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="pw-toggle"
                  onClick={() => setShowPw((v) => !v)}
                  aria-label={showPw ? "Hide password" : "Show password"}
                >
                  {showPw ? (
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M3 3l18 18" />
                      <path d="M10.6 6.1A9.8 9.8 0 0112 6c5 0 8.5 4 9.5 6a14 14 0 01-3.2 3.9M6.6 6.7A14 14 0 002.5 12c1 2 4.5 6 9.5 6 1.5 0 2.8-.3 4-.9" />
                      <path d="M9.9 9.9a3 3 0 004.2 4.2" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M2.5 12C3.5 10 7 6 12 6s8.5 4 9.5 6c-1 2-4.5 6-9.5 6s-8.5-4-9.5-6z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </label>

            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <button className="btn primary" type="submit" disabled={loading}>
              {loading && <span className="spin" aria-hidden="true" />}
              {loading ? "Logging in..." : "Log in"}
            </button>
          </form>

          <div className="or">or continue with</div>

          <div className="social">
            <button
              className="btn"
              type="button"
              onClick={() => handleOAuth("google")}
            >
              <FcGoogle size={18} /> Google
            </button>
            <button
              className="btn"
              type="button"
              onClick={() => handleOAuth("github")}
            >
              <FaGithub size={18} /> GitHub
            </button>
          </div>

          <p className="switch">
            New to DevUp? <Link to="/signup">Create an account</Link>
          </p>
        </div>
      </main>
    </div>
  );
}