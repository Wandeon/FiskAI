"use server"

import { z } from "zod"
import { db, runWithTenant } from "@/lib/db"
import { requireAuth, requireCompany } from "@/lib/auth-utils"
import { revalidatePath } from "next/cache"
import { MatchKind, MatchSource, MatchStatus, Prisma, ImportFormat } from "@prisma/client"
import { createHash } from "crypto"
import { logAudit } from "@/lib/audit"
import { runAutoMatchTransactions } from "@/lib/banking/reconciliation-service"

const Decimal = Prisma.Decimal

interface ActionResult<T = unknown> {
  success: boolean
  error?: string
  data?: T
}

// Zod schemas for validation
const createBankAccountSchema = z.object({
  name: z.string().min(1, "Naziv je obavezan"),
  iban: z.string().min(1, "IBAN je obavezan"),
  bankName: z.string().min(1, "Naziv banke je obavezan"),
  currency: z.string().optional(),
  currentBalance: z.number().optional(),
})

const updateBankAccountSchema = z.object({
  name: z.string().min(1).optional(),
  bankName: z.string().min(1).optional(),
  isDefault: z.boolean().optional(),
})

const importTransactionSchema = z.object({
  date: z.coerce.date(),
  description: z.string().min(1),
  amount: z.number(),
  balance: z.number(),
  reference: z.string().optional(),
  counterpartyName: z.string().optional(),
  counterpartyIban: z.string().optional(),
})

const importBankStatementSchema = z.object({
  bankAccountId: z.string().uuid(),
  format: z.nativeEnum(ImportFormat),
  transactions: z.array(importTransactionSchema).min(1, "Nema transakcija za uvoz"),
})

const matchTransactionSchema = z.object({
  transactionId: z.string().uuid(),
  type: z.enum(["invoice", "expense"]),
  matchId: z.string().uuid(),
})

const uuidSchema = z.string().uuid()

/**
 * Validate Croatian IBAN format
 * Croatian IBANs start with HR and have 21 characters total
 */
function validateIBAN(iban: string): boolean {
  const cleanIban = iban.replace(/\s/g, "").toUpperCase()
  return /^HR\d{19}$/.test(cleanIban)
}

/**
 * Create a new bank account
 */
export async function createBankAccount(input: unknown): Promise<ActionResult<{ id: string }>> {
  try {
    const validated = createBankAccountSchema.safeParse(input)
    if (!validated.success) {
      return { success: false, error: validated.error.issues[0]?.message || "Neispravni podaci" }
    }
    const data = validated.data

    const user = await requireAuth()
    const company = await requireCompany(user.id!)

    return runWithTenant({ companyId: company.id, userId: user.id! }, async () => {
      // Validate IBAN format
      const cleanIban = data.iban.replace(/\s/g, "").toUpperCase()
      if (!validateIBAN(cleanIban)) {
        return {
          success: false,
          error: "Neispravan IBAN format. Hrvatski IBAN mora počinjati s HR i imati 21 znak.",
        }
      }

      // Check if IBAN already exists for this company
      const existing = await db.bankAccount.findFirst({
        where: {
          companyId: company.id,
          iban: cleanIban,
        },
      })

      if (existing) {
        return { success: false, error: "Račun s ovim IBAN-om već postoji" }
      }

      const bankAccount = await db.bankAccount.create({
        data: {
          companyId: company.id,
          name: data.name,
          iban: cleanIban,
          bankName: data.bankName,
          currency: data.currency || "EUR",
          currentBalance: new Decimal(data.currentBalance || 0),
          isDefault: false,
        },
      })

      revalidatePath("/banking")
      return { success: true, data: { id: bankAccount.id } }
    })
  } catch (error) {
    console.error("Failed to create bank account:", error)
    return { success: false, error: "Greška pri kreiranju bankovnog računa" }
  }
}

/**
 * Update bank account details
 */
