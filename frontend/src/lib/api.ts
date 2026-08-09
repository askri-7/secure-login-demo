const API_URL = "http://localhost:3000";

type User = {
  id: number;
  email: string;
  name: string;
  role: string;
};

type LoginResponse = {
  token: string;
  user: User;
};

type ApiError = {
  message: string | string[];
  error: string;
  statusCode: number;
};

export async function login(
  email: string,
  password: string
): Promise<LoginResponse> {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      password,
    }),
  });

  const data = await res.json();

  if (!res.ok) {
    const err = data as ApiError;

    const message = Array.isArray(err.message)
      ? err.message.join(", ")
      : err.message;

    throw new Error(message || "Login failed");
  }

  return data as LoginResponse;
}

export async function signup(
  name: string,
  email: string,
  password: string
): Promise<LoginResponse> {
  const res = await fetch(`${API_URL}/auth/signup`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name,
      email,
      password,
    }),
  });

  const data = await res.json();

  if (!res.ok) {
    const err = data as ApiError;

    const message = Array.isArray(err.message)
      ? err.message.join(", ")
      : err.message;

    throw new Error(message || "Signup failed");
  }

  return data as LoginResponse;
}

export async function fetchMe(token: string): Promise<User> {
  const res = await fetch(`${API_URL}/users/me`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(
      data?.message || "Session expired, please log in again"
    );
  }

  return data as User;
}