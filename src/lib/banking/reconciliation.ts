import { EInvoice, EInvoiceLine } from "@prisma/client"
import { ParsedTransaction } from "./csv-parser"

export interface ReconciliationResult {
  transactionId: string
  matchedInvoiceId: string | null
  matchStatus: "matched" | "partial" | "unmatched" | "ambiguous"
  confidenceScore: number
  reason: string
}

export function matchTransactionsToInvoices(
  transactions: (ParsedTransaction & { id: string })[],
  invoices: (EInvoice & { lines: EInvoiceLine[] })[]
): ReconciliationResult[] {
  return transactions.map((transaction) => {
    const invoiceMatches = invoices.map((invoice) => ({
      invoiceId: invoice.id,
      score: calculateMatchScore(transaction, invoice),
    }))

    invoiceMatches.sort((a, b) => b.score - a.score)
    const topMatch = invoiceMatches[0]
    const secondMatch = invoiceMatches[1]

    if (topMatch && secondMatch && topMatch.score > 0 && secondMatch.score === topMatch.score) {
      return {
        transactionId: transaction.id,
        matchedInvoiceId: null,
        matchStatus: "ambiguous",
        confidenceScore: topMatch.score,
        reason: "Multiple invoices match with the same score",
      }
    }

    if (topMatch && topMatch.score >= 70) {
      return {
        transactionId: transaction.id,
        matchedInvoiceId: topMatch.invoiceId,
        matchStatus: topMatch.score >= 85 ? "matched" : "partial",
        confidenceScore: topMatch.score,
        reason: getScoreReason(topMatch.score),
      }
    }

    return {
      transactionId: transaction.id,
      matchedInvoiceId: null,
      matchStatus: "unmatched",
      confidenceScore: 0,
      reason: "No matching invoice found",
    }
  })
}

function calculateMatchScore(transaction: ParsedTransaction, invoice: EInvoice): number {
  const invoiceNumber = invoice.invoiceNumber || ""
  const reference = transaction.reference || ""

  if (reference && (invoiceNumber.includes(reference) || reference.includes(invoiceNumber))) {
    return 100
  }

  const invoiceAmount = Number(invoice.totalAmount || invoice.netAmount || 0)
  const delta = Math.abs(invoiceAmount - transaction.amount)
  const dateDiffDays = daysDiff(transaction.date, invoice.issueDate)

  if (delta < 1 && dateDiffDays <= 3) {
    return 85
  }

  if (invoiceAmount > 0) {
    const pct = delta / invoiceAmount
    if (pct <= 0.05 && dateDiffDays <= 5) {
      return 70
    }
  }

  return 0
}

function daysDiff(a: Date, b: Date) {
  const ms = Math.abs(new Date(a).getTime() - new Date(b).getTime())
  return Math.floor(ms / (1000 * 60 * 60 * 24))
}

function getScoreReason(score: number) {
  if (score >= 100) return "Invoice number found in transaction reference"
  if (score >= 85) return "Exact amount match and date close to invoice"
  if (score >= 70) return "Amount within tolerance and date close"
  return "Low confidence"
}
