# Invoice Flow Security Audit

**Date:** 2026-01-08
**Auditor:** Claude AI
**Scope:** Invoice creation, sending, receiving, storage flows and multi-tenant isolation

---

## Executive Summary

This audit examines the invoice flows in FiskAI to verify correct handling of:
- Outgoing invoices (paušalni vs d.o.o.)
- Incoming invoices to subsidiaries
- Company ownership of invoices across integrations
- Potential mis-routing of invoice identifiers, provider callbacks, or webhooks between companies

**Overall Assessment:** The system has **strong tenant isolation** with multiple layers of protection. However, some areas could benefit from additional guardrails.

---

## Architecture Overview

### Invoice Model

The system uses a unified `EInvoice` model (`prisma/schema.prisma:1144`) for all invoice types:

| Field | Purpose |
|-------|---------|
| `companyId` | Tenant owner (required) |
| `direction` | `OUTBOUND` or `INBOUND` |
| `type` | `INVOICE`, `E_INVOICE`, `QUOTE`, `PROFORMA`, `CREDIT_NOTE`, `DEBIT_NOTE` |
| `providerRef` | External e-invoice provider reference |
| `integrationAccountId` | Links to IntegrationAccount for audit trail |

**Unique Constraints:**
- `@@unique([companyId, invoiceNumber])` - Prevents duplicate invoice numbers within a company

### Company Ownership Model

Users can belong to multiple companies via `CompanyUser`:
- `isDefault: true` marks the currently active company
- `switchCompany()` action (`src/lib/actions/company-switch.ts:7`) validates access before switching

---

## Tenant Isolation Analysis

### Strong Points

#### 1. AsyncLocalStorage-based Tenant Context
```typescript
// src/lib/prisma-extensions.ts:112
export function runWithTenant<T>(context: TenantContext, fn: () => T): T {
  return tenantContextStore.run(context, fn)
}
```
- Thread-safe isolation per request
- Automatic filtering on queries when context is set

#### 2. Hard Tenant Assertions on IntegrationAccount
```typescript
// src/lib/e-invoice/provider-v2.ts:138-148
if (account.companyId !== companyId) {
  throw new TenantViolationError(companyId, account.companyId, integrationAccountId)
}
```
- Immediate failure on cross-tenant access attempts
- Explicit error type for security incidents

#### 3. Permission-Gated Server Actions
```typescript
// src/lib/auth-utils.ts:211-231
export async function requireCompanyWithPermission<T>(
  userId: string,
  permission: Permission,
  fn: (company: Company, user: User) => Promise<T>
): Promise<T>
```
- All invoice operations require authentication
- RBAC permissions enforced (e.g., `invoice:create`, `invoice:delete`)

#### 4. Encrypted IntegrationAccount Secrets
- Secrets stored encrypted via `encryptSecretEnvelope()` (`src/lib/integration/vault.ts`)
- Decryption only after tenant verification passes
- Unique constraint: `@@unique([companyId, kind, environment])`

---

## Flow Analysis

### Outgoing Invoices (Paušalni vs D.O.O.)

**Finding:** No special invoice creation logic differs between legal forms.

The distinction is at:
- Tax obligation level (`company.isVatPayer`)
- Reporting (separate forms: PDV, ZP, POSD)
- Fiscal enforcement (paymentMethod-based: CASH/CARD require fiscalization)

**Flow:**
1. Create invoice via `src/app/actions/invoice.ts:createInvoice()`
2. Add lines while in DRAFT status
3. Issue via `issueInvoice()` → `PENDING_FISCALIZATION`
4. Fiscalize if `paymentMethod` is CASH/CARD and cert available → `FISCALIZED`
5. Send via `sendEInvoice()` → `SENT`

**Isolation:** ✅ All operations scoped to authenticated user's company

### Incoming Invoices to Subsidiaries

**Flow:**
1. **Poll path:** Worker polls via `pollInboundForAccount()` (`src/lib/e-invoice/poll-inbound-v2.ts:112`)
2. **API path:** POST to `/api/e-invoices/receive` (`src/app/api/e-invoices/receive/route.ts:58`)

**Isolation Mechanisms:**
- Hard tenant assertion in poll-inbound-v2.ts (lines 122-125)
- requireCompanyWithPermission() on receive API (line 61)
- Deduplication scoped to companyId (lines 88-94)

**Isolation:** ✅ Properly scoped

### Webhook/Callback Handling

