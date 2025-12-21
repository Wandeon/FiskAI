# FiskAI Dashboard Element Mapping & Access Matrix

This document defines every element appearing on the dashboard, its purpose, and the rules (Module, Competence, User Type) that govern its visibility.

---

## 1. Base Infrastructure (The "Floor")

These elements are visible to **every user** after completing the onboarding wizard. They form the core experience of FiskAI.

| Element             | ID                      | Purpose                                                       | Module   | Competence | User Type |
| :------------------ | :---------------------- | :------------------------------------------------------------ | :------- | :--------- | :-------- |
| **Hero Banner**     | `card:hero-banner`      | Personalized welcome and high-level health status.            | Core     | Beginner+  | All       |
| **Today's Actions** | `card:today-actions`    | Aggregated list of alerts, stats highlights, and setup tasks. | Core     | Beginner+  | All       |
| **Recent Activity** | `card:recent-activity`  | List of the 5 most recent invoices/documents.                 | Core     | Average+   | All       |
| **Setup Checklist** | `card:checklist-widget` | Interactive guide to help users finish technical setup.       | Guidance | Beginner   | All       |

---

## 2. Operational Modules (Gated Features)

These elements only appear if the specific module is enabled in the company's entitlements.

| Element            | ID                          | Purpose                                                 | Module          | Competence | User Type   |
| :----------------- | :-------------------------- | :------------------------------------------------------ | :-------------- | :--------- | :---------- |
| **Revenue Trend**  | `card:revenue-trend`        | 6-month bar chart of income.                            | `invoicing`     | Average+   | All         |
| **Invoice Funnel** | `card:invoice-funnel`       | Visual pipeline from Draft -> Paid.                     | `invoicing`     | Average+   | All         |
| **Fiscal Status**  | `card:fiscalization-status` | Real-time status of FINA connection and certificates.   | `fiscalization` | Beginner+  | Cash Payers |
| **AI Insights**    | `card:insights-widget`      | Contextual, AI-driven tips based on business data.      | `ai-assistant`  | Beginner+  | All         |
| **Action Cards**   | `card:action-cards`         | Entry points for AI Assistant and Accountant Workspace. | `ai-assistant`  | Beginner+  | All         |

---

## 3. Legal Form Specifics (Automatic Gating)

These elements are sensitive to the company's legal status (e.g., Paušalni vs. D.O.O.).

| Element             | ID                        | Purpose                                             | Module          | Competence | User Type      |
| :------------------ | :------------------------ | :-------------------------------------------------- | :-------------- | :--------- | :------------- |
| **Paušalni Status** | `card:pausalni-status`    | Tracks the 40.000€ limit and upcoming tax quarters. | `pausalni`      | Beginner+  | OBRT_PAUSAL    |
| **VAT Overview**    | `card:vat-overview`       | Real-time calculation of PDV debt/credit.           | `vat`           | Average+   | VAT Payers     |
| **Deadlines**       | `card:deadline-countdown` | Countdown to specific legal/tax deadlines.          | Core            | Beginner+  | All (Filtered) |
| **Corp Tax**        | `card:corporate-tax`      | Status of corporate income tax (porez na dobit).    | `corporate-tax` | Pro        | D.O.O.         |

---

## 4. The "Progressive Disclosure" Logic (Stages)

To avoid the "WTF is all this" reaction, elements appear based on business maturity:

### Stage 0: Onboarding (Wizard)

- **User sees**: Only the Wizard.
- **Goal**: Collect OIB, IBAN, and Email.

### Stage 1: Setup (New User)

- **User sees**: Hero Banner, Setup Checklist, Today's Actions (Tasks only).
- **Hidden**: Charts, Insights, Activity (to avoid "0" graveyards).

### Stage 2: Active (Operational)

- _Trigger: 1+ Invoice or 1+ Bank Statement_
- **User sees**: Activity List, Revenue Trend, Invoice Funnel.
- **Hidden**: Setup Checklist (minimized or moved to sidebar).

### Stage 3: Strategic (Mature)

- _Trigger: 10+ Invoices or VAT-registered_
- **User sees**: AI Insights, Advanced Deadlines, VAT Overview.

---

## 5. Proposed "Base" vs "Pro" Tiers

### **The "Base" Setting (Minimum Access)**

- **Features**: Invoicing (Manual/PDF), Contacts, Products, Documents, Basic Reports.
- **Dashboard**: Hero, Today's Actions, Recent Activity, Basic Deadline Tracker.

### **The "Pro" Add-on Modules**

- **E-Invoicing**: Adds E-Invoice Funnel and Provider Status.
- **Fiscalization**: Adds JIR/ZKI status and Certificate alerts.
- **Banking**: Adds Cash Flow card and Bank Sync status.
- **AI Assistant**: Adds the Floating Popup and the "Insights Widget".
- **Advanced Reports**: Adds multi-year comparisons and export tools.

---

## Suggestions for Improvement:

1.  **Notification Center**: Move "Reminders" out of the main dashboard cards and into a Top-Bar notification icon (Bell). This cleans up the "Today's Actions" card.
2.  **Widget Customization**: Allow "Pro" users to drag-and-drop or hide/show widgets they don't care about (e.g., if I don't use the POS, I should be able to hide the Blagajna alert).
3.  **Empty States**: For every card (like Revenue Trend), design a "Empty State" that says "Izradite prvi račun da biste vidjeli grafikon" instead of showing an empty coordinate system.
