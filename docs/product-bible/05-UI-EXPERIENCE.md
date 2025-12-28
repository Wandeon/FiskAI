# UI & Experience

[← Back to Index](./00-INDEX.md)

---

## 8. Dashboard & Progressive Disclosure

### 8.1 The Four Stages

#### Stage 0: Onboarding (Wizard)

**Trigger:** `hasCompletedOnboarding: false` (company missing required fields)

**User Sees:**

- Full-screen 4-step wizard
- NO access to dashboard
- Cannot skip

**Wizard Steps:**

| Step            | Fields                      | Validation             |
| --------------- | --------------------------- | ---------------------- |
| 1. Basic Info   | Name, OIB, Legal Form       | OIB = 11 digits        |
| 2. Competence   | Global level, Category levels| At least one selected  |
| 3. Address      | Street, Postal Code, City   | All required           |
| 4. Contact & Tax| Email, IBAN, VAT checkbox   | Email valid, IBAN valid|

**Completion Logic:**

```typescript
// Actual implementation (src/lib/visibility/server.ts)
const hasCompletedOnboarding = Boolean(
  company.oib && company.address && company.city && company.iban && company.email
)
```

**Required Fields for Completion:**

| Field      | Required | Validation     |
| ---------- | -------- | -------------- |
| OIB        | ✅       | 11 digits      |
| Address    | ✅       | Non-empty      |
| City       | ✅       | Non-empty      |
| IBAN       | ✅       | Valid format   |
| Email      | ✅       | Valid email    |
| Name       | ❌       | Optional       |
| PostalCode | ❌       | Optional       |
| LegalForm  | ❌       | Defaults to DOO|
| Competence | ❌       | Stored in featureFlags, not required |

**Note:** Competence level is collected in wizard Step 2 and stored in `featureFlags.competence`, but is not required for onboarding completion.

---

#### Stage 1: Setup (New User)

**Trigger:** Onboarding complete + 0 invoices + 0 bank statements

**Dashboard Layout:**

```
┌─────────────────────────────────────────────────────────┐
│  Hero Banner                                            │
│  "Dobrodošli, [Name]! Postavimo vaš poslovni cockpit."  │
├─────────────────────────────────────────────────────────┤
│  Setup Checklist                    │  Today's Actions  │
│  □ Create first contact             │  No pending tasks │
│  □ Create first invoice             │                   │
│  □ Connect bank account             │                   │
│  □ Upload fiscal certificate        │                   │
├─────────────────────────────────────────────────────────┤
│  [Paušalni Status Card]             │  Deadlines        │
│  60k Limit: 0 EUR (0%)              │  Next: MIO 15.01  │
│  "You haven't earned anything yet"  │                   │
└─────────────────────────────────────────────────────────┘
```

**Hidden in Stage 1:**

- Revenue Trend (empty chart is sad)
- Invoice Funnel (no data)
- AI Insights (need context)
- Recent Activity (nothing yet)

---

#### Stage 2: Active (Operational)

**Trigger:** 1+ invoice created OR 1+ bank statement imported

**Dashboard Layout:**

```
┌─────────────────────────────────────────────────────────┐
│  Hero Banner (condensed)                                │
│  "[Company] • [X] contacts • Provider: [Connected/Not]" │
├─────────────────────────────────────────────────────────┤
│  Revenue Trend (6mo)     │  Invoice Funnel              │
│  ████ 2,500 EUR          │  Draft → Fiscal → Sent →    │
│  ███ 1,800 EUR           │  Delivered → Accepted        │
├─────────────────────────────────────────────────────────┤
│  Recent Activity         │  [Paušalni/VAT Status]       │
│  • Invoice #001 - Sent   │  Limit: 4,300 EUR (10.75%)   │
│  • Invoice #002 - Draft  │  ████░░░░░░░░░░░░░░░░░░░░░░ │
├─────────────────────────────────────────────────────────┤
│  Quick Actions           │  Upcoming Deadlines          │
│  [+ E-Račun] [+ Račun]   │  MIO I: 15.01 (3 days)       │
│  [+ Kontakt] [+ Trošak]  │  HOK: 27.02 (45 days)        │
└─────────────────────────────────────────────────────────┘
```

**Setup Checklist:**

- Moved to sidebar (collapsed)
- Or Settings page
- Not prominent on dashboard

---

#### Stage 3: Strategic (Mature)

**Trigger:** 10+ invoices OR VAT registered

**Additional Elements:**

