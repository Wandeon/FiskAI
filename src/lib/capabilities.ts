import type { Company } from "@prisma/client"

export type LegalForm = "OBRT_PAUSAL" | "OBRT_REAL" | "OBRT_VAT" | "JDOO" | "DOO"
export type ModuleKey = "invoicing" | "eInvoicing" | "expenses" | "banking" | "reports" | "settings"

export interface Capabilities {
  legalForm: LegalForm
  isVatPayer: boolean
  entitlements: ModuleKey[]
  featureFlags: Record<string, boolean>
  modules: Record<ModuleKey, { enabled: boolean; reason?: string }>
  visibility: {
    requireVatFields: boolean
    allowReverseCharge: boolean
    requireOib: boolean
  }
}

// Partial company type for deriveCapabilities - only needs fields we actually use
type PartialCompany = Pick<Company, 'isVatPayer'> & {
  legalForm?: string | null
  entitlements?: unknown
  featureFlags?: unknown
}

const defaultEntitlements: ModuleKey[] = ["invoicing", "eInvoicing", "expenses", "banking", "reports", "settings"]

export function deriveCapabilities(company: PartialCompany | null): Capabilities {
  const legalForm = (company?.legalForm as LegalForm) || "DOO"
  const entitlements = (company?.entitlements as ModuleKey[]) || defaultEntitlements
  const featureFlags = (company?.featureFlags as Record<string, boolean>) || {}
  const isVatPayer = !!company?.isVatPayer

  const modules: Record<ModuleKey, { enabled: boolean; reason?: string }> = {
    invoicing: { enabled: entitlements.includes("invoicing") },
    eInvoicing: { enabled: entitlements.includes("eInvoicing") },
    expenses: { enabled: entitlements.includes("expenses") },
    banking: { enabled: entitlements.includes("banking") },
    reports: { enabled: entitlements.includes("reports") },
    settings: { enabled: entitlements.includes("settings") },
  }

  const requireVatFields = isVatPayer || legalForm === "OBRT_VAT" || legalForm === "DOO" || legalForm === "JDOO"
  const allowReverseCharge = isVatPayer
  const requireOib = legalForm === "DOO" || legalForm === "JDOO"

  return {
    legalForm,
    isVatPayer,
    entitlements,
    featureFlags,
    modules,
    visibility: {
      requireVatFields,
      allowReverseCharge,
      requireOib,
    },
  }
}
