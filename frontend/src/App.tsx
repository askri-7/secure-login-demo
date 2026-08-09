import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HomePage } from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import ProfilePage from "./pages/ProfilePage";

// Landing page ("/") shows Sign up / Log in buttons if no token,
// otherwise shows the profile. Simplest way to keep this demo small.
function RootPage() {
  const hasToken = Boolean(localStorage.getItem("token"));
  return hasToken ? <ProfilePage /> : <HomePage />;
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
