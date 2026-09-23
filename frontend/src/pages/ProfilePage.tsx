import { useNavigate } from "react-router-dom";
import { logout } from "../lib/api";

type User = { id: number; email: string; name: string; role: string };

type ProfilePageProps = {
  user: User;
  onLoggedOut: () => void;
};

export default function ProfilePage({ user, onLoggedOut }: ProfilePageProps) {
  const navigate = useNavigate();

  async function handleLogout() {
    
    await logout();
    onLoggedOut();
    navigate("/");
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <p className="auth-eyebrow">Session active</p>
        <h1>Welcome, {user.name}</h1>
        <p className="auth-subtitle">{user.email}</p>
       
        <button className="secondary" onClick={handleLogout}>
          Log out
        </button>
      </div>
    </div>
  );
}