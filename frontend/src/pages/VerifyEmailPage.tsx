import { useNavigate, useSearchParams } from "react-router-dom";

// The backend's GET /auth/verify-email handler redirects here with
// ?status=success once the token has been validated and the user's
// emailVerified flag flipped to true. Any other value (or an outright
// error response, since the backend only redirects on success) means the
// link was invalid, already used, or expired.
export default function EmailVerifiedPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const success = searchParams.get("status") === "success";

  return (
    <div className="auth-page">
      <div className="auth-card">
        {success ? (
          <>
            <p className="auth-eyebrow">Email verified</p>
            <h1>You're all set</h1>
            <p className="auth-subtitle">
              Your email has been verified. You can sign in now.
            </p>
          </>
        ) : (
          <>
            <p className="auth-eyebrow">Verification failed</p>
            <h1>That link didn't work</h1>
            <p className="auth-subtitle">
              This verification link is invalid or has expired. Try signing
              up again, or sign in if you've already verified your email.
            </p>
          </>
        )}

        {/* type="submit" (no surrounding <form>) just for the red primary
            styling — .auth-card button[type=submit] is how this codebase
            themes its main call-to-action buttons. */}
        <button type="submit" onClick={() => navigate("/login")}>
          Go to sign in
        </button>
      </div>
    </div>
  );
}