| Callback Type | Company Identification | Security |
|--------------|----------------------|----------|
| Bank Sync | BankConnection lookup by `ref` | DB validates companyId |
| Email OAuth | HMAC-signed state token with `companyId` | STATE_SECRET verification |
| Stripe | Metadata or subscription/customer ID lookup | Stripe signature |
| E-Invoice Receive | Auth session context | Authentication required |
| E-Invoice Poll | IntegrationAccount tenant assertion | Hard assertion |
| Resend Email | Invoice lookup by `emailMessageId` | ⚠️ See finding below |

---

## Potential Vulnerabilities & Recommendations

### 1. Missing Unique Constraint on `providerRef` per Company

**Risk Level:** LOW

**Finding:** `providerRef` field lacks a `@@unique([companyId, providerRef])` constraint in the schema.

**Current Mitigation:** Application-level duplicate checking exists:
```typescript
// src/app/api/e-invoices/receive/route.ts:88-94
const existing = await db.eInvoice.findFirst({
  where: {
    providerRef: invoiceData.providerRef,
    companyId: company.id,
  },
})
```

**Recommendation:** Add database-level unique constraint:
```prisma
@@unique([companyId, providerRef])
```

This would prevent race conditions where two requests could simultaneously insert the same providerRef.

---

### 2. Resend Webhook Uses Global `emailMessageId` Lookup

**Risk Level:** LOW (mitigated by external uniqueness)

**Finding:** The Resend webhook handler (`src/app/api/webhooks/resend/route.ts:151-153`) looks up invoices without company scoping:
```typescript
const invoice = await db.eInvoice.findFirst({
  where: { emailMessageId: emailId },
})
```

**Mitigation:** `emailMessageId` is assigned by Resend and is globally unique within Resend's system.

**Recommendation:** For defense-in-depth, consider adding a company lookup validation after finding the invoice, or store the companyId in Resend's email metadata.

---

### 3. No Cross-Subsidiary Invoice Routing Detection

**Risk Level:** MEDIUM (business logic, not security)

**Finding:** When a user owns multiple companies (subsidiaries), there's no automated detection if:
- An incoming invoice is addressed to Subsidiary B but polled by Subsidiary A
- The buyer OIB in an incoming invoice doesn't match the receiving company's OIB

**Current Behavior:** The invoice is stored under whichever company's IntegrationAccount polled it.

**Recommendation:** Add validation to compare buyer OIB against company OIB:
```typescript
if (invoice.buyerOib && invoice.buyerOib !== company.oib) {
  logger.warn({
    invoiceOib: invoice.buyerOib,
    companyOib: company.oib
  }, "Invoice addressed to different OIB")
  // Either route to correct company or flag for review
}
```

---

### 4. Legacy Path Still Available

**Risk Level:** LOW (controlled by feature flag)

**Finding:** Legacy Company.eInvoiceApiKeyEncrypted path is still supported (`src/lib/e-invoice/send-invoice.ts:88`).

**Current Mitigation:**
- `FF_ENFORCE_INTEGRATION_ACCOUNT` feature flag can block this path
- `assertLegacyPathAllowed()` gate enforces transition

**Recommendation:** Complete migration to IntegrationAccount and enable enforcement flag in production.

---

## Positive Security Patterns

1. **Dual-path with enforcement gate** - Controlled migration from legacy to new system
2. **Hard assertions over soft failures** - `TenantViolationError` fails immediately
3. **Audit trail via integrationAccountId** - All invoice sends link back to the IntegrationAccount used
4. **HMAC-signed state tokens** - Email OAuth callbacks use cryptographic state verification
5. **Timing-safe comparisons** - Webhook signature verification uses `timingSafeEqual()`
6. **Idempotency via deduplication** - Poll and receive paths handle duplicates gracefully

---

## Conclusion

The FiskAI invoice system demonstrates **mature multi-tenant security practices**:

- ✅ Tenant context isolation via AsyncLocalStorage
- ✅ Hard tenant assertions on integration accounts
- ✅ Permission-gated server actions
- ✅ Encrypted credential storage
- ✅ Cryptographic webhook verification

**Recommended Improvements:**
1. Add `@@unique([companyId, providerRef])` database constraint
2. Add buyer OIB validation for incoming invoices (subsidiary routing)
3. Enable `FF_ENFORCE_INTEGRATION_ACCOUNT` after migration complete

No critical vulnerabilities were identified that would allow invoice mis-routing between companies owned by the same user.
