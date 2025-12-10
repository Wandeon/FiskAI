# Market Gap Analysis

Detailed gaps between FiskAI (post-remediation) and mature Croatian accounting/e-invoicing suites, plus actionable implementation suggestions for each area.

## 1. Module Coverage & Functional Depth
**Gap:** Current product only supports auth, company onboarding, contacts, and outbound e-invoices. Professional suites offer full order-to-cash, procure-to-pay, bookkeeping, payroll, fixed assets, and reporting modules.
**Implementation:**
- Define an incremental roadmap (e.g., invoices → expenses → banking → bookkeeping → payroll) with user stories and compliance requirements per module.
- Stand up dedicated Prisma models/APIs for expenses, bank statements, ledger, VAT reports, and payroll; enforce tenant scoping from day one.
- Build UI flows per module (e.g., expense capture with receipt upload + OCR, bank reconciliation wizard) and reuse shared components for lists, filters, bulk actions.
- Provide export/import tooling (Excel, XML, SAF-T) so customers can migrate data and integrate with accountants’ systems.

## 2. Compliance & Fiscalization Readiness
**Gap:** Provider integrations are mocked; invoice numbering/tax rules aren’t enforced; keys are stored plaintext; there’s no audit log.
**Implementation:**
- Implement production-grade e-invoice providers (Fina, IE-Računi) with secure key storage (KMS/libsodium) and scheduled status polling.
- Add automated numbering sequences per legal requirements (prefix/year reset, uniqueness validations, blocking duplicates).
- Build audit logging (who did what, when, before/after values) stored in append-only tables and exposed via UI/export.
- Maintain a regulatory change calendar; add unit tests and fixtures for new VAT rules and Fiskalizacija schema versions.

## 3. Workflow Automation & Collaboration
**Gap:** No approvals, reminders, document management, or team collaboration features; users must track everything manually.
**Implementation:**
- Introduce task/notification system: due-date reminders, invoice approval steps, push/email alerts.
- Enable document uploads + OCR for expenses/invoices; integrate with AI classification services to auto-fill fields.
- Add comments/activity feed on entities (invoice, contact) so accountants and clients can collaborate.
- Provide role-based permissions (owner/admin/accountant/viewer) and per-module access controls; extend `Role` enum + UI accordingly.

## 4. Reporting & Analytics
**Gap:** Dashboard only shows record counts; no financial KPIs, VAT summaries, or customizable reports.
**Implementation:**
- Build reporting backend aggregating revenue, expenses, VAT owed, receivables aging, cash flow projections.
- Offer configurable dashboards with charts, filters, and export options (PDF/XLS).
- Add scheduled report emails and shared links for accountants.

## 5. Integrations & Ecosystem
**Gap:** App runs standalone without bank feeds, payment gateways, CRM/ERP connectors, or public API/webhooks.
**Implementation:**
- Integrate with Croatian banks via PSD2/open banking APIs for statement import and reconciliation.
- Support payment providers (WS Pay, Stripe) to accept online invoice payments and auto-match receipts.
- Build REST/GraphQL API with OAuth2 keys plus webhooks for invoice/contact events so partners can extend FiskAI.
- Provide importers/exporters for popular tools (e.g., Synesis, ePorezna formats).

## 6. Reliability, Monitoring & Support
**Gap:** No CI/CD, no observability, no structured support processes or SLAs; limited deployment tooling.
**Implementation:**
- Implement full CI/CD with automated tests, static analysis, security scans, and deploy gates.
- Add monitoring (OpenTelemetry, Prometheus/Grafana or hosted provider), centralized logging, uptime alerts, and on-call playbooks.
- Set up automated backups, DR testing, and documented RTO/RPO targets.
- Establish customer support workflows (ticketing, in-app help center, onboarding resources) and measure satisfaction (NPS/CSAT).

## 7. Accessibility & Localization Depth
**Gap:** UI is partially localized, lacks accessibility features, and has no multilingual strategy.
**Implementation:**
- Adopt an i18n framework (next-intl) with Croatian + English translations, currency/date localization, and accessible copy review.
- Conduct WCAG AA audit using automated + manual testing; fix semantic issues (labels, focus order, contrast) and add accessible components (modals, toasts, tables).
- Provide localization hooks for country-specific fields (bank formats, tax labels) to scale beyond Croatia later.

## 8. Mobile & Offline Experience
**Gap:** UI is desktop-focused; no responsive patterns or native mobile support, while pro apps offer mobile invoicing, expense capture, and push notifications.
**Implementation:**
- Redesign layouts with mobile-first responsive components (collapsible nav, FABs, stacked tables).
- Consider building a lightweight React Native/PWA client for scan-and-send workflows (capture receipt photo → OCR → sync when online).
- Implement offline drafts with local storage + sync queues for field accountants.

## 9. Data Governance & Privacy
**Gap:** No documented GDPR processes, data retention policies, or customer data export/delete tooling.
**Implementation:**
- Document data processing activities, create DPA templates, and implement user-facing data export/delete features.
- Add consent tracking (marketing vs operational) and audit trails for privacy actions.
- Conduct regular penetration tests and maintain ISO-like security policies as the product scales.

Each gap area can be turned into an epic with sub-tasks pulled from the implementation bullet points, enabling the team to prioritize based on customer demand and compliance deadlines.
