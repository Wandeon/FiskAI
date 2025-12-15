// src/lib/fiscal/should-fiscalize.ts
import { db } from '@/lib/db'
import { EInvoice, Company, PaymentMethod } from '@prisma/client'

export interface FiscalDecision {
  shouldFiscalize: boolean
  reason: string
  certificateId?: string
  environment?: 'TEST' | 'PROD'
}

// Payment methods that require fiscalization per Croatian law
const FISCALIZABLE_PAYMENT_METHODS: PaymentMethod[] = ['CASH', 'CARD']

export async function shouldFiscalizeInvoice(
  invoice: EInvoice & { company: Company }
): Promise<FiscalDecision> {
  const { company } = invoice

  // 1. Check if company has fiscalisation enabled
  if (!company.fiscalEnabled) {
    return { shouldFiscalize: false, reason: 'Fiscalisation disabled for company' }
  }

  // 2. Check payment method - only cash-equivalent needs fiscalisation
  // If paymentMethod is not set, skip fiscalization (cannot fiscalize without knowing payment method)
  if (!invoice.paymentMethod) {
    return { shouldFiscalize: false, reason: 'Payment method not specified' }
  }

  if (!FISCALIZABLE_PAYMENT_METHODS.includes(invoice.paymentMethod)) {
    return { shouldFiscalize: false, reason: 'Non-cash payment method' }
  }

  // 3. Check if already fiscalized
  if (invoice.jir) {
    return { shouldFiscalize: false, reason: 'Already fiscalized' }
  }

  // 4. Check for existing pending request (idempotency)
  const existingRequest = await db.fiscalRequest.findFirst({
    where: {
      invoiceId: invoice.id,
      messageType: 'RACUN',
      status: { in: ['QUEUED', 'PROCESSING'] }
    }
  })

  if (existingRequest) {
    return { shouldFiscalize: false, reason: 'Request already queued' }
  }

  // 5. Determine environment and find certificate
  const environment = company.fiscalEnvironment || 'PROD'

  const certificate = await db.fiscalCertificate.findUnique({
    where: {
      companyId_environment: {
        companyId: company.id,
        environment
      }
    }
  })

  if (!certificate) {
    return {
      shouldFiscalize: false,
      reason: `No ${environment} certificate configured`
    }
  }

  if (certificate.status !== 'ACTIVE') {
    return {
      shouldFiscalize: false,
      reason: `Certificate status: ${certificate.status}`
    }
  }

  if (certificate.certNotAfter < new Date()) {
    return {
      shouldFiscalize: false,
      reason: 'Certificate expired'
    }
  }

  return {
    shouldFiscalize: true,
    reason: 'Meets fiscalisation criteria',
    certificateId: certificate.id,
    environment
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
        messageType: 'RACUN'
      }
    },
    create: {
      companyId,
      invoiceId,
      certificateId: decision.certificateId,
      messageType: 'RACUN',
      status: 'QUEUED',
      attemptCount: 0,
      maxAttempts: 5,
      nextRetryAt: new Date()
    },
    update: {
      status: 'QUEUED',
      attemptCount: 0,
      nextRetryAt: new Date(),
      errorCode: null,
      errorMessage: null
    }
  })

  return request.id
}
