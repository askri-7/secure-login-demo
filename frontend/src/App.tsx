import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import ProfilePage from "./pages/ProfilePage";
import EmailVerifiedPage from "./pages/VerifyEmailPage";
import { fetchMe } from "./lib/api";

type User = { id: number; email: string; name: string; role: string };


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