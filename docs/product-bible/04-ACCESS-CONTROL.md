# Access Control

[← Back to Index](./00-INDEX.md)

---

## 5. Module System & Entitlements

### 5.1 The 16 Module Keys

Stored in `Company.entitlements[]` as kebab-case strings:

| Module Key         | Description              | Default |
| ------------------ | ------------------------ | ------- |
| `invoicing`        | Manual PDF generation    | ✅ FREE |
| `e-invoicing`      | UBL/XML B2B/B2G          | ✅ FREE |
| `contacts`         | CRM directory            | ✅ FREE |
| `products`         | Product catalog          | ✅ FREE |
| `expenses`         | Expense tracking         | ✅ FREE |
| `banking`          | Bank import & sync       | PAID    |
| `documents`        | Document vault (archive) | ✅ FREE |
| `reports-basic`    | KPR, aging, P&L          | ✅ FREE |
| `fiscalization`    | CIS integration          | PAID    |
| `reconciliation`   | Auto-matching            | PAID    |
| `reports-advanced` | VAT reports, exports     | PAID    |
| `pausalni`         | Paušalni features        | AUTO\*  |
| `vat`              | VAT management           | AUTO\*  |
| `corporate-tax`    | D.O.O./JDOO tax          | AUTO\*  |
| `pos`              | Point of sale            | PAID    |
| `ai-assistant`     | AI chat & extraction     | PAID    |

\*AUTO modules are recommended based on `legalForm` but must be explicitly added to entitlements. The visibility system hides irrelevant modules (e.g., VAT widgets for non-VAT payers) regardless of entitlements.

**Current behavior:** Legal-form-specific features are controlled by the visibility system (`src/lib/visibility/rules.ts`), not by auto-enabling entitlements.

**Planned:** Future versions may auto-add relevant entitlements during onboarding based on legalForm selection.

### 5.2 Module Definition Structure

```typescript
// src/lib/modules/definitions.ts
interface ModuleDefinition {
  key: ModuleKey
  name: string // English display name
  description: string // English description
  routes: string[] // Protected route patterns
  navItems: string[] // Nav item identifiers (not objects)
  defaultEnabled: boolean
}

export const MODULES: Record<ModuleKey, ModuleDefinition> = {
  fiscalization: {
    key: "fiscalization",
    name: "Fiscalization",
    description: "Fiscal receipts, JIR/ZKI, CIS integration",
    routes: ["/settings/fiscalisation", "/settings/premises"],
    navItems: ["fiscalization"],
    defaultEnabled: false,
  },
  // ... 15 more modules
}
```

**Note:** The `navItems` array contains identifiers that map to the navigation registry in `/src/lib/navigation.ts`, not full nav item objects. The `requiredFor` field shown in earlier versions does not exist in the current implementation.

### 5.3 Entitlement Checking

**Route Protection (Sidebar):**

```typescript
// src/components/layout/sidebar.tsx
if (item.module && company && !entitlements.includes(item.module)) {
  return false // Item hidden from navigation
}
```

**Component Visibility:**

```tsx
// Using visibility system (checks legal form, stage, competence)
;<Visible id="card:pausalni-status">
  <PausalniStatusCard />
</Visible>

// Direct entitlement check in component
{
  entitlements.includes("ai-assistant") && <AIAssistantButton />
}
```

**Note:** Entitlements are checked separately from the visibility system. Visibility handles legal form, progression stage, and competence level. Entitlements are checked directly in sidebar navigation and individual components.

---

## 6. Permission Matrix (RBAC)

### 6.1 The Five Tenant Roles

| Role         | Description                     | Typical User        |
| ------------ | ------------------------------- | ------------------- |
| `OWNER`      | Full control, including billing | Business founder    |
| `ADMIN`      | Manage resources, invite users  | Trusted manager     |
| `MEMBER`     | Create/edit, no delete          | Employee            |
| `ACCOUNTANT` | Read-only + exports             | External accountant |
| `VIEWER`     | Read-only                       | Investor, advisor   |

