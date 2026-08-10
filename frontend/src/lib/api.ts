// Base URL of your NestJS backend.
// Move this to a .env file (VITE_API_URL) once you deploy anywhere.
const API_URL = "http://localhost:3000";

type User = { id: number; email: string; name: string; role: string };

type ApiError = {
  message: string | string[];
  error: string;
  statusCode: number;
};

// Every call sets credentials: "include" so the browser sends/receives
// the httpOnly accessToken/refreshToken cookies your backend now issues.
// There is no token to read or store in JS anymore — the cookies are
// invisible to frontend code by design (that's what makes them safer
// than localStorage against XSS).

async function handleResponse<T>(res: Response, fallbackMessage: string): Promise<T> {
  const data = await res.json();

  if (!res.ok) {
    const err = data as ApiError;
    const message = Array.isArray(err.message) ? err.message.join(", ") : err.message;
    throw new Error(message || fallbackMessage);
  }

  return data as T;
}

export async function login(email: string, password: string): Promise<{ user: User }> {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ email, password }),
  });

  return handleResponse(res, "Login failed");
}

export async function signup(name: string, email: string, password: string): Promise<{ user: User }> {
  const res = await fetch(`${API_URL}/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ name, email, password }),
  });

  return handleResponse(res, "Signup failed");
}

export async function fetchMe(): Promise<User> {
  const res = await fetch(`${API_URL}/users/me`, {
    credentials: "include",
  });

  return handleResponse(res, "Session expired, please log in again");
}

export async function logout(): Promise<void> {
  await fetch(`${API_URL}/auth/logout`, {
    method: "POST",
    credentials: "include",
  });
}