export async function updateBankAccount(id: unknown, input: unknown): Promise<ActionResult> {
  try {
    const idResult = uuidSchema.safeParse(id)
    if (!idResult.success) {
      return { success: false, error: "Nevažeći ID računa" }
    }
    const validatedId = idResult.data

    const validated = updateBankAccountSchema.safeParse(input)
    if (!validated.success) {
      return { success: false, error: validated.error.issues[0]?.message || "Neispravni podaci" }
    }
    const data = validated.data

    const user = await requireAuth()
    const company = await requireCompany(user.id!)

    return runWithTenant({ companyId: company.id, userId: user.id! }, async () => {
      // Verify account exists and belongs to company
      const existing = await db.bankAccount.findFirst({
        where: { id: validatedId, companyId: company.id },
      })

      if (!existing) {
        return { success: false, error: "Bankovni račun nije pronađen" }
      }

      // If setting as default, unset other defaults
      if (data.isDefault === true) {
        await db.bankAccount.updateMany({
          where: {
            companyId: company.id,
            id: { not: validatedId },
          },
          data: { isDefault: false },
        })
      }

      const updateData: Prisma.BankAccountUpdateInput = {}
      if (data.name !== undefined) updateData.name = data.name
      if (data.bankName !== undefined) updateData.bankName = data.bankName
      if (data.isDefault !== undefined) updateData.isDefault = data.isDefault

      await db.bankAccount.update({
        where: { id: validatedId },
        data: updateData,
      })

      revalidatePath("/banking")
      revalidatePath(`/banking/${validatedId}`)
      return { success: true }
    })
  } catch (error) {
    console.error("Failed to update bank account:", error)
    return { success: false, error: "Greška pri ažuriranju bankovnog računa" }
  }
}

/**
 * Delete a bank account (only if no transactions linked)
 */
export async function deleteBankAccount(id: unknown): Promise<ActionResult> {
  try {
    const idResult = uuidSchema.safeParse(id)
    if (!idResult.success) {
      return { success: false, error: "Nevažeći ID računa" }
    }
    const validatedId = idResult.data

    const user = await requireAuth()
    const company = await requireCompany(user.id!)

    return runWithTenant({ companyId: company.id, userId: user.id! }, async () => {
      // Verify account exists and belongs to company
      const account = await db.bankAccount.findFirst({
        where: { id: validatedId, companyId: company.id },
      })

      if (!account) {
        return { success: false, error: "Bankovni račun nije pronađen" }
      }

      // Check for linked transactions
      const transactionCount = await db.bankTransaction.count({
        where: { bankAccountId: validatedId },
      })

      if (transactionCount > 0) {
        return {
          success: false,
          error: `Nije moguće obrisati račun koji ima ${transactionCount} transakcija`,
        }
      }

      await db.bankAccount.delete({ where: { id: validatedId } })

      revalidatePath("/banking")
      return { success: true }
    })
  } catch (error) {
    console.error("Failed to delete bank account:", error)
    return { success: false, error: "Greška pri brisanju bankovnog računa" }
  }
}

/**
 * Import bank statement transactions
 */