```
┌─────────────────────────────────────────────────────────┐
│  AI Insights                                            │
│  "Your average invoice is 450 EUR. Consider bundling."  │
│  "You're at 85% of VAT threshold. Plan ahead."          │
├─────────────────────────────────────────────────────────┤
│  VAT Overview            │  Corporate Tax (D.O.O. only) │
│  Paid: 1,250 EUR         │  Estimated: 2,400 EUR        │
│  Pending: 450 EUR        │  Due: 30.04.2025             │
└─────────────────────────────────────────────────────────┘
```

### 8.2 Dashboard Element Catalog

| Element         | Component                     | Module        | Competence | Stage     |
| --------------- | ----------------------------- | ------------- | ---------- | --------- |
| Hero Banner     | `hero-banner.tsx`             | Core          | All        | setup+    |
| Setup Checklist | `ChecklistWidget.tsx`         | Guidance      | beginner   | setup     |
| Recent Activity | `recent-activity.tsx`         | Core          | average+   | active+   |
| Revenue Trend   | `revenue-trend-card.tsx`      | invoicing     | average+   | active+   |
| Invoice Funnel  | `invoice-funnel-card.tsx`     | invoicing     | average+   | active+   |
| Paušalni Status | `pausalni-status-card.tsx`    | pausalni      | All        | setup+    |
| VAT Overview    | `vat-overview-card.tsx`       | vat           | average+   | active+   |
| Fiscal Status   | `fiscalization-status.tsx`    | fiscalization | All        | setup+    |
| AI Insights     | `insights-card.tsx`           | ai-assistant  | All        | strategic |
| Deadlines       | `deadline-countdown-card.tsx` | Core          | All        | setup+    |
| Action Cards    | `action-cards.tsx`            | ai-assistant  | All        | active+   |
| Quick Stats     | `quick-stats.tsx`             | Core          | average+   | active+   |

---

## 9. UI Components & Behaviors

### 9.1 Layout Components

#### Header (`header.tsx`)

| Element             | Visibility                     | Behavior                   |
| ------------------- | ------------------------------ | -------------------------- |
| Logo                | Always                         | Click → /dashboard         |
| Company Switcher    | Desktop, if multiple companies | Dropdown, switch context   |
| Company Status Pill | Tablet                         | Shows e-invoice connection |
| Onboarding Progress | Desktop, if incomplete         | Click → /onboarding        |
| Plan Badge          | XL screens                     | Shows subscription tier    |
| Quick Level Toggle  | Desktop                        | beginner/average/pro       |
| Command Palette     | Always                         | ⌘K to open                 |
| Quick Actions       | Desktop                        | + dropdown                 |
| Notifications       | Always                         | Bell + unread count        |
| User Menu           | Always                         | Profile, Settings, Logout  |

#### Sidebar (`sidebar.tsx`)

**Navigation Sections (from `/src/lib/navigation.ts`):**

1. **Pregled** (Overview)
   - Dashboard

2. **Financije** (Finance)
   - Blagajna (POS) - `module: pos`
   - Dokumenti (Documents) - with category filters
   - Bankarstvo (Banking) - `module: banking`
   - Paušalni Hub - `module: pausalni`
   - Izvještaji (Reports)

3. **Suradnja** (Collaboration)
   - Računovođa (Accountant workspace)
   - Podrška (Support)

4. **Podaci** (Data)
   - Kontakti (Contacts)
   - Proizvodi (Products)
   - Article Agent - `module: ai-assistant` (STAFF only)

5. **Sustav** (System)
   - Postavke (Settings)

**Module Gating:**

```typescript
// src/components/layout/sidebar.tsx:139-151
if (item.module && company && !entitlements.includes(item.module)) {
  return false // Hidden from navigation
}
```

**Visibility Integration:**

- Each nav item can have a `visibilityId` for stage/competence gating
- Items not in entitlements are hidden (not locked)

#### Mobile Navigation (`mobile-nav.tsx`)

**Implementation:** Slide-out drawer + Command Palette FAB

**Hamburger Menu (☰):**

- Opens full navigation drawer from left
- Same structure as desktop sidebar
- Gestures: Swipe right to open, left to close

**Command Palette FAB (+):**

- Fixed position button (bottom-right)
- Opens command palette overlay
- Keyboard shortcut: Not available on mobile

**Quick Actions in Command Palette:**

