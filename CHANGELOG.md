# Changelog

All notable changes to FiskAI-App will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Initial Turborepo scaffolding with monorepo structure
- Next.js 15 web app with Turbopack
- Prisma database package with Croatian e-invoicing schema
- tRPC package with company and invoice routers
- Shared package with Zod schemas and Croatian utilities
- UI package with shadcn/ui components (Button, Card, Input)
- Tailwind CSS v4 configuration
- Project documentation (CLAUDE.md, README.md, DECISIONS.md, ROADMAP.md)

### Technical Decisions
- Fresh start from accumulated technical debt
- Turborepo for monorepo management
- pnpm for package management
- Strict TypeScript configuration
- Croatian e-invoicing format (broj-prostor-uredaj)

---

## Version History

| Version | Date | Description |
|---------|------|-------------|
| 0.1.0 | 2026-02-03 | Fresh start - Turborepo scaffolding |