### 6.2 Permission Matrix

| Permission          | OWNER | ADMIN | MEMBER | ACCOUNTANT | VIEWER |
| ------------------- | ----- | ----- | ------ | ---------- | ------ |
| **Invoices**        |
| `invoice:create`    | ✅    | ✅    | ✅     | ❌         | ❌     |
| `invoice:read`      | ✅    | ✅    | ✅     | ✅         | ✅     |
| `invoice:update`    | ✅    | ✅    | ✅     | ❌         | ❌     |
| `invoice:delete`    | ✅    | ✅    | ❌     | ❌         | ❌     |
| **Expenses**        |
| `expense:create`    | ✅    | ✅    | ✅     | ❌         | ❌     |
| `expense:read`      | ✅    | ✅    | ✅     | ✅         | ✅     |
| `expense:update`    | ✅    | ✅    | ✅     | ❌         | ❌     |
| `expense:delete`    | ✅    | ✅    | ❌     | ❌         | ❌     |
| **Contacts**        |
| `contact:create`    | ✅    | ✅    | ✅     | ❌         | ❌     |
| `contact:read`      | ✅    | ✅    | ✅     | ✅         | ✅     |
| `contact:update`    | ✅    | ✅    | ✅     | ❌         | ❌     |
| `contact:delete`    | ✅    | ✅    | ❌     | ❌         | ❌     |
| **Products**        |
| `product:create`    | ✅    | ✅    | ✅     | ❌         | ❌     |
| `product:read`      | ✅    | ✅    | ✅     | ✅         | ✅     |
| `product:update`    | ✅    | ✅    | ✅     | ❌         | ❌     |
| `product:delete`    | ✅    | ✅    | ❌     | ❌         | ❌     |
| **Settings**        |
| `settings:read`     | ✅    | ✅    | ❌     | ✅         | ❌     |
| `settings:update`   | ✅    | ✅    | ❌     | ❌         | ❌     |
| `billing:manage`    | ✅    | ❌    | ❌     | ❌         | ❌     |
| **Users**           |
| `users:invite`      | ✅    | ✅    | ❌     | ❌         | ❌     |
| `users:remove`      | ✅    | ✅    | ❌     | ❌         | ❌     |
| `users:update_role` | ✅    | ❌    | ❌     | ❌         | ❌     |
| **Reports**         |
| `reports:read`      | ✅    | ✅    | ❌     | ✅         | ✅     |
| `reports:export`    | ✅    | ✅    | ❌     | ✅         | ❌     |
| **Fiscal**          |
| `fiscal:manage`     | ✅    | ✅    | ❌     | ❌         | ❌     |

### 6.3 Usage in Code

```typescript
// Server action
return requireCompanyWithPermission(user.id!, 'invoice:delete', async (company) => {
  await db.eInvoice.delete({ where: { id } })
})

// Component
if (roleHasPermission(userRole, 'invoice:delete')) {
  return <DeleteButton />
}
```

### 6.4 Audit Logging & Document Integrity

Every significant action is logged for compliance and debugging.

**Logged Actions:**

| Action      | What's Recorded                           |
| ----------- | ----------------------------------------- |
| `CREATE`    | Entity type, ID, user, timestamp, company |
| `UPDATE`    | Fields changed, old/new values            |
| `DELETE`    | Soft-delete flag, reason if provided      |
| `VIEW`      | Sensitive data access (financial reports) |
| `EXPORT`    | What was exported, format, recipient      |
| `LOGIN`     | Success/failure, IP, device               |
| `FISCALIZE` | Invoice ID, JIR/ZKI, CIS response         |

**Implementation:**

```typescript
// Prisma middleware enforces logging
prisma.$use(async (params, next) => {
  if (["create", "update", "delete"].includes(params.action)) {
    const result = await next(params)

    await createAuditLog({
      action: params.action.toUpperCase(),
      model: params.model,
      entityId: params.args.where?.id || result?.id,
      userId: getCurrentUserId(),
      companyId: getCurrentCompanyId(),
      changes: params.args.data,
      timestamp: new Date(),
    })

    return result
  }
  return next(params)
})
```

