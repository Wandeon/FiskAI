"use server"

import { requireAuth, requireCompany } from "@/lib/auth-utils"
import {
  runAutoMatchExpenses,
  getSuggestedExpenses,
  linkTransactionToExpense,
  unlinkTransactionFromExpense,
} from "@/lib/banking/expense-reconciliation-service"
import { ExpenseCandidate } from "@/lib/banking/expense-reconciliation"
import { z } from "zod"

interface ActionResult<T = unknown> {
  success: boolean
  error?: string
  data?: T
}

/**
 * Zod schema for validating UUID parameters
 */
const uuidSchema = z.string().uuid()

/**
 * Zod schema for validating optional UUID parameters
 */
const optionalUuidSchema = z.string().uuid().optional()

/**
 * Run automatic expense matching for all unmatched transactions
 */
export async function autoMatchExpenses(bankAccountId?: string): Promise<
  ActionResult<{
    matchedCount: number
    evaluated: number
  }>
> {
  try {
    const user = await requireAuth()
    const company = await requireCompany(user.id!)

    // Validate bankAccountId if provided
    if (bankAccountId !== undefined) {
      optionalUuidSchema.parse(bankAccountId)
    }

    const result = await runAutoMatchExpenses({
      companyId: company.id,
      bankAccountId,
      userId: user.id!,
    })

    return { success: true, data: result }
  } catch (error) {
    console.error("Auto-match expenses failed:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Automatsko povezivanje nije uspjelo",
    }
  }
}

/**
 * Get suggested expense matches for a transaction
 */
export async function getExpenseSuggestions(
  transactionId: string
): Promise<ActionResult<ExpenseCandidate[]>> {
  try {
    const user = await requireAuth()
    const company = await requireCompany(user.id!)

    // Validate transactionId is a valid UUID
    uuidSchema.parse(transactionId)

    const suggestions = await getSuggestedExpenses(transactionId, company.id)

    return { success: true, data: suggestions }
  } catch (error) {
    console.error("Get expense suggestions failed:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Dohvat prijedloga nije uspio",
    }
  }
}

/**
 * Manually link a transaction to an expense
 */
export async function manuallyLinkExpense(
  transactionId: string,
  expenseId: string
): Promise<ActionResult> {
  try {
    const user = await requireAuth()
    const company = await requireCompany(user.id!)

    // Validate both IDs are valid UUIDs
    uuidSchema.parse(transactionId)
    uuidSchema.parse(expenseId)

    const result = await linkTransactionToExpense(transactionId, expenseId, company.id, user.id!)

    return result
  } catch (error) {
    console.error("Manual link expense failed:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Povezivanje nije uspjelo",
    }
  }
}

/**
 * Unlink a transaction from its expense(s)
 */
export async function unlinkExpense(transactionId: string): Promise<ActionResult> {
  try {
    const user = await requireAuth()
    const company = await requireCompany(user.id!)

    // Validate transactionId is a valid UUID
    uuidSchema.parse(transactionId)

    const result = await unlinkTransactionFromExpense(transactionId, company.id)

    return result
  } catch (error) {
    console.error("Unlink expense failed:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Odspajanje nije uspjelo",
    }
  }
}