| Action        | Command    | Route             |
| ------------- | ---------- | ----------------- |
| New E-Invoice | "e-račun"  | `/e-invoices/new` |
| New Invoice   | "račun"    | `/invoices/new`   |
| New Contact   | "kontakt"  | `/contacts/new`   |
| New Expense   | "trošak"   | `/expenses/new`   |
| Search        | "traži"    | Opens search      |

**Note:** The bottom navigation bar design from earlier mockups was replaced with the command palette approach for more flexibility.

### 9.2 Form Components

#### Invoice Form

**Fields:**

| Field           | Type             | Validation        |
| --------------- | ---------------- | ----------------- |
| Kupac           | Contact selector | Required          |
| Datum izdavanja | Date picker      | Required          |
| Datum dospijeća | Date picker      | > issue date      |
| Stavke          | Line item table  | Min 1             |
| └─ Opis         | Text             | Required          |
| └─ Količina     | Number           | > 0               |
| └─ Jedinica     | Select           | kom/h/dan/mj      |
| └─ Cijena       | Decimal          | >= 0              |
| └─ PDV          | Select           | 25%/13%/5%/0%     |
| Napomena        | Textarea         | Optional          |

**Paušalni Logic:**

- If `legalForm === "OBRT_PAUSAL"` && `!isVatPayer`:
  - PDV column hidden
  - Auto-add footer: "Nije u sustavu PDV-a"

**Line Item Behavior:**

- Add row: Button at bottom
- Remove row: X button (if > 1 row)
- Auto-calculate: Amount = Qty × Price
- Running total: Updates on any change

#### Onboarding Steps

**Step 1 - Basic Info:**

```tsx
<Input name="name" label="Naziv tvrtke" required />
<OIBInput name="oib" label="OIB" required />
<Select name="legalForm" label="Pravni oblik" options={[
  { value: "OBRT_PAUSAL", label: "Paušalni obrt" },
  { value: "OBRT_REAL", label: "Obrt (dohodak)" },
  { value: "OBRT_VAT", label: "Obrt u PDV sustavu" },
  { value: "JDOO", label: "j.d.o.o." },
  { value: "DOO", label: "d.o.o." },
]} />
```

**Step 2 - Competence:**

```tsx
// Three cards, selectable
<CompetenceCard level="beginner"
  title="Početnik"
  description="Pokazuj mi sve savjete i upute" />
<CompetenceCard level="average"
  title="Iskusan"
  description="Standardni prikaz" />
<CompetenceCard level="pro"
  title="Stručnjak"
  description="Minimalne upute, maksimalna kontrola" />
```

**Step 3 - Address:**

```tsx
<Input name="address" label="Adresa" required />
<Input name="postalCode" label="Poštanski broj" required />
<Input name="city" label="Grad" required />
<Select name="country" label="Država" default="HR" />
```

**Step 4 - Contact & Tax:**

```tsx
<Input name="email" type="email" label="Email" required />
<Input name="phone" label="Telefon" optional />
<Input name="iban" label="IBAN" required />
<Checkbox name="isVatPayer" label="U sustavu PDV-a"
  disabled={legalForm === "OBRT_PAUSAL"} />
// Note for paušalni: "Paušalni obrt nije u sustavu PDV-a"
```

### 9.3 Modal & Dialog Behaviors

| Modal              | Trigger             | Content                     | Actions              |
| ------------------ | ------------------- | --------------------------- | -------------------- |
| Confirm Delete     | Delete button click | "Are you sure?" + item name | Cancel, Delete (red) |
| Certificate Upload | Settings → Fiscal   | File dropzone + password    | Cancel, Upload       |
| Payment Slip       | View payment        | Hub3 barcode + details      | Close, Download      |
| Form Generator     | Generate PO-SD      | Year/quarter selection      | Cancel, Generate     |

### 9.4 Empty States

Every list/table has an empty state:

| Page              | Empty State Message           | CTA                     |
| ----------------- | ----------------------------- | ----------------------- |
| Invoices          | "Nemate još nijedan račun"    | "Izradi prvi račun"     |
| Contacts          | "Nemate još nijedan kontakt"  | "Dodaj kontakt"         |
| Products          | "Nemate još nijedan proizvod" | "Dodaj proizvod"        |
| Expenses          | "Nemate još nijedan trošak"   | "Dodaj trošak"          |
| Bank Transactions | "Nema transakcija"            | "Poveži bankovni račun" |

### 9.5 Toast Notifications