export async function importBankStatement(
  bankAccountId: unknown,
  format: unknown,
  transactions: unknown
): Promise<ActionResult<{ count: number }>> {
  try {
    const validated = importBankStatementSchema.safeParse({
      bankAccountId,
      format,
      transactions,
    })
    if (!validated.success) {
      return { success: false, error: validated.error.issues[0]?.message || "Neispravni podaci" }
    }
    const { bankAccountId: validatedBankAccountId, transactions: validatedTransactions } =
      validated.data

    const user = await requireAuth()
    const company = await requireCompany(user.id!)

    return runWithTenant({ companyId: company.id, userId: user.id! }, async () => {
      // Verify bank account exists and belongs to company
      const bankAccount = await db.bankAccount.findFirst({
        where: { id: validatedBankAccountId, companyId: company.id },
      })

      if (!bankAccount) {
        return { success: false, error: "Bankovni račun nije pronađen" }
      }

      // Create import record and transactions in a transaction
      const result = await db.$transaction(async (tx) => {
        const checksumPayload = JSON.stringify({
          bankAccountId: validatedBankAccountId,
          format: validated.data.format,
          transactions: validatedTransactions.map((txn) => ({
            date: txn.date.toISOString(),
            description: txn.description,
            amount: txn.amount,
            balance: txn.balance,
            reference: txn.reference ?? null,
            counterpartyName: txn.counterpartyName ?? null,
            counterpartyIban: txn.counterpartyIban ?? null,
          })),
        })
        const checksum = createHash("sha256").update(checksumPayload).digest("hex")

        const existingImport = await tx.statementImport.findFirst({
          where: { bankAccountId: validatedBankAccountId, fileChecksum: checksum },
        })
        if (existingImport) {
          return { importId: existingImport.id, count: 0, deduplicated: true }
        }

        const statementImport = await tx.statementImport.create({
          data: {
            companyId: company.id,
            bankAccountId: validatedBankAccountId,
            fileName: `import-${new Date().toISOString()}.${validated.data.format.toLowerCase()}`,
            fileChecksum: checksum,
            format: validated.data.format,
            transactionCount: validatedTransactions.length,
            importedBy: user.id!,
            metadata: {
              source: "manual_csv",
            },
          },
        })

        // Create transactions
        let importedCount = 0
        for (const txn of validatedTransactions) {
          // Check if transaction already exists (by date, amount, and reference)
          const existing = await tx.bankTransaction.findFirst({
            where: {
              bankAccountId: validatedBankAccountId,
              date: txn.date,
              amount: new Decimal(txn.amount),
              reference: txn.reference || null,
            },
          })

          // Skip duplicates
          if (existing) continue

          await tx.bankTransaction.create({
            data: {
              companyId: company.id,
              bankAccountId: validatedBankAccountId,
              statementImportId: statementImport.id,
              date: txn.date,
              description: txn.description,
              amount: new Decimal(txn.amount),
              balance: new Decimal(txn.balance),
              reference: txn.reference || null,
              counterpartyName: txn.counterpartyName || null,
              counterpartyIban: txn.counterpartyIban || null,
              matchStatus: "UNMATCHED",
            },
          })
          importedCount++
        }

        // Update bank account balance with the latest transaction balance
        if (validatedTransactions.length > 0) {
          const latestTransaction = validatedTransactions.reduce((latest, txn) =>
            txn.date > latest.date ? txn : latest
          )
          await tx.bankAccount.update({
            where: { id: validatedBankAccountId },
            data: {
              currentBalance: new Decimal(latestTransaction.balance),
              lastSyncAt: new Date(),
            },
          })
        }

        return { importId: statementImport.id, count: importedCount, deduplicated: false }
      })

      revalidatePath("/banking")
      revalidatePath(`/banking/${validatedBankAccountId}`)
      return { success: true, data: { count: result.count } }
    })
  } catch (error) {
    console.error("Failed to import bank statement:", error)
    return { success: false, error: "Greška pri uvozu bankovnog izvoda" }
  }
}

/**
 * Manually match a transaction to an invoice or expense
 */
