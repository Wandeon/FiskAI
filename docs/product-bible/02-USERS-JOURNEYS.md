# Users & Journeys

[← Back to Index](./00-INDEX.md)

---

## 3. User Personas & Journey Matrix

### 3.1 The Five Personas

#### Persona 1: Marko - The Paušalni Freelancer

| Attribute         | Value                                                                           |
| ----------------- | ------------------------------------------------------------------------------- |
| **Legal Form**    | `OBRT_PAUSAL`                                                                   |
| **Revenue**       | < 60,000 EUR/year                                                               |
| **VAT Status**    | Not in system                                                                   |
| **Employees**     | None                                                                            |
| **Cash Payments** | Occasionally                                                                    |
| **Competence**    | Beginner                                                                        |
| **Pain Points**   | "What forms do I need?", "When do I pay contributions?", "Am I near the limit?" |

**Marko's Journey:**

```
STAGE 0: ONBOARDING
├── Step 1: Basic Info (OIB, Company Name, Select "Paušalni obrt")
├── Step 2: Competence Level → "Beginner" (shows all help)
├── Step 3: Address (for invoice header)
└── Step 4: Contact & IBAN (for payment slips)

STAGE 1: SETUP (0 invoices)
├── Dashboard: Hero Banner + Setup Checklist
├── Tasks: "Create your first contact", "Create your first invoice"
├── Hidden: Charts, Advanced Reports, AI Insights
└── Visible: Paušalni Status Card (60k limit at 0%)

STAGE 2: ACTIVE (1+ invoice)
├── Dashboard: + Recent Activity, Revenue Trend, Invoice Funnel
├── Unlocked: Basic Reports, KPR Export
├── Shown: Contribution Payment Reminders
└── Alert: "You've earned X EUR. Y EUR until VAT threshold."

STAGE 3: STRATEGIC (10+ invoices OR VAT)
├── Dashboard: + AI Insights, Advanced Deadlines
├── Unlocked: AI Assistant, Advanced Reports
└── Proactive: "You're at 90% of limit. Plan ahead."
```

**What Marko Sees:**

| Element                 | Visible? | Notes                             |
| ----------------------- | -------- | --------------------------------- |
| VAT fields on invoices  | NO       | "Nije u sustavu PDV-a" auto-added |
| PDV reports             | NO       | Not a VAT payer                   |
| Paušalni Status Card    | YES      | Shows 60k limit progress          |
| PO-SD Generator         | YES      | Annual tax form                   |
| HOK Payment Reminder    | YES      | Quarterly chamber fee             |
| Contribution Calculator | YES      | Monthly MIO/HZZO                  |
| Corporate Tax           | NO       | Not applicable                    |
| Asset Registry          | NO       | Not required for paušalni         |

---

#### Persona 2: Ana - The Growing Obrt

| Attribute       | Value                                                              |
| --------------- | ------------------------------------------------------------------ |
| **Legal Form**  | `OBRT_REAL` (or `OBRT_VAT` if VAT-registered)                      |
| **Revenue**     | 60,000 - 150,000 EUR/year                                          |
| **VAT Status**  | May or may not be registered                                       |
| **Employees**   | 0-2                                                                |
| **Competence**  | Average                                                            |
| **Pain Points** | "How do I track expenses?", "What can I deduct?", "Do I need VAT?" |

**What Ana Needs (vs Marko):**

| Module                    | Paušalni | Ana's Obrt   |
| ------------------------- | -------- | ------------ |
| KPR (Daily Sales)         | YES      | NO           |
| KPI (Income/Expense Book) | NO       | YES          |
| PO-SD                     | YES      | NO           |
| DOH Form                  | NO       | YES          |
| URA/IRA                   | NO       | YES          |
| Asset Registry            | NO       | YES          |
| PDV Forms                 | NO       | IF VAT       |
| JOPPD                     | NO       | IF EMPLOYEES |

---

#### Persona 3: Ivan - The D.O.O. Owner

| Attribute       | Value                                                          |
| --------------- | -------------------------------------------------------------- |
| **Legal Form**  | `DOO` or `JDOO`                                                |
| **Revenue**     | Any                                                            |
| **VAT Status**  | Always YES                                                     |
| **Employees**   | 0+                                                             |
| **Competence**  | Average/Pro                                                    |
| **Pain Points** | "Corporate tax calculation", "VAT returns", "Employee payroll" |

**What Ivan Needs:**

| Module         | Required     | Purpose                               |
| -------------- | ------------ | ------------------------------------- |
| Invoicing      | YES          | Issue invoices (E-Invoice mandatory 2026) |
| URA/IRA        | YES          | Invoice registers (mandatory)         |
| PDV Forms      | YES          | VAT reporting (mandatory)             |
| Asset Registry | YES          | Depreciation affects tax              |
| Corporate Tax  | YES          | 10%/18% calculation                   |
| JOPPD          | IF EMPLOYEES | Payroll reporting                     |
| Fiscalization  | IF CASH      | POS/card payments                     |

---

#### Persona 4: Petra - The Accountant (Staff)

| Attribute      | Value                                       |
| -------------- | ------------------------------------------- |
| **SystemRole** | `STAFF`                                     |
| **Manages**    | Multiple client companies                   |
| **Needs**      | Bulk operations, export, multi-company view |

**Petra's Portal (`staff.fiskai.hr`):**

**Current Implementation:**

```
Staff Dashboard
├── Dashboard (overview of assigned clients)
├── Clients (list with status indicators)
├── Calendar (shared deadlines view)
├── Tasks (assigned work items)
├── Tickets (support tickets from clients)
└── Documents (cross-client document access)
```

**Per-Client Context:**

- Click client → enters client context
- Same UI as client app
- Role: ACCOUNTANT (read + export)
- Special: "Pregledano" (Reviewed) button

**Planned Features (not yet implemented):**

- Pending Actions aggregate view
- Bulk export across clients
- Quick deadline overview

---

#### Persona 5: Admin (Platform Owner)

| Attribute        | Value             |
| ---------------- | ----------------- |
| **SystemRole**   | `ADMIN`           |
| **Portal**       | `admin.fiskai.hr` |
| **Capabilities** | Everything        |

**Admin Portal (`admin.fiskai.hr`):**

**Current Implementation:**

```
Admin Dashboard
├── Tenants (company management)
├── Staff (staff user management)
├── Subscriptions (Stripe subscription management)
├── Services (feature flag management)
├── Support (ticket management)
├── Audit Log (system-wide activity)
└── Settings (admin settings)
```

**Planned Features:**

- Dashboard (platform metrics)
- News management (create/edit announcements)
- Support ticket escalation
- Tenant impersonation

---

### 3.2 Journey Matrix (Persona × Stage)

| Stage          | Paušalni (Marko)            | Obrt Real (Ana)               | D.O.O. (Ivan)                   |
| -------------- | --------------------------- | ----------------------------- | ------------------------------- |
| **Onboarding** | Basic + Competence          | + VAT question                | VAT forced ON                   |
| **Setup**      | KPR tutorial, First invoice | + KPI setup, Expense tracking | + URA/IRA, PDV setup            |
| **Active**     | Limit monitor, PO-SD        | + Asset tracking, DOH prep    | + Corporate tax, Full reporting |
| **Strategic**  | "Consider D.O.O.?"          | + Employee prep               | + JOPPD, Advanced analytics     |
