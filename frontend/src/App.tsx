import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import ProfilePage from "./pages/ProfilePage";
import { fetchMe } from "./lib/api";

type User = { id: number; email: string; name: string; role: string };

// With httpOnly cookies, JS can never read the token directly (that's the
// point — it protects against XSS). So "am I logged in?" is answered by
// asking the backend, not by checking localStorage like before.
function RootPage() {
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    fetchMe()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setChecking(false));
  }, []);

  if (checking) return null; // brief blank instead of flashing the wrong page

  return user ? <ProfilePage user={user} onLoggedOut={() => setUser(null)} /> : <HomePage />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<RootPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
      </Routes>
    </BrowserRouter>
  );
}