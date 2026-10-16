import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import logo from "/photos/logo.png"; 
import { supabase } from "../supabaseclient"; 
import "./Forgotpassword.css";

const cameFromResetLink =
  window.location.hash.includes("type=recovery") ||
  window.location.search.includes("code=");

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [mode, setMode] = useState("request"); // request | sent | reset | done
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Emaildəki linkdən gələndə "reset" rejiminə keç
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      const isRecovery =
        event === "PASSWORD_RECOVERY" ||
        (cameFromResetLink && (event === "SIGNED_IN" || event === "INITIAL_SESSION"));
      if (session && isRecovery) {
        setEmail(session.user.email ?? "");
        setMode("reset");
      }
    });
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (mode !== "done") return;
    const t = setTimeout(() => navigate("/login"), 3000);
    return () => clearTimeout(t);
  }, [mode, navigate]);

  const handleRequest = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/forgot-password`,
    });
    setLoading(false);
    if (resetError) setError(resetError.message);
    else setMode("sent");
  };

  const handleReset = async (e) => {
    e.preventDefault();
    setError("");
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setMode("done");
    await supabase.auth.signOut(); // yeni parolla özü login olsun
  };

  return (
    <div className="forgot">
      <aside className="side">
        <Link className="brand" to="/">
          <span className="chip">
            <img src={logo} alt="" />
          </span>
          Dev<b>Up</b>
        </Link>

        <div>
          <h1>
            Forgot your password? <em>No problem.</em>
          </h1>
          <p>We will help you get back to your roadmap in a minute.</p>
        </div>

        <small>© 2026 DevUp</small>
      </aside>

      <main className="main">
        <div className="card">
          <Link className="brand mobile" to="/">
            <span className="chip">
              <img src={logo} alt="" />
            </span>
            Dev<b>Up</b>
          </Link>

          {mode === "sent" && (
            <div>
              <h2>Check your email</h2>
              <p className="sub">
                We sent a password reset link to <b>{email}</b>. Open it to choose a new password.
              </p>
              <Link className="btn" to="/login">Back to log in</Link>
            </div>
          )}

          {mode === "done" && (
            <div>
              <h2>All done</h2>
              <p className="success">Password changed! Taking you to log in...</p>
            </div>
          )}

          {(mode === "request" || mode === "reset") && (
            <>
              <h2>{mode === "reset" ? "Set new password" : "Forgot password?"}</h2>
              <p className="sub">
                {mode === "reset"
                  ? "Choose a new password for your account."
                  : "Enter your email and we will send you a reset link."}
              </p>

              <form onSubmit={mode === "reset" ? handleReset : handleRequest}>
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
                    readOnly={mode === "reset"}
                    required
                  />
                </div>

                {mode === "reset" && (
                  <>
                    <div className="field">
                      <label htmlFor="newPassword">New password</label>
                      <input
                        id="newPassword"
                        type="password"
                        name="newPassword"
                        placeholder="At least 8 characters"
                        autoComplete="new-password"
                        minLength={8}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                    </div>

                    <div className="field">
                      <label htmlFor="confirmPassword">Repeat password</label>
                      <input
                        id="confirmPassword"
                        type="password"
                        name="confirmPassword"
                        placeholder="Repeat your new password"
                        autoComplete="new-password"
                        value={confirm}
                        onChange={(e) => setConfirm(e.target.value)}
                        required
                      />
                    </div>
                  </>
                )}

                {error && <p className="form-error">{error}</p>}
                <button className="btn primary" type="submit" disabled={loading}>
                  {mode === "reset"
                    ? loading ? "Saving..." : "Reset password"
                    : loading ? "Sending..." : "Send reset link"}
                </button>
              </form>

              <p className="switch">
                Remembered it? <Link to="/login">Log in</Link>
              </p>
            </>
          )}
        </div>
      </main>
    </div>
  );
}