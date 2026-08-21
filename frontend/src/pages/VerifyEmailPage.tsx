import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { API_URL } from "../lib/api";

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const [isProcessing, setIsProcessing] = useState(true);

  const token = searchParams.get("token");
  const error = searchParams.get("error");
  const status = searchParams.get("status");

  useEffect(() => {
    // CASE 1: We have a token → forward to backend to verify + set cookies
    if (token) {
      // Full page navigation (not fetch) so backend can set httpOnly cookies
      window.location.href = `${API_URL}/auth/verify-email?token=${encodeURIComponent(token)}`;
      return;
    }

    // CASE 2: No token, no error, no status → direct access / invalid
    if (!error && !status) {
      // Replace URL to show error state without token in history
      window.history.replaceState(null, "", "/verify-email?error=missing_token");
    }

    setIsProcessing(false);
  }, [token, error, status]);

  // ── Render states ──

  // While redirecting to backend (token present)
  if (token) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <p className="auth-eyebrow">Verifying...</p>
          <h1>Please wait</h1>
          <p className="auth-subtitle">We're processing your verification.</p>
          <div className="spinner" /> {/* add a CSS spinner if you have one */}
        </div>
      </div>
    );
  }

  // Determine message from error/status
  let eyebrow = "Verifying...";
  let title = "Please wait";
  let message = "We're processing your verification.";
  let buttonText = "Go to sign in";
  let buttonLink = "/login";
  let showErrorSwitch = false;

  if (status === "success") {
    eyebrow = "Email verified";
    title = "You're all set";
    message = "Your email has been verified. You can sign in now.";
  } else if (error === "expired_or_invalid") {
    eyebrow = "Verification failed";
    title = "That link didn't work";
    message = "This verification link has expired or is invalid. Try signing up again to receive a new one.";
    buttonText = "Sign up again";
    buttonLink = "/signup";
    showErrorSwitch = true;
  } else if (error === "missing_token") {
    eyebrow = "Verification failed";
    title = "Invalid link";
    message = "No verification token was provided. Please check your email and try the link again.";
    buttonText = "Sign up again";
    buttonLink = "/signup";
    showErrorSwitch = true;
  } else if (error) {
    eyebrow = "Verification failed";
    title = "Something went wrong";
    message = "We couldn't verify your email. Please try again later.";
    buttonText = "Sign up again";
    buttonLink = "/signup";
    showErrorSwitch = true;
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <p className="auth-eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="auth-subtitle">{message}</p>

        <button type="button">
          <Link to={buttonLink} style={{ color: "inherit", textDecoration: "none" }}>
            {buttonText}
          </Link>
        </button>

        {showErrorSwitch && (
          <p className="auth-switch">
            Already verified? <Link to="/login">Sign in</Link>
          </p>
        )}
      </div>
    </div>
  );
}