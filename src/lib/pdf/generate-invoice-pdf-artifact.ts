import { createHash } from "crypto"
import { Prisma } from "@prisma/client"

import { db } from "@/lib/db"
import { storeArtifact } from "@/lib/artifacts/service"
import { generateInvoicePDF } from "@/lib/pdf/generate-invoice-pdf"

const Decimal = Prisma.Decimal

export const INVOICE_PDF_GENERATOR_VERSION = "invoice-pdf@1"

export async function generateInvoicePdfArtifact(params: {
  companyId: string
  invoiceId: string
  createdById?: string | null
  reason?: string | null
}) {
  const invoice = await db.eInvoice.findFirst({
    where: { id: params.invoiceId, companyId: params.companyId },
    include: {
      buyer: true,
      seller: true,
      company: true,
      lines: { orderBy: { lineNumber: "asc" } },
    },
  })

  if (!invoice) {
    throw new Error("Invoice not found")
  }

  const company = invoice.company
  const sellerData = invoice.seller || {
    name: company.name,
    oib: company.oib,
    address: company.address,
    city: company.city,
    postalCode: company.postalCode,
    country: company.country,
    email: company.email,
    phone: company.phone,
  }

  const bankAccount = invoice.bankAccount || company.iban || null

  const inputSnapshot = {
    invoice: {
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      issueDate: invoice.issueDate.toISOString(),
      dueDate: invoice.dueDate ? invoice.dueDate.toISOString() : null,
      currency: invoice.currency,
      netAmount: new Decimal(invoice.netAmount).toFixed(2),
      vatAmount: new Decimal(invoice.vatAmount).toFixed(2),
      totalAmount: new Decimal(invoice.totalAmount).toFixed(2),
      notes: invoice.notes,
      jir: invoice.jir,
      zki: invoice.zki,
      type: invoice.type,
      status: invoice.status,
      includeBarcode: invoice.includeBarcode ?? true,
    },
    seller: {
      name: sellerData.name,
      oib: sellerData.oib || company.oib,
      address: sellerData.address || company.address,
      city: sellerData.city || company.city,
      postalCode: sellerData.postalCode || company.postalCode,
      country: sellerData.country || company.country,
      email: sellerData.email || company.email,
      phone: sellerData.phone || company.phone,
      iban: company.iban,
    },
    buyer: invoice.buyer
      ? {
          name: invoice.buyer.name,
          oib: invoice.buyer.oib,
          vatNumber: invoice.buyer.vatNumber,
          address: invoice.buyer.address,
          city: invoice.buyer.city,
          postalCode: invoice.buyer.postalCode,
          country: invoice.buyer.country,
        }
      : null,
    lines: invoice.lines.map((line) => ({
      lineNumber: line.lineNumber,
      description: line.description,
      quantity: new Decimal(line.quantity).toFixed(3),
      unit: line.unit,
      unitPrice: new Decimal(line.unitPrice).toFixed(2),
      netAmount: new Decimal(line.netAmount).toFixed(2),
      vatRate: new Decimal(line.vatRate).toFixed(2),
      vatAmount: new Decimal(line.vatAmount).toFixed(2),
    })),
    bankAccount,
  }

  const inputHash = createHash("sha256").update(JSON.stringify(inputSnapshot)).digest("hex")

  const { buffer, invoiceNumber } = await generateInvoicePDF({
    invoiceId: invoice.id,
    companyId: params.companyId,
    deterministicSeed: inputHash,
  })

  const safeInvoiceNumber = invoiceNumber.replace(/\//g, "-")
  const fileName = `racun-${safeInvoiceNumber}.pdf`

  const artifact = await storeArtifact({
    companyId: params.companyId,
    type: "PDF",
    fileName,
    contentType: "application/pdf",
    data: buffer,
    createdById: params.createdById ?? null,
    reason: params.reason ?? "invoice_pdf_generate",
    generatorVersion: INVOICE_PDF_GENERATOR_VERSION,
    inputHash,
    generationMeta: {
      artifactKind: "INVOICE_PDF",
      invoiceId: invoice.id,
      invoiceNumber,
    },
  })

  return { artifact, buffer, inputHash }
}