export async function matchTransaction(
  transactionId: unknown,
  type: unknown,
  matchId: unknown
): Promise<ActionResult> {
  try {
    const validated = matchTransactionSchema.safeParse({ transactionId, type, matchId })
    if (!validated.success) {
      return { success: false, error: validated.error.issues[0]?.message || "Neispravni podaci" }
    }
    const {
      transactionId: validatedTransactionId,
      type: validatedType,
      matchId: validatedMatchId,
    } = validated.data

    const user = await requireAuth()
    const company = await requireCompany(user.id!)

    return runWithTenant({ companyId: company.id, userId: user.id! }, async () => {
      // Verify transaction exists and belongs to company
      const transaction = await db.bankTransaction.findFirst({
        where: { id: validatedTransactionId, companyId: company.id },
        include: {
          matchRecords: {
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      })

      if (!transaction) {
        return { success: false, error: "Transakcija nije pronađena" }
      }

      const latestMatch = transaction.matchRecords[0]
      if (
        latestMatch &&
        latestMatch.matchStatus !== MatchStatus.UNMATCHED &&
        latestMatch.matchStatus !== MatchStatus.IGNORED
      ) {
        return { success: false, error: "Transakcija je već povezana" }
      }

      // Verify the match entity exists
      if (validatedType === "invoice") {
        const invoice = await db.eInvoice.findFirst({
          where: { id: validatedMatchId, companyId: company.id },
        })
        if (!invoice) {
          return { success: false, error: "Račun nije pronađen" }
        }
      } else if (validatedType === "expense") {
        const expense = await db.expense.findFirst({
          where: { id: validatedMatchId, companyId: company.id },
        })
        if (!expense) {
          return { success: false, error: "Trošak nije pronađen" }
        }
      }

      // Update transaction with match
      await db.matchRecord.create({
        data: {
          companyId: company.id,
          bankTransactionId: validatedTransactionId,
          matchStatus: MatchStatus.MANUAL_MATCHED,
          matchKind: validatedType === "invoice" ? MatchKind.INVOICE : MatchKind.EXPENSE,
          matchedInvoiceId: validatedType === "invoice" ? validatedMatchId : undefined,
          matchedExpenseId: validatedType === "expense" ? validatedMatchId : undefined,
          confidenceScore: 100,
          reason: "Manual match",
          source: MatchSource.MANUAL,
          createdBy: user.id!,
        },
      })

      const beforeMatch = latestMatch
        ? {
            matchStatus: latestMatch.matchStatus,
            matchKind: latestMatch.matchKind,
            matchedInvoiceId: latestMatch.matchedInvoiceId,
            matchedExpenseId: latestMatch.matchedExpenseId,
          }
        : { matchStatus: MatchStatus.UNMATCHED }

      await logAudit({
        companyId: company.id,
        userId: user.id!,
        action: "UPDATE",
        entity: "BankTransaction",
        entityId: validatedTransactionId,
        reason: validatedType === "invoice" ? "bank_match_invoice" : "bank_match_expense",
        changes: {
          before: beforeMatch,
          after: {
            matchStatus: MatchStatus.MANUAL_MATCHED,
            matchKind: validatedType === "invoice" ? MatchKind.INVOICE : MatchKind.EXPENSE,
            matchedInvoiceId: validatedType === "invoice" ? validatedMatchId : null,
            matchedExpenseId: validatedType === "expense" ? validatedMatchId : null,
          },
        },
      })

      revalidatePath("/banking")
      revalidatePath(`/banking/transactions/${validatedTransactionId}`)
      return { success: true }
    })
  } catch (error) {
    console.error("Failed to match transaction:", error)
    return { success: false, error: "Greška pri povezivanju transakcije" }
  }
}

/**
 * Remove match from a transaction
 */
export async function unmatchTransaction(transactionId: unknown): Promise<ActionResult> {
  try {
    const idResult = uuidSchema.safeParse(transactionId)
    if (!idResult.success) {
      return { success: false, error: "Nevažeći ID transakcije" }
    }
    const validatedTransactionId = idResult.data

    const user = await requireAuth()
    const company = await requireCompany(user.id!)

    return runWithTenant({ companyId: company.id, userId: user.id! }, async () => {
      // Verify transaction exists and belongs to company
      const transaction = await db.bankTransaction.findFirst({
        where: { id: validatedTransactionId, companyId: company.id },
        include: {
          matchRecords: {
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      })

      if (!transaction) {
        return { success: false, error: "Transakcija nije pronađena" }
      }

      const latestMatch = transaction.matchRecords[0]
      if (!latestMatch || latestMatch.matchStatus === MatchStatus.UNMATCHED) {
        return { success: false, error: "Transakcija nije povezana" }
      }

      await db.matchRecord.create({
        data: {
          companyId: company.id,
          bankTransactionId: validatedTransactionId,
          matchStatus: MatchStatus.UNMATCHED,
          matchKind: MatchKind.UNMATCH,
          source: MatchSource.MANUAL,
          reason: "Manual unlink",
          createdBy: user.id!,
        },
      })

      await logAudit({
        companyId: company.id,
        userId: user.id!,
        action: "UPDATE",
        entity: "BankTransaction",
        entityId: validatedTransactionId,
        reason: "bank_unmatch",
        changes: {
          before: {
            matchStatus: latestMatch.matchStatus,
            matchKind: latestMatch.matchKind,
            matchedInvoiceId: latestMatch.matchedInvoiceId,
            matchedExpenseId: latestMatch.matchedExpenseId,
          },
          after: {
            matchStatus: MatchStatus.UNMATCHED,
            matchKind: MatchKind.UNMATCH,
            matchedInvoiceId: null,
            matchedExpenseId: null,
          },
        },
      })

      revalidatePath("/banking")
      revalidatePath(`/banking/transactions/${validatedTransactionId}`)
      return { success: true }
    })
  } catch (error) {
    console.error("Failed to unmatch transaction:", error)
    return { success: false, error: "Greška pri uklanjanju poveznice" }
  }
}

/**
 * Mark a transaction as ignored
 */
export async function ignoreTransaction(transactionId: unknown): Promise<ActionResult> {
  try {
    const idResult = uuidSchema.safeParse(transactionId)
    if (!idResult.success) {
      return { success: false, error: "Nevažeći ID transakcije" }
    }
    const validatedTransactionId = idResult.data

    const user = await requireAuth()
    const company = await requireCompany(user.id!)

    return runWithTenant({ companyId: company.id, userId: user.id! }, async () => {
      // Verify transaction exists and belongs to company
      const transaction = await db.bankTransaction.findFirst({
        where: { id: validatedTransactionId, companyId: company.id },
      })

      if (!transaction) {
        return { success: false, error: "Transakcija nije pronađena" }
      }

      await db.matchRecord.create({
        data: {
          companyId: company.id,
          bankTransactionId: validatedTransactionId,
          matchStatus: MatchStatus.IGNORED,
          matchKind: MatchKind.IGNORE,
          source: MatchSource.MANUAL,
          reason: "Ignored",
          createdBy: user.id!,
        },
      })

      revalidatePath("/banking")
      revalidatePath(`/banking/transactions/${validatedTransactionId}`)
      return { success: true }
    })
  } catch (error) {
    console.error("Failed to ignore transaction:", error)
    return { success: false, error: "Greška pri ignoriranju transakcije" }
  }
}

/**
 * Automatically match unmatched transactions
 */
export async function autoMatchTransactions(
  bankAccountId: unknown
): Promise<ActionResult<{ count: number }>> {
  try {
    const idResult = uuidSchema.safeParse(bankAccountId)
    if (!idResult.success) {
      return { success: false, error: "Nevažeći ID bankovnog računa" }
    }
    const validatedBankAccountId = idResult.data

    const user = await requireAuth()
    const company = await requireCompany(user.id!)

    return runWithTenant({ companyId: company.id, userId: user.id! }, async () => {
      // Verify bank account exists
      const bankAccount = await db.bankAccount.findFirst({
        where: { id: validatedBankAccountId, companyId: company.id },
      })

      if (!bankAccount) {
        return { success: false, error: "Bankovni račun nije pronađen" }
      }

      const result = await runAutoMatchTransactions({
        companyId: company.id,
        bankAccountId: validatedBankAccountId,
        userId: user.id!,
      })

      revalidatePath("/banking")
      revalidatePath(`/banking/${validatedBankAccountId}`)
      return { success: true, data: { count: result.matchedCount } }
    })
  } catch (error) {
    console.error("Failed to auto-match transactions:", error)
    return { success: false, error: "Greška pri automatskom povezivanju transakcija" }
  }
}
