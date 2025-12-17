import Stripe from "stripe"
import { db } from "@/lib/db"

let stripeInstance: Stripe | null = null

function getStripe(): Stripe {
  if (!stripeInstance) {
    const apiKey = process.env.STRIPE_SECRET_KEY
    if (!apiKey) {
      throw new Error("STRIPE_SECRET_KEY is not configured")
    }
    stripeInstance = new Stripe(apiKey, {
      typescript: true,
    })
  }
  return stripeInstance
}

/**
 * Convert EUR amount to cents for Stripe
 */
export function formatAmountForStripe(amount: number): number {
  return Math.round(amount * 100)
}

/**
 * Validate Stripe Terminal reader ID format
 */
export function validateTerminalReaderId(readerId: string): boolean {
  return /^tmr_[a-zA-Z0-9]+$/.test(readerId)
}

/**
 * Create connection token for Terminal SDK
 * Called by frontend to authenticate with Stripe Terminal
 */
export async function createConnectionToken(companyId: string): Promise<string> {
  const stripe = getStripe()

  const company = await db.company.findUniqueOrThrow({
    where: { id: companyId },
  })

  if (!company.stripeTerminalLocationId) {
    throw new Error("Terminal location not configured")
  }

  const token = await stripe.terminal.connectionTokens.create({
    location: company.stripeTerminalLocationId,
  })

  return token.secret
}

/**
 * Create a PaymentIntent for Terminal payment
 */
export async function createTerminalPaymentIntent(input: {
  amount: number // In EUR
  companyId: string
  invoiceRef?: string
}): Promise<{ clientSecret: string; paymentIntentId: string }> {
  const stripe = getStripe()

  const paymentIntent = await stripe.paymentIntents.create({
    amount: formatAmountForStripe(input.amount),
    currency: "eur",
    payment_method_types: ["card_present"],
    capture_method: "automatic",
    metadata: {
      companyId: input.companyId,
      invoiceRef: input.invoiceRef || "",
    },
  })

  return {
    clientSecret: paymentIntent.client_secret!,
    paymentIntentId: paymentIntent.id,
  }
}

/**
 * Process payment on a specific reader
 */
export async function processPaymentOnReader(input: {
  readerId: string
  paymentIntentId: string
}): Promise<{ success: boolean; error?: string }> {
  const stripe = getStripe()

  try {
    const reader = await stripe.terminal.readers.processPaymentIntent(input.readerId, {
      payment_intent: input.paymentIntentId,
    })

    if (reader.action?.status === "failed") {
      return {
        success: false,
        error: reader.action.failure_message || "Payment failed",
      }
    }

    return { success: true }
  } catch (error) {
    console.error("Terminal payment failed:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

/**
 * Cancel a payment on reader
 */
export async function cancelReaderPayment(readerId: string): Promise<void> {
  const stripe = getStripe()
  await stripe.terminal.readers.cancelAction(readerId)
}

/**
 * Get reader status
 */
export async function getReaderStatus(readerId: string): Promise<{
  online: boolean
  label: string
  status: string
}> {
  const stripe = getStripe()

  try {
    const reader = await stripe.terminal.readers.retrieve(readerId)
    return {
      online: reader.status === "online",
      label: reader.label || readerId,
      status: reader.status || "unknown",
    }
  } catch {
    return {
      online: false,
      label: readerId,
      status: "error",
    }
  }
}
