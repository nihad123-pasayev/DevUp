import { useState } from "react";
import { Link } from "react-router-dom";
import { FcGoogle } from "react-icons/fc";
import { FaGithub } from "react-icons/fa";
import { supabase } from "../supabaseclient";
import { useNavigate } from "react-router-dom";
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
              <input
                type="password"
                name="password"
                placeholder="Enter your password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </label>

            {error && <p className="form-error">{error}</p>}
            <button className="btn primary" type="submit" disabled={loading}>
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
