# FiskAI-App

Croatian e-invoicing made simple.

## Overview

FiskAI-App is a modern Croatian e-invoicing application built with:
- Next.js 15 (App Router + Turbopack)
- TypeScript (strict mode)
- PostgreSQL + Prisma
- tRPC for type-safe APIs
- Tailwind CSS v4 + shadcn/ui

## Getting Started

### Prerequisites
- Node.js 20+
- pnpm 9.15+
- PostgreSQL 16+

### Installation

```bash
# Clone the repository
git clone https://github.com/wandeon/FiskAI-App.git
cd FiskAI-App

# Install dependencies
pnpm install

# Copy environment files
cp .env.example .env
cp apps/web/.env.example apps/web/.env.local

# Generate Prisma client
pnpm db:generate

# Run migrations
pnpm db:migrate

# Start development server
pnpm dev
```

### Development

```bash
pnpm dev        # Start all dev servers
pnpm build      # Build all packages
pnpm typecheck  # Type check
pnpm lint       # Lint
pnpm test       # Run tests
```

## Project Structure

```
apps/
  web/          # Next.js frontend

packages/
  db/           # Prisma schema + client
  shared/       # Zod schemas, constants
  trpc/         # tRPC routers
  ui/           # shadcn/ui components

docs/
  DECISIONS.md  # Architectural decisions
  ROADMAP.md    # Development roadmap
```

## Documentation

- [CLAUDE.md](./CLAUDE.md) - AI assistant instructions
- [docs/DECISIONS.md](./docs/DECISIONS.md) - Architectural decisions
- [docs/ROADMAP.md](./docs/ROADMAP.md) - Development phases and sprints
- [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) - System architecture

## License

Private - All rights reserved
