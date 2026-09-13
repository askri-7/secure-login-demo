# 🔐 Secure Login Demo

A production-grade authentication system demonstrating how to build **secure, observable, and maintainable** auth with NestJS + React. Every security decision is intentional and traceable.

---

## 📸 In Action

| Login | Sign Up | Dashboard |
|:-----:|:-------:|:---------:|
| ![Login](assets/login.png) | ![Signup](assets/signup.png) | ![Dashboard](assets/dashboard.png) |


---

## Why This Exists

Most auth tutorials stop at "hash the password and sign a JWT." This repo goes further — it implements the **defense in depth** patterns you actually need before shipping to production:

- **Refresh token rotation** with bcrypt-hashed secrets (stolen DB ≠ stolen sessions)
- **Account lockout** with sliding-window brute-force protection
- **Manual OAuth flows** (no Passport black boxes) — PKCE, state validation, explicit email verification
- **Full audit trail** — every auth event logged with IP + user agent
- **Email verification** with one-time burn-after-reading tokens
- **Rate limiting, helmet  CSP headers, httpOnly cookies, correlation IDs** — the boring stuff that saves you at 3 AM

---

## Stack

| Layer | Tech |
|------|------|
| Backend | NestJS · TypeScript · Prisma · PostgreSQL · Redis |
| Auth | JWT (15m access) · bcrypt (cost 12) · OAuth 2.0 + OIDC · PKCE |
| Frontend | React · Vite · TypeScript |
| Infra | Docker · Nginx · GitHub Actions · Docker Scout |

---

## Architecture

```
┌─────────┐     ┌────────┐     ┌─────────────┐
│ Browser │────▶│ Nginx  │────▶│ NestJS API  │
│ (React) │◀────│ 80/443 │◀────│   :3000     │
└─────────┘     └────────┘     └──────┬──────┘
                                      │
                    ┌─────────────────┼─────────────────┐
                    ▼                 ▼                 ▼
               PostgreSQL         Redis (tokens)      Gmail SMTP
```

---

## Quick Start

```bash
# 1. Clone & env
git clone https://github.com/askri-7/secure-login-demo.git
cd secure-login-demo
cp backend/.env.example backend/.env   # fill in your secrets

# 2. Run everything
docker compose up --build

# 3. Open http://localhost:5173
```

## PostgreSQL Authentication

Production uses Azure Database for PostgreSQL Flexible Server with Azure Entra
authentication. The backend runs on the app VM and uses that VM's user assigned
managed identity as the database principal. `DefaultAzureCredential` obtains a
short lived PostgreSQL token for each new pool connection and refreshes it before
expiry. Tokens are never logged, stored in files, or baked into images.

The migration pipeline uses a separate managed identity with migration
permissions. It runs before application deployment. The application image and
publishing identity do not need database access. The web tier has no database or
Key Vault access.

Azure backend configuration:

```text
NODE_ENV=production
DB_AUTH_MODE=entra
DB_HOST=your-server.postgres.database.azure.com
DB_PORT=5432
DB_NAME=authdb
DB_PRINCIPAL=the-app-managed-identity-principal-name
AZURE_KEY_VAULT_URL=https://your-vault.vault.azure.net/
FRONTEND_URL=https://your-frontend.example
```

Production does not use `DB_PASSWORD`, `DATABASE_URL_PASSWORD`, or a PostgreSQL
password. The compose file does not mount backend or database secret files.
The app VM deployment must provide managed identity access to the container's
Azure identity endpoint. Plain local Docker Compose cannot provide that identity.

Production uses two separate Compose projects:

```bash
# On each VM, authenticate Docker to the public ACR endpoint with that VM's UAMI.
az login --identity --client-id "$VM_MANAGED_IDENTITY_CLIENT_ID"
az acr login --name "$ACR_NAME"

# App VM: backend, Redis, Azure PostgreSQL and Key Vault access
docker compose -f docker-compose.app.prod.yml up -d

# Web VM: frontend and certificates only
docker compose -f docker-compose.web.prod.yml up -d
```

Set `APP_VM_PRIVATE_HOST` on the web VM to the private address or private DNS
name of the app VM. Only the web VM can reach the backend port. The web VM does
not receive `DB_HOST`, `DB_NAME`, `DB_PRINCIPAL`, or `AZURE_KEY_VAULT_URL`.
The app VM does not run the frontend or certificate services.

The application image workflow reads the nonsecret repository variable
`ACR_NAME`. Set it to the exact value returned by the infrastructure repository:

```bash
terraform output -raw acr_name
```

Also ensure `AZURE_SUBSCRIPTION_ID` points to the subscription containing that
registry. The workflow stops before Docker builds if either value is wrong.

Local Docker Compose runs a separate PostgreSQL container with a development
only password. Copy `backend/.env.example` to `backend/.env`, keep
`DB_AUTH_MODE=password`, and use the local `DATABASE_URL`. These settings must
not be reused by the Azure compose deployment.

## Prisma Commands

Run these from `backend`:

```bash
npm ci
npx prisma generate
npx prisma migrate deploy
npx prisma db seed
```

The backend startup runs only the application. It never runs migrations or
seed. The dedicated migration workflow must provide an ephemeral
`DATABASE_URL` for the migration identity, then run `npx prisma migrate deploy`
and `npx prisma db seed`. The URL may contain that short lived access token only
for the lifetime of the workflow; it must not be committed or stored as a
secret intended for application runtime.




---

## Security Highlights

| Feature | How It's Done |
|:--------|:--------------|
| **Passwords** | bcrypt, cost factor 12 |
| **Sessions** | httpOnly `SameSite=Lax` cookies — no localStorage |
| **Refresh tokens** | Split-token pattern: `tokenId` (indexed lookup) + bcrypt-hashed secret. Rotated on every use. Revoked tokens cleaned daily at 3 AM. |
| **OAuth** | Manual `fetch`-based flows (GitHub) + `openid-client` (Google). PKCE + cookie-stored `state` to prevent CSRF. |
| **Account linking** | One local user can link GitHub and Google identities. |
| **Brute force** | 3 failed logins → 15-min lockout. Timing-attack safe (dummy bcrypt on missing users). |
| **Rate limiting** | `@nestjs/throttler` — 10 req/min per endpoint. |
| **Audit** | Every signup, login, logout, refresh, OAuth attempt logged with IP + user agent. |
| **Headers** | Helmet CSP, CORS whitelist, correlation IDs for tracing. |

---

## Project Structure

```
backend/
  src/auth/          # JWT, OAuth, guards, DTOs, audit logging
  src/email/         # SMTP + email verification token service
  src/users/         # RBAC-protected user routes
  prisma/            # Schema + migrations

frontend/
  src/pages/         # Login, Signup, VerifyEmail, Profile
  src/lib/api.ts     # Auto-refreshing fetch wrapper
```

---

## CI/CD

```
Push to main
    │
    ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│ Lint + Build │───▶│ Docker Scout│───▶│ Deploy to VM│
│  + Secret Scan│    │  CVE scan   │    │  via SSH    │
└─────────────┘    └─────────────┘    └─────────────┘
```

---

## License

MIT
