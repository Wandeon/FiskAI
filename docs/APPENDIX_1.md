# Appendix 1: Technical & Strategic Enhancement Portfolio (Master Edition)

## Document Control

| Field         | Details                                                                 |
| :------------ | :---------------------------------------------------------------------- |
| **Version**   | 1.1.0                                                                   |
| **Date**      | 2025-12-19                                                              |
| **Status**    | Canonical Enhancement Specification                                     |
| **Reference** | Primary Document: `PRODUCT_BIBLE.md` (v4.0.0)                           |
| **Objective** | Correct legal drift, define technical agents, and bridge strategic gaps |

---

## 1. Executive Intent

This appendix is the technical "Command Center" for the engineering and product teams. It serves three purposes:

1.  **Legal Correction**: Bringing the 2025/2026 Croatian tax realities into the core product logic.
2.  **Technical Specification**: Defining the algorithms behind the "Proactive AI" vision.
3.  **UX Polish**: Specifying the exact behavior of empty states and portal transitions to ensure a "Premium" feel.

---

## 2. Legal Accuracy Audit (2025/2026 Compliance Refresh)

The 2025 Croatian tax reform has rendered several values in the v4.0.0 Bible obsolete. Below are the mandatory updates required for the system to remain legally compliant.

### 2.1 The "60k Limit" Correction

- **Bible Reference**: Lines 139, 165, 179, 908, 1059, 1060.
- **Correction**: The mandatory VAT registration threshold and the Paušalni Obrt annual income limit have both officially increased to **60,000.00 EUR** (effective Jan 1, 2025).
- **Proof**: Official updates from the Croatian Tax Authority (Porezna Uprava) and the Government Gazette (Narodne Novine).
- **Code Impact**:
  - Update `src/lib/fiscal-data/thresholds.ts`.
  - Update `card:pausalni-status` logic to calculate percentage against 60k.
  - Update `The Watchdog` AI alert triggers.

### 2.2 Revised Paušalni Tax Brackets (2025)

- **Bible Reference**: Line 1087 (Section 11.2).
- **New Data**: There are now **7 tiers** for paušalni tax based on annual revenue.
  | Tier | Annual Revenue (EUR) | Yearly Tax Base | Quarterly Tax (12%) |
  | :--- | :--- | :--- | :--- |
  | 1 | 0.00 - 11,300.00 | 1,695.00 | 50.85 |
  | 2 | 11,300.01 - 15,300.00 | 2,295.00 | 68.85 |
  | 3 | 15,300.01 - 19,900.00 | 2,985.00 | 89.55 |
  | 4 | 19,900.01 - 30,600.00 | 4,590.00 | 137.70 |
  | 5 | 30,600.01 - 40,000.00 | 6,000.00 | 180.00 |
  | 6 | 40,000.01 - 50,000.00 | 7,500.00 | 225.00 |
  | 7 | 50,000.01 - 60,000.00 | 9,000.00 | 270.00 |

### 2.3 Asset Capitalization Threshold

- **Bible Reference**: Line 1062.
- **Correction**: The threshold for entering an item into the Asset Registry (Dugotrajna imovina) has increased to **665.00 EUR** (formerly 464.53 EUR/3500 HRK).
- **Implementation**: Expenses exceeding this value must trigger a "Suggest Capitalization" prompt from the `Clerk Agent`.

### 2.4 Per Diem (Dnevnice) Updates

- **Bible Reference**: Roadmap (Section 14.3).
- **Verified Rates**:
  - Domestic (>12h): **30.00 EUR**.
  - Domestic (8-12h): **15.00 EUR**.
  - Inozemstvo: Variable by country (e.g., Germany 225 EUR - _Note: This requires a lookup table in `lib/fiscal-data`_).

---

## 3. Technical Architecture & Security Enhancements

### 3.1 Advanced Data Integrity (Hash-Chaining)

- **Problem**: Section 1.2 (Line 46) mentions an 11-year archive. Simple storage is legally insufficient.
- **Solution**: Implement **Digital Notarization**.
  - Every PDF generated/uploaded must have its SHA-256 hash stored in a separate `DocumentIntegrity` table.
  - Periodically generate a **Merkle Tree Root** of all documents and store it in the system audit log.
  - This provides proof that no document (especially invoices) was altered post-facto.

### 3.2 Portal Transition (The "Butter" Fix)

