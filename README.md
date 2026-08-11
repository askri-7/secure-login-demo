# Secure Login Demo

This repository contains the implementation of a secure login flow using NestJS, Prisma, PostgreSQL, and React.

## What I Completed

- Built backend authentication with signup and login using bcrypt password hashing (cost factor 12).
- Added role-based protection for admin routes with `USER` / `ADMIN` enum.
- Added refresh token support with rotation and revocation — every refresh invalidates the previous token.
- Added a `RefreshToken` database model with indexed lookups and migration.
- Reduced access token lifetime to 15 minutes and refresh tokens to 7 days.
- Stored refresh tokens with a `tokenId` prefix for O(1) indexed lookup and hashed the secret portion with bcrypt — a database leak cannot be used to replay sessions.
- Switched from localStorage token storage to httpOnly cookies with `SameSite=Lax`.
- Updated frontend and backend communication to use credentialed requests.
- Fixed CORS configuration to allow frontend cookie-based auth requests.
- Fixed migration state issues that caused internal server errors during login.
- Added GitHub OAuth 2.0 login with explicit email verification via GitHub API and manual cookie-based `state` validation to prevent Login CSRF.
- Refactored GitHub OAuth from Passport to a manual `fetch`-based flow matching the Google OIDC pattern.
- Added Google Sign-In using OpenID Connect (OIDC) via `openid-client` with PKCE and cookie-based `state` validation.
- Implemented account linking — a user with a local account can link their GitHub or Google identity and log in with either method.
- Added per-endpoint rate limiting on auth routes using `@nestjs/throttler` (e.g., 5 login attempts per minute, 3 signups per minute).
- Added audit logging for every auth event (signup, login success/failure, logout, token refresh, OAuth success/failure) with IP and user agent tracking.
- Added a scheduled token cleanup job using `@nestjs/schedule` that runs daily at 3:00 AM to remove revoked and expired refresh tokens.

## What I Will Do Next

- Add production deployment documentation covering environment variables, SSL certificates, Nginx reverse proxy configuration, and updating OAuth redirect URIs from localhost to production domains.
- Add monitoring and structured logging to replace `console.error` with a production-grade logger (e.g., Pino or Winston) for searchable, aggregated logs.
- Add integration and E2E tests for refresh token rotation, logout flows, and OAuth account linking when the team is ready to invest in test coverage.

## Intended Repository Structure

