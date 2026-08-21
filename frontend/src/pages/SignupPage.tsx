import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { signup } from "../lib/api";
import OAuthButtons from "./components/OAuthButtons";

export default function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  // Signup no longer logs the user in — the backend creates an unverified
  // account and emails a verification link. Once that succeeds we swap the
  // form out for a "check your email" notice instead of navigating away.
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      await signup(name, email, password, confirmPassword);
      setSubmittedEmail(email);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (submittedEmail) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <p className="auth-eyebrow">Almost there</p>
          <h1>Check your email</h1>
          <p className="auth-subtitle">
            We sent a verification link to <strong>{submittedEmail}</strong>.
            Click it to activate your account, then sign in.
          </p>

          <p className="auth-switch">
            <Link to="/login">Back to sign in</Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={handleSubmit}>
        <p className="auth-eyebrow">New account</p>
        <h1>Create account</h1>
        <p className="auth-subtitle">Sign up to get started</p>


        <label htmlFor="name">Name</label>
        <input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          minLength={2}
          autoComplete="name"
        />

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
          autoComplete="new-password"
        />

        <label htmlFor="confirmPassword">Confirm password</label>
        <input
          id="confirmPassword"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          minLength={8}
          autoComplete="new-password"
        />

        {error && <p className="auth-error">{error}</p>}

        <button type="submit" disabled={loading}>
          {loading ? "Creating account…" : "Sign up"}
        </button>
        
         
         <p className="oauth-divider">or</p>
        <OAuthButtons />
        

        <p className="auth-switch">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </form>
    </div>
  );
}