import { useNavigate } from "react-router-dom";

export function HomePage() {
  const navigate = useNavigate();

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Secure Login Demo</h1>
        <p className="auth-subtitle">Choose an option to continue</p>

        <button onClick={() => navigate("/signup")}>Sign up</button>
        <button className="secondary" onClick={() => navigate("/login")}>
          Log in
        </button>
      </div>
    </div>
  );
}
