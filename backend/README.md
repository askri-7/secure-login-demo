# Backend — Secure Login Demo

NestJS + TypeScript API: authentication, authorization, and the security plumbing described in the [root README](../README.md).

## Stack

NestJS · TypeScript · Prisma · PostgreSQL · Redis · bcrypt · `openid-client`

## Setup

```bash
npm install
cp .env.example .env   # fill in DATABASE_URL, JWT_SECRET, OAuth secrets, SMTP creds
npx prisma migrate dev
```

> **Local dev note:** secrets are read from `.env`. Azure Key Vault is only used in production — see the root README for how that startup step is disabled locally.

## Run

```bash
npm run start:dev      # watch mode
npm run start:prod     # production build
```

## Test

```bash
npm run test
npm run test:e2e
```

## Structure

```
src/
  auth/        # login, signup, JWT, OAuth (Google/GitHub), guards
  users/       # RBAC-protected routes (/users/me, /users)
  email/       # SMTP + email verification tokens (Redis, 24h TTL)
  keyvault/    # Azure Key Vault client (production only)
prisma/
  schema.prisma
```

## Key environment variables

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection (rate limiting, email tokens) |
| `JWT_SECRET` | HMAC key for signing access tokens |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OIDC login |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | GitHub OAuth 2.0 login |
| `SMTP_*` | Email verification delivery |
| `AZURE_KEY_VAULT_URL` | Production only — leave unset locally |

Full architecture, sequence diagrams, and the reasoning behind each security decision are documented in the internship report, Chapter 3.