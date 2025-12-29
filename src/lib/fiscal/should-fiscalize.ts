// src/lib/fiscal/should-fiscalize.ts
import { db } from "@/lib/db"
import { EInvoice, Company, PaymentMethod, Contact } from "@prisma/client"

export interface FiscalDecision {
  shouldFiscalize: boolean
  reason: string
  certificateId?: string
  environment?: "TEST" | "PROD"
}

// Payment methods that require fiscalization per Croatian law (current rules)
const CASH_EQUIVALENT_PAYMENT_METHODS: PaymentMethod[] = ["CASH", "CARD"]

// 2026 Fiskalizacija 2.0 transition date (mandatory B2C bank transfer fiscalization)
const FISKALIZACIJA_2_EFFECTIVE_DATE = new Date("2026-01-01T00:00:00.000Z")

/**
 * Determines if an invoice requires fiscalization based on Croatian law.
 *
 * Current rules (until 2025-12-31):
 * - Only CASH and CARD payments require fiscalization
 *
 * 2026 rules (Fiskalizacija 2.0, from 2026-01-01):
 * - CASH and CARD payments still require fiscalization
 * - B2C bank transfers (TRANSFER to buyers without OIB) also require fiscalization
 * - B2B bank transfers remain exempt (buyer has valid Croatian OIB)
 *
 * @see https://www.porezna-uprava.hr/HR_Fiskalizacija/
 */
function requiresFiscalization(
  paymentMethod: PaymentMethod,
  buyerOib: string | null | undefined,
  invoiceDate: Date
): { required: boolean; reason: string } {
  // Cash-equivalent payments always require fiscalization
  if (CASH_EQUIVALENT_PAYMENT_METHODS.includes(paymentMethod)) {
    return { required: true, reason: "Cash-equivalent payment method" }
  }

  // For non-cash payments, check 2026 rules
  if (paymentMethod === "TRANSFER") {
    const is2026RulesActive = invoiceDate >= FISKALIZACIJA_2_EFFECTIVE_DATE

    if (is2026RulesActive) {
      // B2C detection: buyer has no OIB or invalid OIB (not 11 digits)
      const isB2C = !buyerOib || buyerOib.length !== 11
      if (isB2C) {
        return {
          required: true,
          reason: "B2C bank transfer (2026 Fiskalizacija 2.0 rules)",
        }
      }
      return {
        required: false,
        reason: "B2B bank transfer exempt from fiscalization",
      }
    }

    return { required: false, reason: "Bank transfer exempt (pre-2026 rules)" }
  }

  // OTHER payment methods - not fiscalized
  return { required: false, reason: "Non-fiscalizable payment method" }
}

export async function shouldFiscalizeInvoice(
  invoice: EInvoice & { company: Company; buyer?: Contact | null }
): Promise<FiscalDecision> {
  const { company } = invoice

  // 1. Check if company has fiscalisation enabled
  if (!company.fiscalEnabled) {
    return { shouldFiscalize: false, reason: "Fiscalisation disabled for company" }
  }

  // 2. Check payment method
  if (!invoice.paymentMethod) {
    return { shouldFiscalize: false, reason: "Payment method not specified" }
  }

  // 3. Determine if fiscalization is required based on payment method and buyer type
  const buyerOib = invoice.buyer?.oib
  const fiscalCheck = requiresFiscalization(
    invoice.paymentMethod,
    buyerOib,
    invoice.issueDate
  )

  if (!fiscalCheck.required) {
    return { shouldFiscalize: false, reason: fiscalCheck.reason }
  }

  // 3. Check if already fiscalized
  if (invoice.jir) {
    return { shouldFiscalize: false, reason: "Already fiscalized" }
  }

  // 4. Check for existing pending request (idempotency)
  const existingRequest = await db.fiscalRequest.findFirst({
    where: {
      invoiceId: invoice.id,
      messageType: "RACUN",
      status: { in: ["QUEUED", "PROCESSING"] },
    },
  })

  if (existingRequest) {
    return { shouldFiscalize: false, reason: "Request already queued" }
  }

  // 5. Determine environment and find certificate
  const environment = company.fiscalEnvironment || "PROD"

  const certificate = await db.fiscalCertificate.findUnique({
    where: {
      companyId_environment: {
        companyId: company.id,
        environment,
      },
    },
  })

  if (!certificate) {
    return {
      shouldFiscalize: false,
      reason: `No ${environment} certificate configured`,
    }
  }

  if (certificate.status !== "ACTIVE") {
    return {
      shouldFiscalize: false,
      reason: `Certificate status: ${certificate.status}`,
    }
  }

  if (certificate.certNotAfter < new Date()) {
    return {
      shouldFiscalize: false,
      reason: "Certificate expired",
    }
  }

  return {
    shouldFiscalize: true,
    reason: "Meets fiscalisation criteria",
    certificateId: certificate.id,
    environment,
  }
}

export async function queueFiscalRequest(
  invoiceId: string,
  companyId: string,
  decision: FiscalDecision
): Promise<string | null> {
  if (!decision.shouldFiscalize || !decision.certificateId) {
    return null
  }

  const request = await db.fiscalRequest.upsert({
    where: {
      companyId_invoiceId_messageType: {
        companyId,
        invoiceId,
        messageType: "RACUN",
      },
    },
    create: {
      companyId,
      invoiceId,
      certificateId: decision.certificateId,
      messageType: "RACUN",
      status: "QUEUED",
      attemptCount: 0,
      maxAttempts: 5,
      nextRetryAt: new Date(),
    },
    update: {
      status: "QUEUED",
      attemptCount: 0,
      nextRetryAt: new Date(),
      errorCode: null,
      errorMessage: null,
    },
  })

  return request.id
}

// Export for testing and reuse
export {
  requiresFiscalization,
  FISKALIZACIJA_2_EFFECTIVE_DATE,
  CASH_EQUIVALENT_PAYMENT_METHODS,
}
