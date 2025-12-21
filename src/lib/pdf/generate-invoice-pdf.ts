import { db } from "@/lib/db"
import { renderToBuffer } from "@react-pdf/renderer"
import { InvoicePDFDocument } from "@/lib/pdf/invoice-template"
import { generateInvoiceBarcodeDataUrl } from "@/lib/barcode"
import { generateFiscalQRCode } from "@/lib/fiscal/qr-generator"

export interface GenerateInvoicePDFOptions {
  invoiceId: string
  companyId: string
}

export interface GenerateInvoicePDFResult {
  buffer: Buffer
  invoiceNumber: string
}

/**
 * Generate PDF buffer for an invoice.
 * Shared between API route and server actions to avoid loopback HTTP calls.
 */
export async function generateInvoicePDF({
  invoiceId,
  companyId,
}: GenerateInvoicePDFOptions): Promise<GenerateInvoicePDFResult> {
  // Fetch invoice with all related data
  const invoice = await db.eInvoice.findFirst({
    where: {
      id: invoiceId,
      companyId,
    },
    include: {
      buyer: true,
      seller: true,
      company: true,
      lines: {
        orderBy: { lineNumber: "asc" },
      },
    },
  })

  if (!invoice) {
    throw new Error("Invoice not found")
  }

  const company = invoice.company

  // Use company as seller if seller contact is not set
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

  const bankAccount = invoice.bankAccount || company.iban || undefined

  // Prepare data for PDF template
  const pdfData = {
    invoice: {
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      issueDate: invoice.issueDate,
      dueDate: invoice.dueDate,
      currency: invoice.currency,
      netAmount: Number(invoice.netAmount),
      vatAmount: Number(invoice.vatAmount),
      totalAmount: Number(invoice.totalAmount),
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
          address: invoice.buyer.address,
          city: invoice.buyer.city,
          postalCode: invoice.buyer.postalCode,
          country: invoice.buyer.country,
        }
      : null,
    lines: invoice.lines.map((line) => ({
      lineNumber: line.lineNumber,
      description: line.description,
      quantity: Number(line.quantity),
      unit: line.unit,
      unitPrice: Number(line.unitPrice),
      netAmount: Number(line.netAmount),
      vatRate: Number(line.vatRate),
      vatAmount: Number(line.vatAmount),
    })),
    bankAccount,
  }

  let barcodeDataUrl: string | null = null
  if (pdfData.invoice.includeBarcode && bankAccount) {
    barcodeDataUrl = await generateInvoiceBarcodeDataUrl({
      creditorName: pdfData.seller.name,
      creditorIban: bankAccount,
      amount: pdfData.invoice.totalAmount,
      currency: pdfData.invoice.currency,
      invoiceNumber: pdfData.invoice.invoiceNumber,
      dueDate: pdfData.invoice.dueDate || undefined,
      reference: pdfData.invoice.invoiceNumber,
    })
  }

  // Generate fiscal QR code if invoice is fiscalized
  let fiscalQRDataUrl: string | null = null
  if (pdfData.invoice.jir && pdfData.invoice.zki) {
    fiscalQRDataUrl = await generateFiscalQRCode({
      jir: pdfData.invoice.jir,
      zki: pdfData.invoice.zki,
      invoiceNumber: pdfData.invoice.invoiceNumber,
      issuerOib: pdfData.seller.oib,
      amount: pdfData.invoice.totalAmount,
      dateTime: pdfData.invoice.issueDate,
    })
  }

  // Generate PDF
  const doc = InvoicePDFDocument({ ...pdfData, barcodeDataUrl, fiscalQRDataUrl })
  const pdfBuffer = await renderToBuffer(doc)

  return {
    buffer: Buffer.from(pdfBuffer),
    invoiceNumber: invoice.invoiceNumber,
  }
}
