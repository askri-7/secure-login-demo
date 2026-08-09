import { useNavigate } from "react-router-dom";

export default function HomePage() {
  const navigate = useNavigate();

  return (
    <div className="auth-page">
      <div className="home-wrap">
        <div className="status-row">
          <span className="status-dot" />
          System secure
        </div>

        <h1>
          Vault<span className="accent">.</span>
        </h1>
        <p className="home-subtitle">
          Your account, verified. Sign in with an existing account,
          or create a new one to get started.
        </p>

        <div className="home-actions">
          <button className="primary" onClick={() => navigate("/signup")}>
            Sign up
          </button>
          <button className="secondary" onClick={() => navigate("/login")}>
            Log in
          </button>
        </div>
      </div>
    </div>
  );
}