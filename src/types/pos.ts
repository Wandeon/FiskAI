// src/types/pos.ts
import { PaymentMethod } from "@prisma/client"

export interface PosLineItem {
  productId?: string // From product grid (optional)
  description: string // Required for all items
  quantity: number
  unitPrice: number // In EUR (not cents)
  vatRate: number // 25, 13, 5, or 0
}

export interface ProcessPosSaleInput {
  items: PosLineItem[]
  paymentMethod: "CASH" | "CARD"
  stripePaymentIntentId?: string // Required if CARD
  buyerId?: string // Optional - anonymous sale OK
}

export interface ProcessPosSaleResult {
  success: boolean
  invoice?: {
    id: string
    invoiceNumber: string
    totalAmount: number
  }
  jir?: string
  zki?: string
  pdfUrl?: string
  error?: string
}
