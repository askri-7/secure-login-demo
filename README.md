# Secure Login Demo

This repository contains the implementation of a secure login flow using NestJS, Prisma, PostgreSQL, and React.


## What We Completed
- Local auth (signup/login) with bcrypt passwords
- JWT access tokens (15 min) + refresh token rotation
- Role-based access control (USER / ADMIN)
- httpOnly cookie session management
- CORS configuration for credentialed requests
- GitHub OAuth (manual, with state cookie CSRF protection)
- Google OIDC via openid-client (PKCE + state cookie)
- Basic rate limiting (@nestjs/throttler, 100 req/min global)

## What We Will Do Next
- [ ] Tighten rate limiting on auth endpoints specifically
- [ ] Add CSRF tokens for general API endpoints (double-submit cookie)
- [ ] Audit logging for auth events
- [ ] Integration & E2E tests
- [ ] Production deployment docs
- [ ] Monitoring & structured logging

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
