import { NextResponse } from "next/server"
import { z } from "zod"
import { requireAuth, requireCompany } from "@/lib/auth-utils"
import { db } from "@/lib/db"
import { matchTransactionsToBoth, getAllCandidates } from "@/lib/banking/reconciliation"
import { ParsedTransaction } from "@/lib/banking/csv-parser"
import { AUTO_MATCH_THRESHOLD } from "@/lib/banking/reconciliation-config"
import { MatchStatus, Prisma } from "@prisma/client"

const matchStatusOptions = [
  "UNMATCHED",
  "AUTO_MATCHED",
  "MANUAL_MATCHED",
  "IGNORED",
  "ALL",
] as const

const querySchema = z.object({
  bankAccountId: z.string().optional(),
  matchStatus: z.enum(matchStatusOptions).default("UNMATCHED"),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(25),
})

export async function GET(request: Request) {
  const user = await requireAuth()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const company = await requireCompany(user.id!)
  if (!company) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 })
  }

  const url = new URL(request.url)
  const parsed = querySchema.safeParse(Object.fromEntries(url.searchParams))
  if (!parsed.success) {
    return NextResponse.json({ error: "Neispravan upit" }, { status: 400 })
  }

  const { bankAccountId, matchStatus, page, limit } = parsed.data
  const skip = (page - 1) * limit

  const baseWhere: Prisma.BankTransactionWhereInput = {
    companyId: company.id,
  }
  if (bankAccountId) {
    baseWhere.bankAccountId = bankAccountId
  }

  const [transactionRows, latestMatches] = await Promise.all([
    db.bankTransaction.findMany({
      where: baseWhere,
      select: { id: true, date: true, amount: true },
      orderBy: { date: "desc" },
    }),
    db.matchRecord.findMany({
      where: {
        companyId: company.id,
        ...(bankAccountId ? { bankTransaction: { bankAccountId } } : {}),
      },
      orderBy: [{ bankTransactionId: "asc" }, { createdAt: "desc" }],
      distinct: ["bankTransactionId"],
    }),
  ])

  const matchMap = new Map(latestMatches.map((match) => [match.bankTransactionId, match]))

  const getStatus = (transactionId: string) =>
    matchMap.get(transactionId)?.matchStatus ?? MatchStatus.UNMATCHED

  const filteredTransactions = transactionRows.filter((txn) => {
    if (matchStatus === "ALL") return true
    return getStatus(txn.id) === matchStatus
  })

  const total = filteredTransactions.length
  const pagedIds = filteredTransactions.slice(skip, skip + limit).map((txn) => txn.id)

  const transactions = await db.bankTransaction.findMany({
    where: { id: { in: pagedIds } },
    include: {
      bankAccount: {
        select: { name: true, currency: true },
      },
    },
    orderBy: { date: "desc" },
  })

  const matchedInvoiceIds = Array.from(
    new Set(latestMatches.map((match) => match.matchedInvoiceId).filter(Boolean))
  ) as string[]
  const matchedExpenseIds = Array.from(
    new Set(latestMatches.map((match) => match.matchedExpenseId).filter(Boolean))
  ) as string[]

  const [invoices, expenses, matchedInvoices, matchedExpenses] = await Promise.all([
    db.eInvoice.findMany({
      where: {
        companyId: company.id,
        direction: "OUTBOUND",
        paidAt: null,
      },
      include: {
        lines: true,
      },
      orderBy: { issueDate: "desc" },
    }),
    db.expense.findMany({
      where: {
        companyId: company.id,
        status: { in: ["DRAFT", "PENDING"] },
      },
      orderBy: { date: "desc" },
    }),
    matchedInvoiceIds.length
      ? db.eInvoice.findMany({
          where: { id: { in: matchedInvoiceIds } },
          select: { id: true, totalAmount: true, netAmount: true },
        })
      : Promise.resolve([]),
    matchedExpenseIds.length
      ? db.expense.findMany({
          where: { id: { in: matchedExpenseIds } },
          select: { id: true, totalAmount: true },
        })
      : Promise.resolve([]),
  ])

  const parsedTransactions: (ParsedTransaction & { id: string })[] = transactions.map((txn) => ({
    id: txn.id,
    date: txn.date,
    amount: Number(txn.amount),
    description: txn.description,
    reference: txn.reference || "",
    type: Number(txn.amount) >= 0 ? "credit" : "debit",
    currency: txn.bankAccount?.currency || "EUR",
  }))

  const matchResults = matchTransactionsToBoth(parsedTransactions, invoices, expenses)
  const suggestionMap = new Map(matchResults.map((match) => [match.transactionId, match]))
  const parsedMap = new Map(parsedTransactions.map((t) => [t.id, t]))

  const summary = {
    unmatched: transactionRows.length - latestMatches.length,
    autoMatched: 0,
    manualMatched: 0,
    ignored: 0,
    mismatched: 0,
  }

  for (const match of latestMatches) {
    if (match.matchStatus === "AUTO_MATCHED") summary.autoMatched += 1
    if (match.matchStatus === "MANUAL_MATCHED") summary.manualMatched += 1
    if (match.matchStatus === "IGNORED") summary.ignored += 1
    if (match.matchStatus === "UNMATCHED") summary.unmatched += 1
  }

  const invoiceMap = new Map(invoices.map((invoice) => [invoice.id, invoice]))
  const expenseMap = new Map(expenses.map((expense) => [expense.id, expense]))
  const matchedInvoiceMap = new Map(matchedInvoices.map((invoice) => [invoice.id, invoice]))
  const matchedExpenseMap = new Map(matchedExpenses.map((expense) => [expense.id, expense]))
  const amountMap = new Map(transactionRows.map((row) => [row.id, Math.abs(Number(row.amount))]))

  for (const match of latestMatches) {
    const expectedAmount = match.matchedInvoiceId
      ? Number(matchedInvoiceMap.get(match.matchedInvoiceId)?.totalAmount || 0)
      : match.matchedExpenseId
        ? Number(matchedExpenseMap.get(match.matchedExpenseId)?.totalAmount || 0)
        : null
    const transactionAmount = amountMap.get(match.bankTransactionId)
    if (
      expectedAmount !== null &&
      transactionAmount !== undefined &&
      Math.abs(expectedAmount - transactionAmount) > 0.01
    ) {
      summary.mismatched += 1
    }
  }

  const payload = {
    transactions: transactions.map((txn) => {
      const parsed = parsedMap.get(txn.id)
      const allCandidates = parsed
        ? getAllCandidates(parsed, invoices, expenses)
        : { invoiceCandidates: [], expenseCandidates: [] }
      const matchInfo = matchMap.get(txn.id)
      const suggested = suggestionMap.get(txn.id)
      const invoice = matchInfo?.matchedInvoiceId
        ? matchedInvoiceMap.get(matchInfo.matchedInvoiceId)
        : null
      const expense = matchInfo?.matchedExpenseId
        ? matchedExpenseMap.get(matchInfo.matchedExpenseId)
        : null
      const expectedAmount = invoice
        ? Number(invoice.totalAmount || invoice.netAmount || 0)
        : expense
          ? Number(expense.totalAmount)
          : null
      const mismatch =
        expectedAmount !== null && Math.abs(expectedAmount - Math.abs(Number(txn.amount))) > 0.01
      if (mismatch) summary.mismatched += 1
      return {
        id: txn.id,
        date: txn.date.toISOString(),
        description: txn.description,
        reference: txn.reference,
        counterpartyName: txn.counterpartyName,
        amount: Number(txn.amount),
        currency: txn.bankAccount?.currency || "EUR",
        bankAccount: {
          id: txn.bankAccountId,
          name: txn.bankAccount?.name || "",
        },
        matchStatus: matchInfo?.matchStatus ?? MatchStatus.UNMATCHED,
        matchKind: matchInfo?.matchKind ?? null,
        matchSource: matchInfo?.source ?? null,
        matchedAt: matchInfo?.createdAt?.toISOString() ?? null,
        confidenceScore: matchInfo?.confidenceScore ?? suggested?.confidenceScore ?? 0,
        mismatch,
        mismatchExpectedAmount: expectedAmount,
        invoiceCandidates: allCandidates.invoiceCandidates.map((candidate) => ({
          ...candidate,
          issueDate: candidate.issueDate.toISOString(),
        })),
        expenseCandidates: allCandidates.expenseCandidates.map((candidate) => ({
          ...candidate,
          date: candidate.date.toISOString(),
        })),
      }
    }),
    pagination: {
      page,
      limit,
      total,
    },
    summary,
    autoMatchThreshold: AUTO_MATCH_THRESHOLD,
  }

  return NextResponse.json(payload)
}
