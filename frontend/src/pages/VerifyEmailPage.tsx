import { useSearchParams, Link } from "react-router-dom";

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  
  // Backend sends ?error=... on failure
  // Backend sends ?status=success on success (legacy) or redirects to / on success (new)
  const error = searchParams.get("error");
  const status = searchParams.get("status");

  // Determine what to show
  const hasError = !!error || (!status && !error); // error param OR no params at all (direct access)
  const isSuccess = status === "success";

  let eyebrow = "Verifying...";
  let title = "Please wait";
  let message = "We're processing your verification.";
  let buttonText = "Go to sign in";
  let buttonLink = "/login";

  if (isSuccess) {
    eyebrow = "Email verified";
    title = "You're all set";
    message = "Your email has been verified. You can sign in now.";
  } else if (error === "expired_or_invalid") {
    eyebrow = "Verification failed";
    title = "That link didn't work";
    message = "This verification link has expired or is invalid. Try signing up again to receive a new one.";
    buttonText = "Sign up again";
    buttonLink = "/signup";
  } else if (error === "missing_token") {
    eyebrow = "Verification failed";
    title = "Link is expired";
    message = "Invalid verification link. No token was provided.";
    buttonText = "Sign up again";
    buttonLink = "/signup";
  } else if (error) {
    eyebrow = "Verification failed";
    title = "Something went wrong";
    message = "We couldn't verify your email. Please try again later.";
    buttonText = "Sign up again";
    buttonLink = "/signup";
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <p className="auth-eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="auth-subtitle">{message}</p>

        <button type="submit">
          <Link to={buttonLink} style={{ color: "inherit", textDecoration: "none" }}>
            {buttonText}
          </Link>
        </button>

        {hasError && (
          <p className="auth-switch">
            Already verified? <Link to="/login">Sign in</Link>
          </p>
        )}
      </div>
    </div>
  );
}