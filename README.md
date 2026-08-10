# Secure Login Demo

This repository contains the implementation of a secure login flow using NestJS, Prisma, PostgreSQL, and React.

## What I Completed

- Built backend authentication with signup and login.
- Added role-based protection for admin routes.
- Added refresh token support with rotation and revocation.
- Added a `RefreshToken` database model and migration.
- Reduced access token lifetime to 15 minutes.
- Stored refresh tokens hashed in the database (never raw values).
- Switched from localStorage token storage to httpOnly cookies.
- Updated frontend and backend communication to use credentialed requests.
- Fixed CORS configuration to allow frontend cookie-based auth requests.
- Fixed migration state issues that caused internal server errors during login.
- Added GitHub OAuth 2.0 login with explicit email verification via GitHub API.
- Implemented account linking: a user with a local account can link their GitHub identity and log in with either method.

## What We Will Do Next

- Add Google Sign-In using OpenID Connect (OIDC) via `openid-client`.
- Add login rate limiting and account lockout policy.
- Add CSRF protection for cookie-based auth endpoints.
- Add audit logging for auth and admin actions.
- Add automated seed/setup scripts for easier local onboarding.
- Add integration and e2e tests for refresh and logout flows.
- Improve deployment docs for production cookie settings.
- Add monitoring and structured error reporting.
## Intended Repository Structure

```text
secure-login-demo/
  backend/
    src/
      auth/
      users/
      database/
      app.module.ts
      main.ts
    prisma/
      schema.prisma
      migrations/
    test/
    package.json

  frontend/
    src/
      lib/
      pages/
      App.tsx
      main.tsx
    package.json

  deploy/
    nginx/

  README.md
```
