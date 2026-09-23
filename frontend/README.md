# Frontend — Secure Login Demo

React + TypeScript + Vite client for the auth flows described in the [root README](../README.md).

## Stack

React · Vite · TypeScript

## Setup

```bash
npm install
cp .env.example .env   # set VITE_API_URL to point at the backend
```

## Run

```bash
npm run dev       # http://localhost:5173
npm run build     # production build
npm run preview   # preview the production build locally
```

## Structure

```
src/
  pages/        # Login, Signup, VerifyEmail, Profile
  lib/api.ts    # fetch wrapper: 10s timeout + auto-refresh on 401
```

## Notes

- All API calls go through `src/lib/api.ts` rather than calling `fetch` directly — it handles request timeouts and silently refreshes the access token on a 401, retrying the original request once.
- Access and refresh tokens are stored in httpOnly cookies, never in `localStorage`, so `api.ts` never reads or writes tokens itself  it only reacts to 401s.
- Built with strict TypeScript on purpose: the frontend shares the same `User`/error shapes as the backend, so a field-name typo (`emailVerified` vs `email_verified`) fails at compile time instead of becoming a silent runtime bug.