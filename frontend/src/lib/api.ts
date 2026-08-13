export const API_URL = import.meta.env.VITE_API_URL || "/api";

type User = { id: number; email: string; name: string; role: string };

type ApiError = {
  message: string | string[];
  error: string;
  statusCode: number;
};

// ── TIMEOUT WRAPPER ──
async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs = 10000
): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return res;
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("Request timed out. Please try again.");
    }
    throw err;
  } finally {
    clearTimeout(id);
  }
}

// ── TOKEN REFRESH STATE ──
let isRefreshing = false;
let refreshPromise: Promise<void> | null = null;
let refreshSubscribers: Array<(success: boolean) => void> = [];

function notifySubscribers(success: boolean) {
  refreshSubscribers.forEach((cb) => cb(success));
  refreshSubscribers = [];
}

function addRefreshSubscriber(cb: (success: boolean) => void) {
  refreshSubscribers.push(cb);
}

// ── CORE FETCH WRAPPER ──
async function fetchWithAuth(
  url: string,
  options: RequestInit = {},
  isRetry = false
): Promise<Response> {
  const res = await fetchWithTimeout(url, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (res.status !== 401 || isRetry) {
    return res;
  }

  if (isRefreshing && refreshPromise) {
    return new Promise((resolve) => {
      addRefreshSubscriber((success) => {
        if (success) {
          resolve(fetchWithAuth(url, options, true));
        } else {
          resolve(res);
        }
      });
    });
  }

  isRefreshing = true;

  refreshPromise = (async () => {
    try {
      const refreshRes = await fetchWithTimeout(`${API_URL}/auth/refresh`, {
        method: "POST",
        credentials: "include",
      });

      if (!refreshRes.ok) throw new Error("Refresh failed");

      isRefreshing = false;
      notifySubscribers(true);
    } catch {
      isRefreshing = false;
      notifySubscribers(false);
    } finally {
      refreshPromise = null;
    }
  })();

  await refreshPromise;
  return fetchWithAuth(url, options, true);
}

// ── RESPONSE HELPER (safe JSON parsing) ──
async function handleResponse<T>(res: Response, fallbackMessage: string): Promise<T> {
  const contentType = res.headers.get("content-type") || "";

  // If response is not JSON (e.g., Nginx 502 HTML), handle gracefully
  if (!contentType.includes("application/json")) {
    const text = await res.text();
    console.error("Non-JSON response:", text.slice(0, 200));
    throw new Error(fallbackMessage);
  }

  const data = await res.json();

  if (!res.ok) {
    const err = data as ApiError;
    const message = Array.isArray(err.message)
      ? err.message.join(", ")
      : err.message;
    throw new Error(message || fallbackMessage);
  }

  return data as T;
}

// ── AUTH API ──
export async function login(email: string, password: string): Promise<{ user: User }> {
  const res = await fetchWithAuth(`${API_URL}/auth/login`, {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  return handleResponse(res, "Login failed");
}

export async function signup(name: string, email: string, password: string): Promise<{ user: User }> {
  const res = await fetchWithAuth(`${API_URL}/auth/signup`, {
    method: "POST",
    body: JSON.stringify({ name, email, password }),
  });
  return handleResponse(res, "Signup failed");
}

export async function logout(): Promise<void> {
  try {
    await fetchWithAuth(`${API_URL}/auth/logout`, { method: "POST" });
  } catch {
    // ignore
  }
  window.location.href = "/";
}

// ── PROTECTED API ──
export async function fetchMe(): Promise<User> {
  const res = await fetchWithAuth(`${API_URL}/users/me`);
  return handleResponse(res, "Session expired, please log in again");
}