import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import ProfilePage from "./pages/ProfilePage";
import EmailVerifiedPage from "./pages/VerifyEmailPage";
import { fetchMe } from "./lib/api";

type User = { id: number; email: string; name: string; role: string };

/**
 * RootPage ("/"):
 * On first visit with no session:
 *   - fetchMe() → 401 → fetchWithAuth tries refresh → 401
 *   - fetchWithAuth returns 401 (NO redirect)
 *   - handleResponse throws → RootPage catches → user = null
 *   - Renders <LoginPage /> at "/" — URL stays "/"
 *
 * On visit with valid session:
 *   - fetchMe() succeeds → user is set → renders <HomePage />
 *
 * On visit with expired access token but valid refresh token:
 *   - fetchMe() → 401 → fetchWithAuth calls /auth/refresh
 *   - Backend issues new cookies → fetchWithAuth retries /users/me
 *   - Succeeds silently → user is set → renders <HomePage />
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
       return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
        <p>Loading…</p>
      </div>
    )
  }

  return user ? <ProfilePage user={user} onLoggedOut={() => setUser(null)} /> : <HomePage />;
}

/**
 *
 * If not authenticated → redirects to "/login"
 * If authenticated → renders ProfilePage
 */



export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<RootPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/verify-email" element={<EmailVerifiedPage />} /> {/* ← CHANGED from /email-verified */}
      </Routes>
    </BrowserRouter>
  );
}