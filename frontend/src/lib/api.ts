// Base URL of your NestJS backend.
export const API_URL = "http://localhost:3000";

type User = { id: number; email: string; name: string; role: string };

type ApiError = {
  message: string | string[];
  error: string;
  statusCode: number;
};

// ─────────────────────────────────────────────────────────────
// TOKEN REFRESH STATE (prevents race conditions)
// ─────────────────────────────────────────────────────────────

let isRefreshing = false;
let refreshPromise: Promise<void> | null = null;

// Subscribers waiting for the refresh to complete
let refreshSubscribers: Array<(success: boolean) => void> = [];

function notifySubscribers(success: boolean) {
  refreshSubscribers.forEach((cb) => cb(success));
  refreshSubscribers = [];
}

function addRefreshSubscriber(cb: (success: boolean) => void) {
  refreshSubscribers.push(cb);
}

// ─────────────────────────────────────────────────────────────
// CORE FETCH WRAPPER WITH AUTO-REFRESH
// ─────────────────────────────────────────────────────────────

/**
 * Wrapper around fetch that:
 * 1. Sends credentials (httpOnly cookies) automatically
 * 2. On 401 → calls /auth/refresh to get a new accessToken
 * 3. Retries the original request once after refresh
 * 4. If refresh also fails → redirects to /login
 *
 * Race-condition safe: if 5 requests hit 401 at the same time,
 * only ONE /auth/refresh call is made. The other 4 wait and
 * then retry with the new cookie.
 */
async function fetchWithAuth(
  url: string,
  options: RequestInit = {},
  isRetry = false
): Promise<Response> {
  const res = await fetch(url, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  // If not 401, or this is already a retry → just return it
  if (res.status !== 401 || isRetry) {
    return res;
  }

  // ── 401 detected ──

  // If another request is already refreshing → wait for it
  if (isRefreshing && refreshPromise) {
    return new Promise((resolve) => {
      addRefreshSubscriber((success) => {
        if (success) {
          // Retry original request with new cookie (browser auto-sends)
          resolve(fetchWithAuth(url, options, true));
        } else {
          // Refresh failed → return the 401 so caller handles it
          resolve(res);
        }
      });
    });
  }

  // ── We are the first 401 → start the refresh ──
  isRefreshing = true;

  refreshPromise = (async () => {
    try {
      const refreshRes = await fetch(`${API_URL}/auth/refresh`, {
        method: "POST",
        credentials: "include",
      });

      if (!refreshRes.ok) {
        throw new Error("Refresh failed");
      }

      notifySubscribers(true);
    } catch {
      notifySubscribers(false);
      // Clear cookies by calling logout, then redirect
      try {
        await fetch(`${API_URL}/auth/logout`, {
          method: "POST",
          credentials: "include",
        });
      } catch {
        // ignore
      }
      window.location.href = "/login";
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  await refreshPromise;

  // After refresh completes, retry the original request
  // The browser now has the new accessToken cookie
  return fetchWithAuth(url, options, true);
}

// ─────────────────────────────────────────────────────────────
// RESPONSE HELPER
// ─────────────────────────────────────────────────────────────

async function handleResponse<T>(res: Response, fallbackMessage: string): Promise<T> {
  const data = await res.json();

  if (!res.ok) {
    const err = data as ApiError;
    const message = Array.isArray(err.message) ? err.message.join(", ") : err.message;
    throw new Error(message || fallbackMessage);
  }

  return data as T;
}

// ─────────────────────────────────────────────────────────────
// AUTH API
// ─────────────────────────────────────────────────────────────

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

export async function logout(): Promise<void> {
  await fetch(`${API_URL}/auth/logout`, {
    method: "POST",
    credentials: "include",
  });
  window.location.href = "/login";
}

// ─────────────────────────────────────────────────────────────
// PROTECTED API (uses the auto-refresh wrapper)
// ─────────────────────────────────────────────────────────────

export async function fetchMe(): Promise<User> {
  const res = await fetchWithAuth(`${API_URL}/users/me`);
  return handleResponse(res, "Session expired, please log in again");
}

// Example: add more protected endpoints here
// export async function fetchDashboard(): Promise<DashboardData> {
//   const res = await fetchWithAuth(`${API_URL}/dashboard`);
//   return handleResponse(res, "Failed to load dashboard");
// }
