import { useState } from "react";
import { Link } from "react-router-dom";
import { FcGoogle } from "react-icons/fc";
import { FaGithub } from "react-icons/fa";
import { FiEye, FiEyeOff } from "react-icons/fi";
import logo from "/photos/logo.png";
import "./SignupPage.css";
import { supabase } from "../supabaseclient";

const strengthLabels = ["", "Weak", "Fair", "Good", "Strong"];

function getStrength(pw) {
  if (!pw) return 0;
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return pw.length < 8 ? Math.min(score, 1) : score;
}
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
export default function Signup() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [agree, setAgree] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const strength = getStrength(password);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (!agree) {
      setError("Please accept the Terms and Privacy Policy.");
      return;
    }
    setLoading(true);
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${window.location.origin}/login`,
      },
    });

    setLoading(false);
    if (signUpError)
      setError(
        signUpError.message === "User already registered"
          ? "An account with this email already exists."
          : signUpError.message,
      );
    else setSent(true);
  };
  const handleOAuth = async (provider) => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/` },
    });
    if (error) setError(error.message);
  };

  return (
    <div className="signup">
      <aside className="side">
        <Link className="brand" to="/">
          <span className="chip">
            <img src={logo} alt="" />
          </span>
          <BrandText />
        </Link>

        <div>
          <h1>
            Start your journey. <em>Level up from zero.</em>
          </h1>
          <p>Create a free account and pick your first roadmap in minutes.</p>
          <ul className="perks">
            <li>
              <svg viewBox="0 0 24 24">
                <path d="M5 12l5 5 9-10" />
              </svg>
              Free to get started
            </li>
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
              Learn at your own pace
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
          {sent ? (
            <div className="sent">
              <h2>Check your email</h2>
              <p className="sub">
                We sent a confirmation link to <b>{email}</b>. Click it to
                activate your account.
              </p>
              <Link className="btn primary" to="/login">
                Back to log in
              </Link>
            </div>
          ) : (
            <>
              <h2>Create account</h2>
              <p className="sub">Start learning IT from zero today.</p>

              <form onSubmit={handleSubmit}>
                <div className="field">
                  <label htmlFor="fullName">Full name</label>
                  <input
                    id="fullName"
                    type="text"
                    name="fullName"
                    placeholder="Your full name"
                    autoComplete="name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>

                <div className="field">
                  <label htmlFor="email">Email</label>
                  <input
                    id="email"
                    type="email"
                    name="email"
                    placeholder="you@example.com"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="field">
                  <label htmlFor="password">Password</label>
                  <div className="pass-wrap">
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      name="password"
                      placeholder="At least 8 characters"
                      autoComplete="new-password"
                      minLength={8}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <button
                      className="eye"
                      type="button"
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <FiEyeOff size={20} />
                      ) : (
                        <FiEye size={20} />
                      )}
                    </button>
                  </div>
                  {password && (
                    <div className="strength" data-level={strength}>
                      <div className="bars">
                        <span />
                        <span />
                        <span />
                        <span />
                      </div>
                      <small>{strengthLabels[strength]}</small>
                    </div>
                  )}
                </div>

                <label className="agree">
                  <input
                    type="checkbox"
                    checked={agree}
                    onChange={(e) => setAgree(e.target.checked)}
                    required
                  />
                  <span>
                    I agree to the <Link to="/terms">Terms</Link> and{" "}
                    <Link to="/privacy">Privacy Policy</Link>
                  </span>
                </label>

                {error && <p className="form-error">{error}</p>}
                <button
                  className="btn primary"
                  type="submit"
                  disabled={loading}
                >
                  {loading ? "Creating..." : "Create account"}
                </button>
              </form>

              <div className="or">or sign up with</div>

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
                Already have an account? <Link to="/login">Log in</Link>
              </p>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
