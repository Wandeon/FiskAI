# FiskAI System Documentation

## Overview
FiskAI is a Croatian AI-first accounting and invoicing SaaS platform designed for Croatian companies, from paušalni obrt to d.o.o. Built with AI at its core for intelligent automation of accounting tasks.

## System Architecture

### Environments
- **DEV**: Running on port 3001 (HMR enabled for development)
- **STAGING**: Running on port 3002 (auto-deploys from GitHub pushes to main)
- **PRODUCTION**: Running on port 443 (HTTPS) via https://erp.metrica.hr (manual deployment via Coolify dashboard)

### Infrastructure
- **Server**: VPS-01 (ARM64)
- **Deployment Platform**: Coolify (dashboard at https://git.metrica.hr)
- **Database**: PostgreSQL 16 (fiskai-db container)
- **Application**: Next.js 15 application in Docker container (fiskai-app)

### Application Container Info
- **Container ID**: bsswgo8ggwgkw8c88wo8wcw8-215458880769
- **Application UUID**: bsswgo8ggwgkw8c88wo8wcw8
- **Repository**: git@github.com:Wandeon/FiskAI.git
- **Branch**: main
- **Ports**: 3002:3000 (external:internal)

## Coolify Configuration

### Dashboard Access
- **URL**: https://git.metrica.hr
- **Login**: admin@example.com / SecurePass!123

### API Access
- **Token**: iShdYJGG805AZ5SprLIC1A1ycTUxES1UcZZkSnyd43c986f3
- **Base URL**: http://localhost:8000/api/v1/
- **Deployment Endpoint**: POST /api/v1/applications/{APP_UUID}/restart (triggers rebuild from main branch)

### Docker Containers
- **coolify**: Main Coolify service on port 8000
- **coolify-db**: PostgreSQL for Coolify itself
- **coolify-redis**: Redis for Coolify
- **coolify-realtime**: Soketi for Coolify real-time features
- **coolify-sentinel**: Monitoring for Coolify
- **fiskai-db**: PostgreSQL for FiskAI application
- **fiskai-app**: The main FiskAI application (container ID: bsswgo8ggwgkw8c88wo8wcw8-215458880769)

## Development Workflow

### Git Branches
- **main**: Production code (triggers staging auto-deploy)
- **feature branches**: Development work

### Code Flow
1. Local development on DEV (port 3001)
2. Commit & push to GitHub
3. Auto-deploy to STAGING (http://erp.metrica.hr:3002) 
4. Manual deploy to PRODUCTION via Coolify dashboard/api

## Key Features & Modules

### Core Modules
1. E-Invoicing + Fiskalizacija 2.0
2. Invoicing 
3. Expenses & Receipt Scanning
4. Banking Integration
5. Bookkeeping
6. VAT/PDV Reporting
7. Payroll
8. Reporting & Analytics
9. Assets Management

### Security & Compliance
- **Multi-tenancy**: Complete data isolation via Prisma extensions
- **Rate Limiting**: Login and password reset protection
- **Legal Pages**: Privacy Policy, Terms, DPA, Cookie Policy, AI Data Policy
- **Croatian Compliance**: Fiskalizacija 2.0, OIB validation, UBL/EN 16931 compliance
- **Data Export**: GDPR-compliant data portability (11-year archiving)

### API Endpoints Added
- `/api/exports/company` - GDPR data export
- `/api/health?detailed=true` - Detailed system health
- `/api/e-invoices/receive` - Receive external e-invoices
- `/api/e-invoices/inbox` - Inbox management (accept/reject)
- `/api/compliance/en16931` - EN 16931 validation
- `/api/sandbox/e-invoice` - E-invoicing testing
- `/api/admin/support/dashboard` - Support operations

## Deployment Commands

### Trigger Production Deployment
```bash
curl -X POST \
  http://localhost:8000/api/v1/applications/bsswgo8ggwgkw8c88wo8wcw8/restart \
  -H 'Authorization: Bearer iShdYJGG805AZ5SprLIC1A1ycTUxES1UcZZkSnyd43c986f3' \
  -H 'Content-Type: application/json' \
  -d '{}'
```

### Check Deployment Status
```bash
curl -s -H 'Authorization: Bearer iShdYJGG805AZ5SprLIC1A1ycTUxES1UcZZkSnyd43c986f3' \
  http://localhost:8000/api/v1/deployments/{DEPLOYMENT_UUID}
```

## P0 Launch Blockers Resolved

### 1. Reliability, Backups, and Observability (Issue #20)
- ✅ Data export/backup system with GDPR compliance
- ✅ System health monitoring with detailed checks
- ✅ Status page with metrics and health information
- ✅ Enhanced health check endpoint

### 2. Support, Success, and Operations (Issue #21)
- ✅ Comprehensive support ticket actions with validation
- ✅ Admin support dashboard API with metrics
- ✅ Support operations features with proper logging

### 3. E-Invoicing + Fiskalizacija 2.0 Readiness (Issue #17)
- ✅ E-invoice receiving endpoint for external systems
- ✅ Inbox management with acceptance/rejection workflows
- ✅ Archive management system for 11-year compliance
- ✅ EN 16931 compliance validation
- ✅ Sandbox testing environment for e-invoicing

### 4. Security & Multi-Tenancy
- ✅ Enhanced tenant isolation for all relevant models
- ✅ Added security hardening with rate limiting
- ✅ Created legal pages (DPA, Cookie Policy, AI Data Policy)
- ✅ Improved monitoring and observability features

## Monitoring & Status
- **Status Page**: http://erp.metrica.hr/status
- **Health Check**: http://erp.metrica.hr/api/health
- **Detailed Health**: http://erp.metrica.hr/api/health?detailed=true
- **Admin Dashboard**: https://git.metrica.hr

## Troubleshooting

### Common Issues
- If production isn't updating, ensure GitHub changes are on the `main` branch
- If API calls fail, check token validity and endpoint format
- Docker containers can be viewed with `docker ps | grep -i fiskai`

### Maintenance
- Database migrations should be run via Coolify console after first deployment
- Backups are managed by Coolify's built-in PostgreSQL management
- Monitor logs via Coolify dashboard for issues

## Quick Reference

| Need | Command/URL |
|------|-------------|
| Dev Server | http://100.64.123.81:3001 |
| Staging | http://erp.metrica.hr:3002 |
| Production | https://erp.metrica.hr |
| Coolify Dashboard | https://git.metrica.hr |
| Coolify Login | admin@example.com / SecurePass!123 |
| API Token | iShdYJGG805AZ5SprLIC1A1ycTUxES1UcZZkSnyd43c986f3 |
| App UUID | bsswgo8ggwgkw8c88wo8wcw8 |
| Status Page | http://erp.metrica.hr/status |
| Health Check | http://erp.metrica.hr/api/health |