| Type    | Icon          | Background | Duration |
| ------- | ------------- | ---------- | -------- |
| Success | CheckCircle   | Green      | 3s       |
| Error   | XCircle       | Red        | 5s       |
| Warning | AlertTriangle | Yellow     | 4s       |
| Info    | Info          | Blue       | 3s       |

**Examples:**

- Success: "Račun uspješno kreiran!"
- Error: "Greška pri spremanju. Pokušajte ponovno."
- Warning: "Blizu ste limita od 60.000 EUR"
- Info: "Novi izvještaj je dostupan"

### 9.6 Notification System

FiskAI has a comprehensive notification system for deadlines, warnings, and updates.

#### Notification Types

| Type       | Icon          | Channel        | Example                  |
| ---------- | ------------- | -------------- | ------------------------ |
| `deadline` | Calendar      | In-app + Email | "MIO I due in 3 days"    |
| `warning`  | AlertTriangle | In-app + Email | "85% of VAT threshold"   |
| `success`  | CheckCircle   | In-app only    | "Invoice #123 paid"      |
| `info`     | Info          | In-app only    | "New feature available"  |
| `system`   | Bell          | In-app only    | "Maintenance scheduled"  |
| `payment`  | CreditCard    | In-app + Email | "Payment obligation due" |

#### Delivery Channels

| Channel  | Trigger                                      | Configuration               |
| -------- | -------------------------------------------- | --------------------------- |
| In-App   | Immediate                                    | Always enabled              |
| Email    | Batched (daily digest) or immediate (urgent) | User preferences            |
| Push     | Future                                       | Not implemented             |
| Calendar | Export/sync                                  | Google Calendar integration |

#### User Preferences

```typescript
interface NotificationPreference {
  userId: string
  channel: "EMAIL" | "PUSH" | "CALENDAR"
  enabled: boolean

  // Email reminders
  remind7Days: boolean // 7 days before deadline
  remind3Days: boolean // 3 days before deadline
  remind1Day: boolean // 1 day before deadline
  remindDayOf: boolean // Day of deadline

  // Calendar integration
  googleCalendarConnected: boolean
  googleCalendarId: string

  // Digest frequency
  emailDigest: "daily" | "weekly" | "never"
  urgentEmail: boolean // Immediate for Level 2 warnings

  categories: {
    deadlines: boolean
    payments: boolean
    invoices: boolean
    system: boolean
  }
}
```

**Implementation:**

```typescript
// Create notification
await db.notification.create({
  data: {
    userId: user.id,
    type: "deadline",
    priority: "medium",
    title: "MIO I doprinosi uskoro dospijevaju",
    message: "Rok: 15. siječnja 2025 (za 3 dana)",
    actionUrl: "/pausalni/obligations",
    metadata: { obligationId: "xxx" },
  },
})

// Send email if preferences allow
const prefs = await getUserNotificationPreferences(user.id)
if (prefs.categories.deadlines && prefs.remind3Days) {
  await sendEmail({
    to: user.email,
    template: "deadline-reminder",
    data: { deadline, daysRemaining: 3 },
  })
}
```

### 9.7 Email Integration

FiskAI can connect to user email accounts to auto-import expense receipts.

#### Supported Providers

| Provider      | OAuth            | Status     |
| ------------- | ---------------- | ---------- |
| Gmail         | Google OAuth 2.0 | Production |
| Microsoft 365 | Microsoft OAuth  | Production |
| Other IMAP    | Not supported    | -          |

#### Import Flow

```
1. User connects email via OAuth (/email/connect)
2. System creates EmailConnection record
3. Cron job (15min) fetches new emails (/api/cron/email-sync)
4. Filter by import rules:
   - Sender whitelist (e.g., "faktura@*")
   - Subject patterns (e.g., "Račun*")
   - Attachment types (PDF, images)
5. Matching attachments → Import queue
6. AI extraction (The Clerk agent)
7. User review and confirm
```

#### Import Rules

```typescript
interface EmailImportRule {
  id: string
  connectionId: string
  senderPattern: string // "invoices@*" or "*@supplier.hr"
  subjectPattern?: string // "Invoice*" or "Račun*"
  attachmentTypes: string[] // ["pdf", "jpg", "png"]
  targetCategory?: string // Auto-assign expense category
  autoConfirm: boolean // Skip review for trusted senders
}
```

**Example Rules:**

