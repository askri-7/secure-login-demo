import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchMe } from "../lib/api";

type User = { id: number; email: string; name: string; role: string };

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }

    fetchMe(token)
      .then(setUser)
      .catch(() => {
        localStorage.removeItem("token");
        navigate("/login");
      });
  }, [navigate]);

  function handleLogout() {
    localStorage.removeItem("token");
    navigate("/login");
  }

  if (!user) return null; // brief flash while /users/me resolves

  return (
    <div className="auth-page">
      <div className="auth-card">
        <p className="auth-eyebrow">Session active</p>
        <h1>Welcome, {user.name}</h1>
        <p className="auth-subtitle">{user.email}</p>
        <span className="profile-role">{user.role}</span>
        <button className="secondary" onClick={handleLogout}>
          Log out
        </button>
      </div>
    </div>
  );
}