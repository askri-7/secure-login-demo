import { useSearchParams, Link } from "react-router-dom";

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const error = searchParams.get("error");

  // This page ONLY handles errors. Success never reaches here —
  // the backend redirects to /?verified=1 instead.

  let eyebrow = "Verification failed";
  let title = "Something went wrong";
  let message = "We couldn't verify your email. Please try again later.";
  let buttonText = "Sign up again";
  let buttonLink = "/signup";

  if (error === "missing_token") {
    title = "Invalid link";
    message = "No verification token was provided. Please check your email and try the link again.";
  } else if (error === "expired_or_invalid") {
    title = "That link didn't work";
    message = "This verification link has expired or is invalid. Try signing up again to receive a new one.";
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

        <p className="auth-switch">
          Already verified? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}