```typescript
// Auto-import from accounting firm
{
  senderPattern: "*@racunovodstvo.hr",
  subjectPattern: null,
  attachmentTypes: ["pdf"],
  targetCategory: "professional-services",
  autoConfirm: false
}

// Auto-import utility bills
{
  senderPattern: "noreply@hep.hr",
  subjectPattern: "Račun za*",
  attachmentTypes: ["pdf"],
  targetCategory: "utilities",
  autoConfirm: true  // High confidence vendor
}
```

**API Endpoints:**

- `POST /api/email/connect` - Start OAuth flow
- `GET /api/email/callback` - OAuth callback
- `POST /api/email/[connectionId]/disconnect` - Remove connection
- `GET/POST /api/email/rules` - Manage import rules
- `PUT/DELETE /api/email/rules/[id]` - Update/delete rule

**Security:**

- OAuth tokens stored encrypted
- Read-only access to email
- Only attachments are downloaded, not email content
- User can disconnect at any time
- No access to sent emails

---

## 10. Complete User Flows

### 10.1 Authentication Flows

#### Registration

```
1. /register
   └─ Enter email
2. Check if email exists
   ├─ YES → "Email already registered" → Login link
   └─ NO → Continue
3. Set password (or passkey)
4. Verify email (6-digit OTP)
5. Create User record
6. Redirect → /onboarding
```

#### Login

```
1. /login
   └─ Enter email
2. Check auth methods available
   ├─ Has passkey → Offer passkey login
   ├─ Has password → Show password field
   └─ Has both → Show both options
3. Authenticate
4. Check company setup
   ├─ No company → /onboarding
   └─ Has company → /dashboard
```

#### Password Reset

```
1. /forgot-password
   └─ Enter email
2. Send OTP to email
3. Enter OTP
4. Set new password
5. Redirect → /login
```

### 10.2 Invoice Creation Flow

```
1. Click "+ E-Račun" (or navigate to /e-invoices/new)
2. Select buyer (from contacts)
   ├─ Existing contact → Auto-fill
   └─ "Add new" → Quick contact form
3. Set dates (issue date, due date)
4. Add line items
   ├─ Manual entry
   └─ Select from products → Auto-fill price/VAT
5. Review totals
6. Click "Spremi kao nacrt" OR "Fiskaliziraj i pošalji"
   ├─ Draft → Save, redirect to invoice view
   └─ Fiscalize →
       ├─ Generate ZKI
       ├─ Send to CIS
       ├─ Receive JIR
       ├─ Save with JIR/ZKI
       └─ Option: Send via email
```

### 10.3 Bank Reconciliation Flow

```
1. Navigate to /banking/reconciliation
2. View unmatched transactions
3. For each transaction:
   ├─ System suggests matches (AI)
   │   └─ "This looks like payment for Invoice #001"
   ├─ User actions:
   │   ├─ Accept match → Link transaction to invoice
   │   ├─ Reject match → Mark as ignored
   │   └─ Manual match → Search invoices/expenses
   └─ Create new:
       ├─ "Create expense from this" → Opens expense form
       └─ "Create income from this" → Opens invoice form
4. Transaction status updates:
   UNMATCHED → AUTO_MATCHED → confirmed
   UNMATCHED → MANUAL_MATCHED → confirmed
   UNMATCHED → IGNORED
```

### 10.4 Paušalni Monthly Flow

```
Monthly Contribution Payment:
1. Dashboard shows "Doprinosi dospijevaju za 5 dana"
2. Click → Opens payment details
3. View:
   ├─ MIO I: 107.88 EUR
   ├─ MIO II: 35.96 EUR
   ├─ HZZO: 118.67 EUR
   └─ Total: 262.51 EUR
4. Generate payment slips (Hub3 barcode)
5. Mark as paid when done
```

```
Quarterly Tax Payment:
1. Dashboard shows "Porez na dohodak dospijeva"
2. Click → Opens quarterly calculation
3. System calculates based on revenue bracket
4. Generate payment slip
5. Mark as paid
```

```
Annual PO-SD Submission:
1. January: System prompts "Time for PO-SD"
2. Click "Generate PO-SD"
3. Review auto-filled form
4. Download XML
5. Submit to ePorezna (external)
6. Upload confirmation
```

### 10.5 VAT Return Flow (DOO/JDOO)

```
1. Navigate to /reports/vat
2. Select period (month or quarter)
3. System calculates:
   ├─ Output VAT (from sales invoices)
   ├─ Input VAT (from purchase invoices/expenses)
   └─ Net payable/refund
4. Review URA (incoming) register
5. Review IRA (outgoing) register
6. Generate PDV-RR form
7. Download XML
8. Submit to ePorezna
9. If payable: Generate payment slip
```

