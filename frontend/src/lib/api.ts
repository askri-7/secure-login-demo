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

let isRefreshing = false;// ← global flag, shared by ALL requests
let refreshPromise: Promise<void> | null = null;

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
 * 4. If refresh also fails → returns the 401 response (NO redirect)
 *
 * Race-condition safe: if 5 requests hit 401 at the same time,
 * only ONE /auth/refresh call is made. The other 4 wait and
 * then retry with the new cookie.
 */
async function fetchWithAuth(
  url: string,
  options: RequestInit = {},
  isRetry = false  // isRetry = "I already refreshed once, don't loop"
): Promise<Response> {
  // fetch /auth/refresh
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

  //401 detected 

  // If another request is already refreshing → wait for it
  if (isRefreshing && refreshPromise) {
    return new Promise((resolve) => {
      addRefreshSubscriber((success) => {
        if (success) {
          resolve(fetchWithAuth(url, options, true));
        } else {
          resolve(res); // return original 401
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

      // FIX: set isRefreshing = false BEFORE notifying subscribers
      // so new requests don't get stuck waiting on a resolved promise
      isRefreshing = false;
      notifySubscribers(true);
    } catch {
      isRefreshing = false; // ← FIX: moved BEFORE notify
      notifySubscribers(false);
      // FIX: removed window.location.href = "/login"
      // Let the caller (React component) decide what to do
    } finally {
      refreshPromise = null;
    }
  })();

  await refreshPromise;

  // After refresh completes, retry the original request
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

/**
 * Explicit logout:
 * Calls backend to revoke the refresh token, then clears cookies,
 * then redirects to /login.
 */
export async function logout(): Promise<void> {
  try {
    await fetch(`${API_URL}/auth/logout`, {
      method: "POST",
      credentials: "include",
    });
  } catch {
    // ignore — cookies will expire naturally
  }
  window.location.href = "/";
}

// ─────────────────────────────────────────────────────────────
// PROTECTED API (uses the auto-refresh wrapper)
// ─────────────────────────────────────────────────────────────

export async function fetchMe(): Promise<User> {
  const res = await fetchWithAuth(`${API_URL}/users/me`);
  return handleResponse(res, "Session expired, please log in again");
}
