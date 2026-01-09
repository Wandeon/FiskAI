# FiskAI

Croatian AI-first accounting and invoicing SaaS platform.

## Overview

FiskAI is a cloud-based, modular accounting solution designed for Croatian companies, from paušalni obrt to d.o.o. Built with AI at its core for intelligent automation of accounting tasks.

### Key Capabilities

- **E-Invoicing & Fiscalization** - Fiskalizacija 2.0, e-Račun, UBL/EN 16931 compliance
- **Regulatory Truth Layer** - Automated regulatory content processing with evidence-backed claims
- **Multi-Tenant Architecture** - Single database with company-level isolation
- **AI-Powered Automation** - OCR, categorization, anomaly detection

### Trust Guarantees

1. **Evidence-Backed** - Every regulatory claim links to source evidence
2. **No Hallucination** - LLM outputs verified against sources
3. **Fail-Closed** - Ambiguous content requires human review
4. **Immutable History** - Source evidence never modified after capture

## Quick Links

| Resource                                         | Purpose                        |
| ------------------------------------------------ | ------------------------------ |
| [CLAUDE.md](./CLAUDE.md)                         | AI context and quick reference |
| [docs/](./docs/)                                 | Full documentation             |
| [docs/PRODUCT_BIBLE.md](./docs/PRODUCT_BIBLE.md) | Product specifications         |

## Documentation

### Architecture

- [System Overview](docs/01_ARCHITECTURE/overview.md) - High-level architecture
- [Two-Layer Model](docs/01_ARCHITECTURE/two-layer-model.md) - Discovery + processing layers
- [Trust Guarantees](docs/01_ARCHITECTURE/trust-guarantees.md) - Evidence and verification

### Features

- [Feature Registry](docs/02_FEATURES/FEATURE_REGISTRY.md) - All product features
- [Module Matrix](docs/COMPLETE_MODULE_MATRIX.md) - Module capabilities

### Regulatory Truth

- [Overview](docs/05_REGULATORY/OVERVIEW.md) - Regulatory processing system
- [Pipeline](docs/05_REGULATORY/PIPELINE.md) - Processing stages

### Operations

- [Operations Runbook](docs/04_OPERATIONS/OPERATIONS_RUNBOOK.md) - Operational procedures
- [Deployment](docs/DEPLOYMENT.md) - Deployment guide

### Research

- [Fiskalizacija 2.0](docs/research/fiskalizacija-2.md) - Croatian fiscalization
- [E-Invoice Providers](docs/research/e-invoice-providers.md) - Provider analysis

## Browser Support

The application supports the following browsers:

| Browser | Minimum Version |
| ------- | --------------- |
| Chrome  | Last 2 versions |
| Firefox | Last 2 versions |
| Safari  | Last 2 versions |
| Edge    | Last 2 versions |

We target browsers with >0.5% global usage, excluding Opera Mini and discontinued browsers. See `browserslist` in `package.json` for the exact configuration.

## Tech Stack

| Layer    | Technology                    |
| -------- | ----------------------------- |
| Frontend | Next.js 15, React, TypeScript |
| Database | PostgreSQL 16, Prisma 7       |
| Auth     | NextAuth v5 (Auth.js)         |
| Queue    | BullMQ + Redis                |
| AI/LLM   | Ollama, OpenRouter            |
| Deploy   | Coolify on Hetzner ARM64      |

## Portals

| Portal       | URL                   | Audience       |
| ------------ | --------------------- | -------------- |
| Marketing    | fiskai.hr             | Public         |
| Client App   | app.fiskai.hr         | Clients        |
| Staff Portal | app.fiskai.hr/staff   | Accountants    |
| Admin Portal | app.fiskai.hr/admin   | Platform owner |

## Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

## License

Proprietary - All rights reserved