### 10.6 Fiscal Certificate Management

Required for businesses accepting cash/card payments (fiscalization).

#### Certificate Upload Flow

```
1. Navigate to /settings/fiscal
2. Click "Upload Certificate"
3. Select .p12 file from FINA
4. Enter certificate password
5. System validates:
   - File format (PKCS#12)
   - Certificate not expired
   - OIB matches company
   - Certificate issuer is FINA
6. Store encrypted in database
7. Mark company as fiscal-enabled
8. Display certificate details (valid from/to, OIB)
```

#### Certificate Lifecycle

| Status     | Meaning                 | Action                               |
| ---------- | ----------------------- | ------------------------------------ |
| `PENDING`  | Uploaded, not validated | Validate password                    |
| `ACTIVE`   | Ready for fiscalization | None                                 |
| `EXPIRING` | <30 days to expiry      | Show renewal warning                 |
| `EXPIRED`  | Cannot fiscalize        | Block cash invoices, upload new cert |
| `REVOKED`  | Manually invalidated    | Upload new cert                      |

#### Multi-Premises Support

```typescript
interface BusinessPremises {
  id: string
  companyId: string
  label: string // "Glavni ured", "Poslovnica 2"
  address: string
  city: string
  postalCode: string
  posDeviceId?: string // Linked POS terminal
  isDefault: boolean
  fiscalEnabled: boolean
}
```

Each premises can have its own fiscal device numbering. When creating a cash invoice, the user selects which premises issued it.

**Server Actions:**

- `uploadCertificate(file, password)` - Upload and validate cert
- `validateCertificate(certId)` - Check if still valid
- `deleteCertificate(certId)` - Remove cert (requires confirmation)

### 10.7 POS Terminal Operations

For retail businesses with Stripe Terminal (in-person card payments).

#### Terminal Setup Flow

```
1. Order Stripe Terminal reader (BBPOS WisePOS E)
2. Navigate to /pos/setup
3. Click "Pair Reader"
4. System generates connection token via /api/terminal/connection-token
5. Reader displays pairing code
6. Enter code in FiskAI
7. Reader linked to premises
8. Test transaction (1.00 EUR)
9. Terminal ready
```

#### Transaction Flow

```
1. Navigate to /pos
2. Create new sale
3. Add items (from Products catalog)
   - Select product
   - Set quantity
   - Adjust price if needed
4. Calculate total (with VAT)
5. Select payment method:
   - Cash → Skip to step 7
   - Card → Continue to step 6
6. If card:
   - Send to reader via /api/terminal/payment-intent
   - Customer taps/inserts card
   - Wait for authorization (3-30 seconds)
   - If declined: Show error, retry or select different method
   - If approved: Continue to step 7
7. Fiscalize invoice to CIS
8. Generate JIR/ZKI
9. Print/email receipt
10. Update inventory (if enabled)
11. Record payment in cash book
```

#### Terminal Statuses

| Status     | Meaning                | Action                    |
| ---------- | ---------------------- | ------------------------- |
| `ONLINE`   | Ready for transactions | None                      |
| `OFFLINE`  | Network issue          | Check internet connection |
| `BUSY`     | Processing transaction | Wait for completion       |
| `UPDATING` | Firmware update        | Wait 5-10 minutes         |
| `ERROR`    | Hardware issue         | Contact support           |

**Implementation:**

```typescript
// Create payment intent
const paymentIntent = await stripe.paymentIntents.create({
  amount: total * 100, // cents
  currency: "eur",
  payment_method_types: ["card_present"],
  capture_method: "automatic",
})

// Send to terminal
const result = await stripe.terminal.readers.processPaymentIntent(readerId, {
  payment_intent: paymentIntent.id,
})

if (result.action_required) {
  // Customer needs to take action (insert chip, etc.)
  await waitForCustomerAction(result)
}

if (result.status === "succeeded") {
  // Payment successful, fiscalize
  await fiscalizeInvoice(invoiceId)
}
```

**Refunds:**

- Same-day refunds: Void transaction (no fiscal needed)
- Next-day refunds: Create fiscalized refund invoice (Storno)
- Partial refunds: Create credit note

**Hardware:**

- Recommended: BBPOS WisePOS E (299 EUR)
- Alternative: Stripe Reader M2 (59 EUR, mobile only)
- Connection: WiFi or Ethernet
- Receipt printer: Built-in thermal printer
