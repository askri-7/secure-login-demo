import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import ProfilePage from "./pages/ProfilePage";
import { fetchMe, logout } from "./lib/api";

type User = { id: number; email: string; name: string; role: string };

/**
 * Root guard:
 * 1. On mount, calls /users/me to check if the user is logged in.
 * 2. If the access token is expired, fetchWithAuth auto-calls
 *    /auth/refresh and retries — all silently.
 * 3. Only if refresh ALSO fails does the user get redirected to /login.
 */
function RootPage() {
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    fetchMe()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setChecking(false));
  }, []);

  if (checking) {
    // You can replace this with a spinner/loading component
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
        <p>Loading…</p>
      </div>
    );
  }

  return user ? (
    <HomePage user={user} onLogout={() => { logout(); setUser(null); }} />
  ) : (
    <LoginPage />
  );
}

/**
 * Protected route wrapper:
 * Re-uses the same fetchMe check. If not authenticated,
 * the auto-refresh logic runs first. Only if that fails
 * do we redirect.
 */
function ProtectedProfile() {
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    fetchMe()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setChecking(false));
  }, []);

  if (checking) return <p>Loading…</p>;
  if (!user) return <Navigate to="/login" replace />;

  return <ProfilePage user={user} />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<RootPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/profile" element={<ProtectedProfile />} />
      </Routes>
    </BrowserRouter>
  );
}
