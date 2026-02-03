# FiskAI-App Architecture

System architecture for Croatian e-invoicing application.

---

## Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                          FiskAI-App                                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐          │
│  │   apps/web   │    │ packages/db  │    │packages/trpc │          │
│  │   Next.js    │───▶│   Prisma     │◀───│   tRPC       │          │
│  │   Frontend   │    │   Client     │    │   Routers    │          │
│  └──────────────┘    └──────────────┘    └──────────────┘          │
│         │                   │                   │                   │
│         │                   │                   │                   │
│         ▼                   ▼                   ▼                   │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐          │
│  │packages/ui   │    │   PostgreSQL │    │packages/shared│         │
│  │   shadcn     │    │   Database   │    │   Zod schemas │         │
│  │   Components │    │              │    │   Utilities   │         │
│  └──────────────┘    └──────────────┘    └──────────────┘          │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Package Dependencies

```
@fiskai/web
├── @fiskai/db       (database client)
├── @fiskai/shared   (schemas, utilities)
├── @fiskai/trpc     (API routers)
└── @fiskai/ui       (UI components)

@fiskai/trpc
├── @fiskai/db       (database client)
└── @fiskai/shared   (schemas)

@fiskai/ui
└── (no internal deps)

@fiskai/shared
└── (no internal deps)

@fiskai/db
└── (no internal deps)
```

---

## Data Flow

### Invoice Creation

```
1. User fills invoice form (apps/web)
2. Form validates with Zod schema (packages/shared)
3. tRPC mutation called (packages/trpc)
4. Invoice number generated from sequence
5. Data saved to PostgreSQL (packages/db)
6. Response returned to client
```

### E-Invoice Send (Phase 2)

```
1. User clicks "Send to e-poslovanje"
2. tRPC mutation called
3. Invoice converted to e-invoice XML format
4. XML sent to e-poslovanje API
5. Status updated (SENT)
6. Polling for delivery confirmation
7. Status updated (DELIVERED/ACCEPTED/REJECTED)
```

---

## Database Schema

### Core Entities

```
User ─────┐
          │
          ▼
    CompanyMember
          │
          ▼
Company ──┬── BusinessPremises ── PaymentDevice
          │
          ├── Contact
          │
          └── Invoice ── InvoiceLine
```

### Croatian Invoicing Requirements

```
Invoice Number Format: broj-poslovni_prostor-naplatni_uredaj
Example: 1-1-1 (invoice #1, premises "1", device "1")

Sequence tracking per:
- Company
- Business Premises
- Payment Device
- Year
```

---

## Authentication (Phase 0.2)

```
NextAuth v5
├── Email/Password provider
├── Session stored in database
├── JWT for API calls
└── Protected routes middleware
```

---

## Deployment Architecture

### Production (VPS-01)

```
┌─────────────────────────────────────────────┐
│                  VPS-01                     │
│              (152.53.146.3)                 │
├─────────────────────────────────────────────┤
│                                             │
│  ┌─────────────┐    ┌─────────────┐        │
│  │   Coolify   │    │  PostgreSQL │        │
│  │   (Deploy)  │    │   :5434     │        │
│  └─────────────┘    └─────────────┘        │
│         │                   ▲               │
│         ▼                   │               │
│  ┌─────────────┐            │               │
│  │  FiskAI-App │────────────┘               │
│  │   :3000     │                            │
│  └─────────────┘                            │
│         │                                   │
│         ▼                                   │
│  ┌─────────────┐                            │
│  │ Cloudflare  │ ─── app.fiskai.hr          │
│  │   Proxy     │                            │
│  └─────────────┘                            │
│                                             │
└─────────────────────────────────────────────┘
```

### Network

- Tailscale VPN for internal communication
- Cloudflare for public traffic
- SSL via Cloudflare

---

## External Integrations (Phase 2+)

### E-Poslovanje

```
┌─────────────┐         ┌─────────────────────┐
│  FiskAI-App │  HTTPS  │   e-poslovanje.hr   │
│             │────────▶│   REST API          │
│             │◀────────│                     │
└─────────────┘         └─────────────────────┘

Operations:
- Send e-invoice
- Poll for status
- Receive inbound invoices (future)
```

---

## Security Considerations

### Data Protection
- All secrets in environment variables
- Database credentials never in code
- API keys stored securely

### Input Validation
- Zod schemas at all boundaries
- OIB checksum validation
- Amount validation (no negative invoices)

### Authentication
- Session-based auth (NextAuth)
- CSRF protection
- Secure cookie settings

---

## Performance Targets

| Metric | Target |
|--------|--------|
| Page Load (LCP) | < 2.5s |
| First Input Delay | < 100ms |
| API Response | < 500ms |
| Database Query | < 100ms |