**Document Integrity:**

Every uploaded or generated document is hashed to ensure it cannot be altered.

```typescript
// Document integrity record
interface DocumentIntegrity {
  documentId: string
  sha256Hash: string // Hash of document content
  fileSize: number // File size in bytes
  mimeType: string // application/pdf, image/jpeg, etc.
  createdAt: DateTime // Upload/generation timestamp
  createdBy: string // User ID
  verifiedAt?: DateTime // Last integrity check
  merkleRoot?: string // Periodic Merkle tree root for batch verification
  storageUrl: string // Cloudflare R2 location
}

// On document upload
async function storeDocument(file: File, companyId: string) {
  const buffer = await file.arrayBuffer()
  const hash = crypto.subtle.digest("SHA-256", buffer)
  const hashHex = Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")

  // Upload to R2
  const url = await uploadToR2(buffer, `${companyId}/${hashHex}`)

  // Store integrity record
  await db.documentIntegrity.create({
    data: {
      documentId: generateId(),
      sha256Hash: hashHex,
      fileSize: buffer.byteLength,
      mimeType: file.type,
      createdBy: userId,
      storageUrl: url,
    },
  })

  return { url, hash: hashHex }
}

// Verification (periodic cron job)
async function verifyDocumentIntegrity(documentId: string) {
  const record = await db.documentIntegrity.findUnique({ where: { documentId } })
  const file = await fetchFromR2(record.storageUrl)
  const currentHash = await calculateSHA256(file)

  if (currentHash !== record.sha256Hash) {
    await alertAdmins({
      severity: "CRITICAL",
      message: `Document integrity violation: ${documentId}`,
      expected: record.sha256Hash,
      actual: currentHash,
    })
    return false
  }

  await db.documentIntegrity.update({
    where: { documentId },
    data: { verifiedAt: new Date() },
  })

  return true
}
```

**Retention Policy:**

- **11 years** - Croatian legal requirement for tax documents
- **After 11 years:** Documents archived to cold storage, integrity records retained
- **Audit logs:** Retained indefinitely (compressed after 2 years)

**Compliance Features:**

- Immutable audit trail (append-only)
- No backdated entries
- No deletion of audit logs (soft-delete only for GDPR)
- Periodic integrity verification via cron
- Merkle tree for batch verification efficiency

---

## 7. Visibility & Feature Gating

### 7.1 Three-Layer Visibility System

**Layer 1: Business Type (Legal Form)**

```typescript
// What's hidden based on legalForm
OBRT_PAUSAL: ["vat-fields", "corporate-tax", "asset-registry"]
OBRT_REAL: ["pausalni-widgets", "kpr", "po-sd"]
DOO/JDOO: ["pausalni-widgets", "doprinosi-personal"]
```

**Layer 2: Progression Stage**

```typescript
// calculateActualStage(company)
onboarding  → Wizard incomplete
setup       → Profile complete, 0 invoices
active      → 1+ invoice OR bank statement
strategic   → 10+ invoices OR VAT registered
```

**Layer 3: Competence Level**

```typescript
// User's self-declared expertise
beginner → Hide advanced settings, show all help
average  → Normal UI
pro      → Show everything, minimal hand-holding
```

### 7.2 Element Visibility Registry

**Complete list from `/src/lib/visibility/elements.ts`:**

#### Dashboard Cards

