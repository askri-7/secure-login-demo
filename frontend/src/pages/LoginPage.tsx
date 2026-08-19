import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { login } from "../lib/api";
import OAuthButtons from "./components/OAuthButtons";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login(email, password);
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const isUnverifiedError = error?.toLowerCase().includes("verify your email");

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={handleSubmit}>
        <p className="auth-eyebrow">Authenticate</p>
        <h1>Sign in</h1>
        <p className="auth-subtitle">Enter your account credentials</p>

        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
        />

        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
          autoComplete="current-password"
        />

        {error && (
          <p
            className="auth-error"
            style={isUnverifiedError ? { color: "#f59e0b" } : undefined}
          >
            {error}
            {isUnverifiedError && (
              <span
                style={{
                  display: "block",
                  marginTop: "0.35rem",
                  fontSize: "0.78rem",
                  opacity: 0.85,
                }}
              >
                Check your inbox for the verification link.
              </span>
            )}
          </p>
        )}

        <button type="submit" disabled={loading}>
          {loading ? "Signing in…" : "Sign in"}
        </button>

        <p className="oauth-divider">or</p>
        <OAuthButtons />

        <p className="auth-switch">
          No account yet? <Link to="/signup">Sign up</Link>
        </p>
      </form>
    </div>
  );
}