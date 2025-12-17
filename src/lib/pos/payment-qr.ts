// src/lib/pos/payment-qr.ts
import { generateHub3DataUrl, type Hub3Data } from "@/lib/knowledge-hub/hub3"

export interface PosPaymentQRInput {
  sellerName: string
  sellerAddress: string
  sellerCity: string
  sellerIban: string
  invoiceNumber: string
  amount: number
  buyerName?: string
  buyerAddress?: string
  buyerCity?: string
}

/**
 * Generate HUB-3 payment QR code for POS receipt
 * Croatian bank apps can scan this to initiate payment
 */
export async function generatePosPaymentQR(input: PosPaymentQRInput): Promise<string> {
  const hub3Data: Hub3Data = {
    amount: input.amount,
    payerName: input.buyerName || "Kupac",
    payerAddress: input.buyerAddress || "",
    payerCity: input.buyerCity || "",
    recipientName: input.sellerName.slice(0, 25),
    recipientAddress: input.sellerAddress.slice(0, 25),
    recipientCity: input.sellerCity.slice(0, 27),
    recipientIBAN: input.sellerIban.replace(/\s+/g, ""),
    model: "HR00",
    reference: input.invoiceNumber.replace(/[^0-9-]/g, "").slice(0, 22),
    description: `Račun ${input.invoiceNumber}`.slice(0, 35),
    currency: "EUR",
  }

  return generateHub3DataUrl(hub3Data)
}