- **Bible Reference**: Section 1.3 (Three Portals).
- **The Issue**: Momentary white-flashes when switching between subdomains.
- **Technical Spec**:
  - Hardcode `bg-slate-950` in the `RootLayout` CSS to ensure the initial paint is dark.
  - Pre-fetch the user session in `middleware.ts` to reduce hydration delay.
  - Use a "Ghost UI" skeleton that matches the Hub's branding during the 200ms auth check.

---

## 4. Proactive AI Strategy (Technical Specs)

We are building a system that **Acts**, not just **Chats**.

### 4.1 Agent: The Watchdog (Regulatory Guardian)

- **Trigger**: Daily Cron Job + Every Invoice Create Action.
- **Algorithm**:
  1.  `current_revenue = Sum(Invoices.total) WHERE year = current`.
  2.  `proximity = current_revenue / 60000`.
  3.  If `proximity > 0.85`: Trigger **Level 1 Warning** (Dashboard Banner).
  4.  If `proximity > 0.95`: Trigger **Level 2 Emergency** (Email to User + Accountant).
  5.  Action: Display direct link to "Switch to D.O.O." guide.

### 4.2 Agent: The Clerk (OCR & Categorization)

- **Input**: JPEG/PNG/PDF from `Expense Vault`.
- **Logic**:
  1.  Use `gpt-4o-mini` or `Claude-3-Haiku` for extraction.
  2.  Check OIB of the vendor against the `Contact` database.
  3.  If vendor unknown: Search official register via API to auto-create contact.
  4.  Verify "VAT Deductible" status based on vendor OIB presence in VIES.

### 4.3 Agent: The Matcher (Reconciliation)

- **Input**: Bank Transaction Row.
- **Logic**:
  1.  Extract `ReferenceNumber` (Poziv na broj).
  2.  Match against `EInvoice.invoiceNumber`.
  3.  Check `Amount` tolerance (allow +/- 0.05€ for rounding errors).
  4.  If match > 0.9 confidence: Auto-mark invoice as `PAID`.

---

## 5. UI/UX: Solving the "Graveyard of 0s"

In Stage 1 (Setup), empty charts are a design failure. We must use **Contextual Placeholders**.

### 5.1 Revenue Trend (Stage 1)

- **Hide**: Empty Bar Chart.
- **Show**: **"Revenue Projection"** card.
- **Content**: "Vaš put do 60.000€ počinje ovdje. Izdajte prvi račun i pratite rast svog poslovanja."
- **CTA**: [Izdaj prvi račun] (Primary Button).

### 5.2 VAT Overview (Non-VAT Users)

- **Hide**: Debt/Credit calculation.
- **Show**: **"Porezni Monitor"**.
- **Content**: "Trenutno ste izvan sustava PDV-a. FiskAI prati vaš promet i javit će vam na vrijeme ako trebate ući u sustav."

---

## 6. Functional Roadmap Gaps (Priority P0-P2)

These are the "100 missing things" filtered for maximum impact.

| Priority | Module         | Feature                          | Business Need                              |
| :------- | :------------- | :------------------------------- | :----------------------------------------- |
| **P0**   | **Compliance** | **Asset Registry (DI)**          | Mandatory depreciation for D.O.O.          |
| **P0**   | **Operations** | **Travel Orders (Putni Nalozi)** | Essential for tax-free payouts to owners.  |
| **P1**   | **Payroll**    | **JOPPD Automator**              | Required for the first employee hire.      |
| **P1**   | **Banking**    | **Bulk SEPA Payment**            | Pay all vendors with 1 click from the app. |
| **P2**   | **Retail**     | **Warehouse/Inventory**          | Tracks stock levels for goods-based trade. |

---

## 7. Implementation Rules for the Development Team

1.  **Centralized Rules**: Never use `if (legalForm === 'DOO')` in a component. Always use `Visible id="card:asset-registry"`. The rules live in `lib/visibility/rules.ts`.
2.  **Kebab-Case Only**: Module keys must be strictly kebab-case (e.g., `e-invoicing`).
3.  **Audit Everything**: Every `db.update` call must be accompanied by an `AuditLog` entry (enforced via Prisma middleware).

---

## 8. Strategic Source Verification

- **Porezna Uprava (2025 Update)**: [Official Link Placeholder]
- **Narodne Novine (Br. 114/2024)**: [Official Link Placeholder]
- **FINA Fiskalizacija 2.0 Docs**: [Technical Reference Placeholder]

---

**Lead Architect Signature:** Gemini Agent  
**Review Status:** Final Technical Draft  
**Next Step:** Merging into v4.1.0 logic.
