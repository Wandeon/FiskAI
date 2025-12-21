# FiskAI System Architecture & Product Logic (The Bible)

## Document Control

| Field       | Details                                                        |
| :---------- | :------------------------------------------------------------- |
| **Version** | 3.1.0                                                          |
| **Date**    | 2025-12-19                                                     |
| **Status**  | Canonical Draft - **Production-Ready**                         |
| **Author**  | Gemini Agent (Lead Architect)                                  |
| **Scope**   | Complete System Vision: Gating, Compliance, AI, and Operations |

---

## 0. Vision & Non-Negotiables

FiskAI is not a dashboard; it is a **Financial Cockpit**. It must provide the user with high-density utility while maintaining extreme visual simplicity through **Progressive Disclosure**.

**Non-negotiables:**

- **Zero Data Leakage**: Multi-tenancy is enforced at the DB-Extension level (Prisma).
- **Regulatory First**: Croatian legal requirements (Fiskalizacija 2.0, 11-year Archive) are hardcoded, not optional.
- **Experience-Clean**: No user should ever see an empty state that doesn't have a clear "Step 1" call to action.
- **One Truth**: One module registry, one key system, one source of truth.

---

## 1. Structural Definitions (The Law of the Land)

- **System Role**: Defines the **Portal** (`USER` -> /app, `STAFF` -> /staff, `ADMIN` -> /admin).
- **Tenant Role**: Defines **Permission** within a company (`OWNER`, `ACCOUNTANT`, etc.).
- **Module Key**: kebab-case strings (e.g., `e-invoicing`).
- **Compliance Layer**: Auto-enabled by `legalForm`.
- **Value Layer**: Purchased via `entitlements`.

---

## 2. The Product Hierarchy Matrix

### 2.1 Universal Floor (The Base MVP)

_Free or included in all plans. Mandatory for operational existence._

| Feature                | Technical Purpose                        | Business Value         |
| :--------------------- | :--------------------------------------- | :--------------------- |
| **Standard Invoicing** | Manual PDF Generation (Transakcijski).   | Foundation of trade.   |
| **Expense Vault**      | Document storage + Basic categorization. | Bookkeeping readiness. |
| **Directory**          | Customer/Supplier CRM + OIB validation.  | Data accuracy.         |
| **Archive**            | Encrypted, 11-year timestamped storage.  | Legal GDPR compliance. |
| **Core Deadlines**     | Basic Tax Calendar.                      | Penalty avoidance.     |

### 2.2 Compliance Layer (Persona-Based)

_Mandatory features based on legal form. Not toggleable._

| Persona           | Mandatory Logic                               | UI Trigger               |
| :---------------- | :-------------------------------------------- | :----------------------- |
| **Paušalni Obrt** | 40k Limit Monitoring, PO-SD Export.           | `legalForm: OBRT_PAUSAL` |
| **Obrt (Realni)** | KPR Log, Individual Contribution Tracking.    | `legalForm: OBRT_REAL`   |
| **D.O.O. / JDOO** | **Asset Registry (Dugotrajna Imovina)**, P&L. | `legalForm: DOO/JDOO`    |
| **VAT Payer**     | PDV/PDV-S Monitoring, URA/IRA logs.           | `isVatPayer: true`       |

### 2.3 Value Layer (Revenue Modules)

_Purchasable add-ons that automate the foundation._

| Module Key      | Automation Value           | Technical Requirement           |
| :-------------- | :------------------------- | :------------------------------ |
| `e-invoicing`   | XML automation (B2B/B2G).  | FINA / Intermediary API.        |
| `fiscalization` | Cash/Card legal bridge.    | FINA Certificate (P12).         |
| `banking`       | PSD2 Real-time Sync.       | Bank API (Saltedge/Gocardless). |
| `ai-assistant`  | Natural Language Advisory. | LLM (Ollama/DeepSeek).          |
| `pos`           | Retail Point of Sale.      | Stripe Terminal / Hardware.     |

---

## 3. Technical Enforcement Matrix

_How the vision is forced into the code._

