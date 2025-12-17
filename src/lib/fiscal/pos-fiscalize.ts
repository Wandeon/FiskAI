import { calculateZKI, validateZKIInput } from "@/lib/e-invoice/zki"
import { db } from "@/lib/db"

export interface PosFiscalInput {
  invoice: {
    id: string
    invoiceNumber: string
    issueDate: Date
    totalAmount: number
    paymentMethod: "CASH" | "CARD"
  }
  company: {
    id: string
    oib: string
    fiscalEnabled: boolean
    premisesCode: string
    deviceCode: string
  }
}

export interface PosFiscalResult {
  success: boolean
  jir?: string
  zki: string
  error?: string
}

export async function fiscalizePosSale(input: PosFiscalInput): Promise<PosFiscalResult> {
  const { invoice, company } = input

  // Calculate ZKI (always required)
  const totalInCents = Math.round(invoice.totalAmount * 100)

  const zkiInput = {
    oib: company.oib,
    dateTime: invoice.issueDate,
    invoiceNumber: invoice.invoiceNumber,
    premisesCode: company.premisesCode,
    deviceCode: company.deviceCode,
    totalAmount: totalInCents,
  }

  const validation = validateZKIInput(zkiInput)
  if (!validation.valid) {
    return {
      success: false,
      zki: "",
      error: `Nevažeći podaci: ${validation.errors.join(", ")}`,
    }
  }

  const zki = calculateZKI(zkiInput)

  // Check if real fiscalization is enabled
  if (!company.fiscalEnabled) {
    // Demo mode - return mock JIR
    return {
      success: true,
      jir: `DEMO-${Date.now()}`,
      zki,
    }
  }

  // Real fiscalization - check for active certificate
  const certificate = await db.fiscalCertificate.findFirst({
    where: {
      companyId: company.id,
      status: "ACTIVE",
    },
  })

  if (!certificate) {
    // No certificate - queue for retry, but return success with ZKI only
    await queueFiscalRetry(invoice.id)
    return {
      success: true,
      zki,
      error: "Fiskalizacija u čekanju - nema aktivnog certifikata",
    }
  }

  // TODO: Call real FINA API via existing fiscal-pipeline.ts
  // For now, return demo response
  return {
    success: true,
    jir: `DEMO-${Date.now()}`,
    zki,
  }
}

async function queueFiscalRetry(invoiceId: string): Promise<void> {
  // Update invoice to mark it needs fiscalization retry
  await db.eInvoice.update({
    where: { id: invoiceId },
    data: {
      fiscalStatus: "PENDING",
    },
  })
}
