# Gap Analysis – Jira-Style Breakdown

## Epic: Module Coverage Expansion
1. **Story:** Design multi-module roadmap
   - Tasks: gather user requirements per module; prioritize MVP scope; produce Figma navigation map.
2. **Story:** Implement Expenses module
   - Tasks: define Prisma models, build server actions, create expense list/detail UI, add receipt upload + OCR integration, write tests.
3. **Story:** Implement Banking/Reconciliation module
   - Tasks: build bank statement importer, reconciliation wizard, unmatched transaction queue, export to GL.
4. **Story:** Implement Bookkeeping & VAT reporting
   - Tasks: create ledger entries, journal posting UI, VAT report generator, export (XML/SAF-T).
5. **Story:** Implement Payroll module
   - Tasks: define employee schema, payroll runs, JOPPD export, payslip generation.

## Epic: Compliance & Fiscalization
1. **Story:** Production provider integrations
   - Tasks: integrate Fina API, integrate IE-Računi API, add provider selection UI, schedule status polling jobs, error handling.
2. **Story:** Secure provider credentials
   - Tasks: introduce KMS/libsodium helper, migrate existing keys, rotate secrets, update settings UI to display masked state only.
3. **Story:** Invoice numbering enforcement
   - Tasks: add unique constraints, implement numbering sequences per tenant/year, unit tests, validation messages.
4. **Story:** Audit log system
   - Tasks: design audit log schema, implement logging middleware, build admin UI/export for logs.
5. **Story:** Tax rule automation
   - Tasks: maintain tax config file, add regression tests for VAT scenarios, documentation for compliance updates.

## Epic: Workflow Automation & Collaboration
1. **Story:** Notification & reminder system
   - Tasks: choose delivery channels (email/push/in-app), build notification service, implement templates, preferences UI.
2. **Story:** Approval workflows
   - Tasks: design approval states, add roles/permissions checks, UI for approving/rejecting invoices.
3. **Story:** Document management & OCR
   - Tasks: integrate storage provider, allow file uploads per entity, hook OCR pipeline, display parsed data.
4. **Story:** Comments & activity feed
   - Tasks: activity schema, comment UI, mention/notification support, audit integration.

## Epic: Reporting & Analytics
1. **Story:** Dashboard KPI widgets
   - Tasks: define metrics (revenue, overdue, VAT), backend aggregation, chart components, caching strategy.
2. **Story:** Custom report builder
   - Tasks: report schema, filter controls, export to PDF/XLS, schedule email delivery.
3. **Story:** Receivables/payables aging reports
   - Tasks: query logic, table views, drill-down links, reminder hooks.

## Epic: Integrations & Ecosystem
1. **Story:** Open Banking integration
   - Tasks: PSD2 provider selection (e.g., ASEE), OAuth flow, statement ingestion, refresh jobs.
2. **Story:** Payments integration
   - Tasks: support online payment links, reconcile payments automatically, update invoice status.
3. **Story:** Public API & webhooks
   - Tasks: define OAuth2 scopes, implement REST/GraphQL endpoints, webhook delivery system, developer docs/portal.
4. **Story:** Import/export connectors
   - Tasks: build CSV/XML importers for contacts/products/invoices, export to Synesis/SAOP formats, mapping UI.

## Epic: Reliability & Support
1. **Story:** CI/CD pipeline
   - Tasks: create GitHub Actions workflow, add tests/linting, configure deployment gates.
2. **Story:** Observability stack
   - Tasks: set up structured logging (Pino), integrate monitoring (Prometheus/Grafana or hosted), create alerting rules, health endpoints.
3. **Story:** Backup & DR
   - Tasks: automate DB backups, test restoration, document RTO/RPO, schedule drills.
4. **Story:** Support operations
   - Tasks: choose ticketing system, build in-app support widget/FAQ, define SLAs and escalation policy.

## Epic: Accessibility & Localization
1. **Story:** WCAG remediation
   - Tasks: audit forms/tables/components, fix semantics, add focus management, run automated tests.
2. **Story:** Multilingual support
   - Tasks: integrate i18n library, translate UI to Croatian/English, localize currency/date formats.
3. **Story:** Accessibility regression testing
   - Tasks: add axe tests to CI, manual screen-reader QA checklist, documentation.

## Epic: Mobile & Offline Experience
1. **Story:** Responsive redesign
   - Tasks: update layout components for mobile, add collapsible navigation, test across breakpoints.
2. **Story:** Mobile expense capture
   - Tasks: build PWA or React Native view for photo capture, offline draft storage, sync mechanism.
3. **Story:** Push notifications
   - Tasks: integrate web/mobile push service, user opt-in flow, link to notification system.

## Epic: Data Governance & Privacy
1. **Story:** GDPR tooling
   - Tasks: implement data export/delete UI, audit logging for privacy actions, consent tracking.
2. **Story:** Security assessments
   - Tasks: schedule external pentests, remediate findings, document security policies.
3. **Story:** Data retention policies
   - Tasks: define retention schedule per entity, implement purge jobs, customer communication.