| Gate Level           | Mechanism                       | Primary File                  |
| :------------------- | :------------------------------ | :---------------------------- |
| **Multi-Tenancy**    | Prisma Query Extensions         | `src/lib/db.ts`               |
| **Portal Access**    | Next.js Middleware (Subdomains) | `src/middleware.ts`           |
| **Feature Gating**   | `Company.entitlements` Array    | `src/lib/modules/access.ts`   |
| **UI Visibility**    | `<Visible id="...">` Component  | `src/lib/visibility/rules.ts` |
| **Role Permissions** | RBAC Policy Engine              | `src/lib/rbac.ts`             |

---

## 4. AI Strategy: Intelligence over Interaction

The AI is not just a chatbot; it is a **Proactive Agent**.

| Agent Role        | Context Used                        | Action                                                   |
| :---------------- | :---------------------------------- | :------------------------------------------------------- |
| **The Watchdog**  | Invoices vs. 40k Limit.             | "Upozorenje: Na 90% ste limita za paušalni obrt."        |
| **The Clerk**     | Expense Receipt Image.              | Automatically extracts Date, Amount, OIB, and Category.  |
| **The Librarian** | Knowledge Hub (MDX Guides).         | Answers: "Kako se amortizira laptop u d.o.o.?"           |
| **The Matcher**   | Bank Statement vs. Unpaid Invoices. | Suggests: "Ova uplata od 100€ odgovara računu #2025-01." |

---

## 5. Integration Ecosystem (Connectors)

FiskAI acts as a bridge between the business and these external "Black Boxes":

- **FINA**: For E-Invoicing and Fiscalization tokens.
- **Tax Authority (Porezna)**: For OIB validation and form submissions.
- **Banks (PSD2)**: For transaction importing (Gocardless/SaltEdge).
- **Stripe**: For card processing and Terminal connectivity.
- **Resend**: For transactional email delivery tracking and status.

---

## 6. Dashboard Evolution (Progressive Disclosure)

### Stage 0: The Wizard (Blocker)

- **State**: `hasCompletedOnboarding: false`
- **UI**: Full-screen stepper. No access to dashboard.

### Stage 1: The Setup (Guided)

- **Trigger**: Profile Complete + 0 Invoices.
- **Dashboard**: "Welcome" Hero + Progress Pill + Setup Checklist.
- **UX**: All empty charts are replaced with "Tutorial Cards."

### Stage 2: The Cockpit (Operational)

- **Trigger**: 1+ Invoice or Bank Import.
- **Dashboard**: "Today's Actions," "Revenue Trends," "Recent Activity."
- **UX**: Setup checklist moves to a "Settings" or "Sidebar" minified view.

### Stage 3: The Command Center (Mature)

- **Trigger**: 10+ Invoices or VAT Status.
- **Dashboard**: AI Contextual Insights, VAT Overview, Advanced Reporting.

---

## 7. Data Lifecycle & Regulatory Compliance

### 7.1 Archiving Policy (11 Years)

- **Storage**: Encrypted blob storage (Cloudflare R2/S3).
- **Integrity**: Every document is hashed and timestamped upon entry.
- **GDPR**: Built-in "Right to be Forgotten" while maintaining legal tax record-keeping overlaps.

### 7.2 Fiscalization 2.0 Readiness

- **QR Codes**: Automated for all non-transfer invoices.
- **Direct Reporting**: Automatic reporting of POS transactions to CIS (Centralni informacijski sustav).

---

## 8. Monetization Mapping (Stripe Integration)

- **Free Tier**: Universal Floor (Manual Invoicing).
- **Paušalni Plan**: Base + Paušalni Compliance.
- **Pro Plan**: Base + D.O.O. Compliance + E-Invoicing.
- **Enterprise**: Custom Entitlements + Staff Assignments.

---

## 9. Immediate Roadmap & Implementation Gaps

- [ ] **Asset Registry Module**: **Critical P0**. Need a table for `DugotrajnaImovina` with depreciation logic.
- [ ] **Notification Center (Bell)**: Move "Reminders" from dashboard cards to a global header icon.
- [ ] **In-App Accountant Review**: A "Verify" button for accountants to mark a document as "Booked."

---

## 10. Audit Log

| Date       | Auditor       | Notes                                             |
| :--------- | :------------ | :------------------------------------------------ |
| 2025-12-19 | Gemini Agent  | Initial draft                                     |
| 2025-12-19 | Codex         | V2 Rewrite (Canonical)                            |
| 2025-12-19 | Gemini (Lead) | V3.1 Expansion (Regulatory Roadmap & Tech Matrix) |
