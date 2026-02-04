import { EInvoice, EInvoiceLine, Contact, Company } from "@prisma/client"

export interface EInvoiceWithRelations extends EInvoice {
  lines: EInvoiceLine[]
  buyer: Contact | null
  seller: Contact | null
  company: Company
}

export interface SendInvoiceResult {
  success: boolean
  providerRef?: string
  jir?: string
  zki?: string
  error?: string
}

export interface IncomingInvoice {
  providerRef: string
  sellerOib: string
  sellerName: string
  invoiceNumber: string
  issueDate: Date
  totalAmount: number
  currency: string
  ublXml: string
}

export interface InvoiceStatusResult {
  status: "pending" | "delivered" | "accepted" | "rejected" | "error"
  message?: string
  updatedAt: Date
}

export interface ArchiveResult {
  success: boolean
  archiveRef?: string
  error?: string
}

export interface ProviderConfig {
  apiKey: string
  apiUrl?: string
  sandbox?: boolean
}
