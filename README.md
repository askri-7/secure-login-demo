# Secure Login System on Azure

> A security-focused full-stack web application deployed on Microsoft Azure using Infrastructure as Code (Terraform). The project demonstrates cloud deployment, secure authentication, Linux administration, and DevSecOps best practices.


# Security Objectives

This project is built with security as the primary objective.

The authentication system will implement:

- Password hashing using bcrypt
- JWT authentication
- Protected API endpoints
- Role-based authorization
- Secure password policy
- Account lockout after repeated failed logins
- Login rate limiting
- Secure HTTP headers
- Input validation
- SQL Injection prevention
- Cross-Site Scripting (XSS) mitigation
- Cross-Site Request Forgery (CSRF) protection (where applicable)
- Audit logging
- HTTPS through Nginx

---
```
secure-login/
│
├── backend/                         # NestJS REST API
│   │
│   ├── src/
│   │   │
│   │   ├── auth/                    # Authentication module
│   │   │   ├── dto/
│   │   │   │   ├── login.dto.ts
│   │   │   │   └── register.dto.ts
│   │   │   │
│   │   │   ├── guards/
│   │   │   │   ├── jwt-auth.guard.ts
│   │   │   │   └── roles.guard.ts
│   │   │   │
│   │   │   ├── strategies/
│   │   │   │   └── jwt.strategy.ts
│   │   │   │
│   │   │   ├── decorators/
│   │   │   │   └── roles.decorator.ts
│   │   │   │
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   └── auth.module.ts
│   │   │
│   │   ├── users/
│   │   │   ├── dto/
│   │   │   ├── entities/
│   │   │   │   └── user.entity.ts
│   │   │   ├── users.controller.ts
│   │   │   ├── users.service.ts
│   │   │   └── users.module.ts
│   │   │
│   │   ├── audit/                   # Security audit logging
│   │   │   ├── audit.service.ts
│   │   │   ├── audit.controller.ts
│   │   │   └── audit.module.ts
│   │   │
│   │   ├── security/                # Security mechanisms
│   │   │   ├── rate-limit/
│   │   │   ├── password-policy/
│   │   │   ├── headers/
│   │   │   └── csrf/
│   │   │
│   │   ├── health/
│   │   │   ├── health.controller.ts
│   │   │   └── health.module.ts
│   │   │
│   │   ├── database/
│   │   │   ├── prisma.service.ts
│   │   │   └── database.module.ts
│   │   │
│   │   ├── config/
│   │   │   ├── configuration.ts
│   │   │   └── validation.ts
│   │   │
│   │   ├── common/
│   │   │   ├── decorators/
│   │   │   ├── filters/
│   │   │   ├── guards/
│   │   │   ├── interceptors/
│   │   │   ├── middleware/
│   │   │   ├── pipes/
│   │   │   └── utils/
│   │   │
│   │   ├── app.module.ts
│   │   └── main.ts
│   │
│   ├── prisma/
│   │   ├── migrations/
│   │   ├── schema.prisma
│   │   └── seed.ts
│   │
│   ├── test/
│   │   ├── unit/
│   │   └── e2e/
│   │
│   ├── Dockerfile
│   ├── package.json
│   ├── tsconfig.json
│   ├── nest-cli.json
│   ├── .env.example
│   └── README.md
│
│
├── frontend/                        # React + Vite SPA
│   │
│   ├── public/
│   │   ├── favicon.ico
│   │   └── logo.png
│   │
│   ├── src/
│   │   │
│   │   ├── assets/
│   │   │
│   │   ├── api/
│   │   │   └── api.ts               # Axios instance
│   │   │
│   │   ├── components/
│   │   │   ├── Navbar/
│   │   │   ├── ProtectedRoute/
│   │   │   ├── LoginForm/
│   │   │   └── RegisterForm/
│   │   │
│   │   ├── pages/
│   │   │   ├── Home.tsx
│   │   │   ├── Login.tsx
│   │   │   ├── Register.tsx
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Profile.tsx
│   │   │   └── NotFound.tsx
│   │   │
│   │   ├── layouts/
│   │   │
│   │   ├── hooks/
│   │   │
│   │   ├── context/
│   │   │   └── AuthContext.tsx
│   │   │
│   │   ├── services/
│   │   │   └── auth.service.ts
│   │   │
│   │   ├── types/
│   │   │
│   │   ├── utils/
│   │   │
│   │   ├── App.tsx
│   │   └── main.tsx
│   │
│   ├── Dockerfile
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── .env.example
│   └── README.md
│
│
├── database/                        # Database management
│   │
│   ├── backup/
│   │   └── .gitkeep
│   │
│   ├── scripts/
│   │   ├── backup.sh
│   │   └── restore.sh
│   │
│   └── README.md
│
│
├── nginx/                           # Reverse proxy configuration
│   │
│   ├── frontend.conf
│   ├── backend.conf
│   ├── security-headers.conf
│   └── README.md
│
│
├── deployment/                      # Application deployment only
│   │
│   ├── systemd/
│   │   └── backend.service
│   │
│   ├── scripts/
│   │   ├── install.sh
│   │   ├── deploy.sh
│   │   ├── start.sh
│   │   ├── stop.sh
│   │   └── health-check.sh
│   │
│   └── README.md
│
│
├── security/
│   │
│   ├── threat-model.md
│   ├── security-checklist.md
│   ├── vulnerability-management.md
│   └── incident-response.md
│
│
├── docs/
│   │
│   ├── 01-Architecture.md
│   ├── 02-Development-Workflow.md
│   ├── 03-Database-Design.md
│   ├── 04-Backend-Architecture.md
│   ├── 05-Authentication.md
│   ├── 06-Deployment.md
│   ├── 07-Security.md
│   ├── 08-Threat-Model.md
│   ├── 09-Test-Plan.md
│   ├── 10-Future-Improvements.md
│   └── images/
│
│
├── .github/
│   │
│   └── workflows/
│       ├── backend-ci.yml
│       ├── frontend-ci.yml
│       └── security-scan.yml
│
│
├── docker-compose.yml               # Local development stack
├── .gitignore
├── LICENSE
└── README.md
```