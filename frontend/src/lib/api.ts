// Base URL of your NestJS backend.
// Move this to a .env file (VITE_API_URL) once you deploy anywhere.
const API_URL = "http://localhost:3000";

type LoginResponse = {
  token: string;
  user: { id: number; email: string; name: string; role: string };
};

type ApiError = {
  message: string | string[];
  error: string;
  statusCode: number;
};

/**
 * Calls POST /auth/login on your NestJS backend.
 * Throws an Error with a readable message if the request fails
 * (wrong credentials, validation error, network error, etc).
 */
export async function login(email: string, password: string): Promise<LoginResponse> {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  const data = await res.json();

  if (!res.ok) {
    const err = data as ApiError;
    const message = Array.isArray(err.message) ? err.message.join(", ") : err.message;
    throw new Error(message || "Login failed");
  }

  return data as LoginResponse;
}

/**
 * Calls POST /auth/signup on your NestJS backend.
 * Same error-handling shape as login().
 */
export async function signup(name: string, email: string, password: string): Promise<LoginResponse> {
  const res = await fetch(`${API_URL}/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, password }),
  });

  const data = await res.json();

  if (!res.ok) {
    const err = data as ApiError;
    const message = Array.isArray(err.message) ? err.message.join(", ") : err.message;
    throw new Error(message || "Signup failed");
  }

  return data as LoginResponse;
}

/**
 * Calls GET /users/me with the stored token, to confirm the token
 * is valid and to fetch the logged-in user's own profile.
 */
export async function fetchMe(token: string) {
  const res = await fetch(`${API_URL}/users/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    throw new Error("Session expired, please log in again");
  }

  return res.json();
}