| Element ID                  | Legal Form  | Stage     | Competence | Purpose          |
| --------------------------- | ----------- | --------- | ---------- | ---------------- |
| `card:hero-banner`          | All         | setup+    | All        | Welcome message  |
| `card:checklist-widget`     | All         | setup     | beginner   | Setup guide      |
| `card:recent-activity`      | All         | active+   | average+   | Recent actions   |
| `card:revenue-trend`        | All         | active+   | average+   | Revenue chart    |
| `card:invoice-funnel`       | All         | active+   | average+   | Invoice pipeline |
| `card:pausalni-status`      | OBRT_PAUSAL | setup+    | All        | Limit tracker    |
| `card:vat-overview`         | VAT payers  | active+   | average+   | VAT summary      |
| `card:fiscalization-status` | Cash payers | setup+    | All        | Fiscal status    |
| `card:insights-widget`      | All         | strategic | All        | AI insights      |
| `card:corporate-tax`        | DOO/JDOO    | strategic | pro        | Corp tax         |
| `card:doprinosi`            | OBRT\_\*    | setup+    | All        | Contributions    |
| `card:cash-flow`            | All         | active+   | average+   | Cash flow        |
| `card:posd-reminder`        | OBRT_PAUSAL | active+   | All        | Annual form      |
| `card:deadline-countdown`   | All         | setup+    | All        | Next deadline    |
| `card:today-actions`        | All         | setup+    | All        | Action items     |
| `card:advanced-insights`    | All         | strategic | pro        | Deep analytics   |
| `card:insights`             | All         | active+   | average+   | Basic insights   |

#### Navigation Items

| Element ID          | Purpose         |
| ------------------- | --------------- |
| `nav:dashboard`     | Dashboard       |
| `nav:invoices`      | Invoice list    |
| `nav:e-invoices`    | E-invoice list  |
| `nav:contacts`      | Contacts        |
| `nav:customers`     | Customers       |
| `nav:products`      | Products        |
| `nav:expenses`      | Expenses        |
| `nav:documents`     | Documents       |
| `nav:import`        | Import          |
| `nav:vat`           | VAT management  |
| `nav:pausalni`      | Paušalni hub    |
| `nav:reports`       | Reports section |
| `nav:doprinosi`     | Contributions   |
| `nav:corporate-tax` | Corporate tax   |
| `nav:bank`          | Bank accounts   |
| `nav:pos`           | Point of sale   |
| `nav:settings`      | Settings        |
| `nav:api-settings`  | API settings    |
| `nav:checklist`     | Checklist       |

#### Actions

| Element ID                 | Purpose           |
| -------------------------- | ----------------- |
| `action:create-invoice`    | New invoice       |
| `action:create-contact`    | New contact       |
| `action:create-product`    | New product       |
| `action:create-expense`    | New expense       |
| `action:import-statements` | Import statements |
| `action:export-data`       | Export data       |

#### Pages

| Element ID           | Purpose       |
| -------------------- | ------------- |
| `page:vat`           | VAT dashboard |
| `page:pausalni`      | Paušalni hub  |
| `page:pos`           | POS interface |
| `page:reports`       | Reports       |
| `page:corporate-tax` | Corp tax      |
| `page:doprinosi`     | Contributions |
| `page:bank`          | Banking       |

### 7.3 Visibility Component Usage

```tsx
// In dashboard
<Visible id="card:pausalni-status">
  <PausalniStatusCard />
</Visible>
```

**What Visibility Checks:**

1. ✅ Legal form (`legalForm`) - e.g., hide VAT widgets for paušalni
2. ✅ Progression stage (`stage`) - e.g., hide charts until first invoice
3. ✅ Competence level (`competence`) - e.g., hide advanced for beginners
4. ❌ **Does NOT check entitlements**

**Entitlements Are Checked Separately:**

- Sidebar: Direct array check in `sidebar.tsx`
- Pages: Route protection middleware
- Components: Manual `entitlements.includes()` checks

```tsx
// Combining visibility + entitlements
<Visible id="card:ai-insights">
  {entitlements.includes("ai-assistant") && <AIInsightsCard />}
</Visible>
```

**Why Separate?**

- Visibility = "Should this user type see this?"
- Entitlements = "Has this company paid for this?"
- A paušalni user shouldn't see VAT widgets even if they somehow have the `vat` entitlement.
