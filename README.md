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


secure-login/
│
├── backend/                         # NestJS application
│   │
│   ├── src/
│   │   │
│   │   ├── auth/                    # Authentication module
│   │   │   ├── dto/
│   │   │   ├── guards/
│   │   │   ├── strategies/
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── auth.module.ts
│   │   │   └── jwt.strategy.ts
│   │   │
│   │   ├── users/                   # User management
│   │   │   ├── dto/
│   │   │   ├── entities/
│   │   │   ├── users.controller.ts
│   │   │   ├── users.service.ts
│   │   │   └── users.module.ts
│   │   │
│   │   ├── health/                  # Health check endpoint
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
│   │   └── schema.prisma
│   │
│   ├── test/
│   │
│   ├── package.json
│   ├── tsconfig.json
│   ├── nest-cli.json
│   ├── .env.example
│   └── README.md
│
├── frontend/
│   │
│   ├── public/
│   │   ├── favicon.ico
│   │   └── logo.png
│   │
│   ├── css/
│   │
│   ├── js/
│   │   ├── api.js
│   │   ├── auth.js
│   │   └── dashboard.js
│   │
│   ├── login.html
│   ├── register.html
│   ├── dashboard.html
│   ├── index.html
│   └── README.md
│
├── database/
│   │
│   ├── init.sql
│   ├── seed.sql
│   └── README.md
│
├── nginx/
│   │
│   ├── frontend.conf
│   ├── backend.conf
│   └── README.md
│
├── scripts/
│   │
│   ├── deploy.sh
│   ├── start.sh
│   ├── stop.sh
│   └── backup.sh
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
├── .gitignore
├── LICENSE
└── README.md