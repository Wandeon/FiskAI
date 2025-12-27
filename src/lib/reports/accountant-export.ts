// Accountant export utilities for Croatian paušalni obrt
// Generates comprehensive data exports for tax season handoff

import { db } from "@/lib/db"
import { Prisma } from "@prisma/client"

// Decimal is now accessed via Prisma namespace
type Decimal = Prisma.Decimal

export type InvoiceSummaryRow = {
  invoiceNumber: string | null
  issueDate: Date | null
  dueDate: Date | null
  buyerName: string | null
  buyerOib: string | null
  direction: string
  type: string
  status: string
  netAmount: number
  vatAmount: number
  totalAmount: number
  isPaid: boolean
  paidAt: Date | null
  reference: string | null
}

export type ExpenseSummaryRow = {
  date: Date | null
  description: string
  vendorName: string | null
  vendorOib: string | null
  categoryName: string | null
  categoryCode: string | null
  status: string
  netAmount: number
  vatAmount: number
  totalAmount: number
  isPaid: boolean
  paymentDate: Date | null
  paymentMethod: string | null
  receiptUrl: string | null
  notes: string | null
}

export type KprRow = {
  paidAt: Date | null
  issueDate: Date | null
  invoiceNumber: string | null
  buyerName: string | null
  netAmount: number
  vatAmount: number
  totalAmount: number
}

export type AccountantExportData = {
  companyName: string
  companyOib: string
  companyVatNumber: string | null
  periodFrom: Date | undefined
  periodTo: Date | undefined
  invoices: InvoiceSummaryRow[]
  expenses: ExpenseSummaryRow[]
  kprRows: KprRow[]
  totals: {
    totalIncome: number
    totalIncomeVat: number
    totalIncomeGross: number
    totalExpenses: number
    totalExpensesVat: number
    totalExpensesGross: number
    netProfit: number
  }
}

export async function fetchAccountantExportData(
  companyId: string,
  from?: Date,
  to?: Date
): Promise<AccountantExportData> {
  // Fetch company info
  const company = await db.company.findUnique({
    where: { id: companyId },
    select: {
      name: true,
      oib: true,
      vatNumber: true,
    },
  })

  if (!company) {
    throw new Error("Company not found")
  }

  // Set up date filters
  const toDateInclusive = to
    ? (() => {
        const d = new Date(to)
        d.setHours(23, 59, 59, 999)
        return d
      })()
    : undefined

  const invoiceDateFilter =
    from || toDateInclusive
      ? {
          gte: from,
          lte: toDateInclusive,
        }
      : undefined

  const expenseDateFilter =
    from || toDateInclusive
      ? {
          gte: from,
          lte: toDateInclusive,
        }
      : undefined

  // Fetch invoices
  const invoicesRaw = await db.eInvoice.findMany({
    where: {
      companyId,
      ...(invoiceDateFilter ? { issueDate: invoiceDateFilter } : {}),
    },
    include: {
      buyer: {
        select: { name: true, oib: true },
      },
    },
    orderBy: { issueDate: "asc" },
  })

  const invoices: InvoiceSummaryRow[] = invoicesRaw.map((inv) => ({
    invoiceNumber: inv.invoiceNumber,
    issueDate: inv.issueDate,
    dueDate: inv.dueDate,
    buyerName: inv.buyer?.name || null,
    buyerOib: inv.buyer?.oib || null,
    direction: inv.direction,
    type: inv.type,
    status: inv.status,
    netAmount: numberFromDecimal(inv.netAmount),
    vatAmount: numberFromDecimal(inv.vatAmount),
    totalAmount: numberFromDecimal(inv.totalAmount),
    isPaid: inv.paidAt !== null,
    paidAt: inv.paidAt,
    reference: inv.providerRef || inv.internalReference || null,
  }))

  // Fetch expenses
  const expensesRaw = await db.expense.findMany({
    where: {
      companyId,
      ...(expenseDateFilter ? { date: expenseDateFilter } : {}),
    },
    include: {
      vendor: { select: { name: true, oib: true } },
      category: { select: { name: true, code: true } },
    },
    orderBy: { date: "asc" },
  })

  const expenses: ExpenseSummaryRow[] = expensesRaw.map((exp) => ({
    date: exp.date,
    description: exp.description,
    vendorName: exp.vendor?.name || null,
    vendorOib: exp.vendor?.oib || null,
    categoryName: exp.category?.name || null,
    categoryCode: exp.category?.code || null,
    status: exp.status,
    netAmount: numberFromDecimal(exp.netAmount),
    vatAmount: numberFromDecimal(exp.vatAmount),
    totalAmount: numberFromDecimal(exp.totalAmount),
    isPaid: exp.status === "PAID" || exp.paymentDate !== null,
    paymentDate: exp.paymentDate,
    paymentMethod: exp.paymentMethod,
    receiptUrl: exp.receiptUrl,
    notes: exp.notes,
  }))

  // Fetch KPR data (paid invoices only)
  const kprDateFilter =
    from || toDateInclusive
      ? {
          gte: from,
          lte: toDateInclusive,
        }
      : undefined

  const kprInvoicesRaw = await db.eInvoice.findMany({
    where: {
      companyId,
      paidAt: { not: null, ...(kprDateFilter || {}) },
    },
    include: {
      buyer: { select: { name: true } },
    },
    orderBy: { paidAt: "asc" },
  })

  const kprRows: KprRow[] = kprInvoicesRaw.map((inv) => ({
    paidAt: inv.paidAt,
    issueDate: inv.issueDate,
    invoiceNumber: inv.invoiceNumber,
    buyerName: inv.buyer?.name || null,
    netAmount: numberFromDecimal(inv.netAmount),
    vatAmount: numberFromDecimal(inv.vatAmount),
    totalAmount: numberFromDecimal(inv.totalAmount),
  }))

  // Calculate totals
  const totalIncome = invoices.reduce((sum, inv) => sum + inv.netAmount, 0)
  const totalIncomeVat = invoices.reduce((sum, inv) => sum + inv.vatAmount, 0)
  const totalIncomeGross = invoices.reduce((sum, inv) => sum + inv.totalAmount, 0)

  const totalExpenses = expenses.reduce((sum, exp) => sum + exp.netAmount, 0)
  const totalExpensesVat = expenses.reduce((sum, exp) => sum + exp.vatAmount, 0)
  const totalExpensesGross = expenses.reduce((sum, exp) => sum + exp.totalAmount, 0)

  const netProfit = totalIncomeGross - totalExpensesGross

  return {
    companyName: company.name,
    companyOib: company.oib,
    companyVatNumber: company.vatNumber,
    periodFrom: from,
    periodTo: to,
    invoices,
    expenses,
    kprRows,
    totals: {
      totalIncome,
      totalIncomeVat,
      totalIncomeGross,
      totalExpenses,
      totalExpensesVat,
      totalExpensesGross,
      netProfit,
    },
  }
}

// CSV Export Functions

export function invoicesToCsv(invoices: InvoiceSummaryRow[]): string {
  const header = [
    "Broj računa",
    "Datum izdavanja",
    "Dospijeće",
    "Kupac",
    "OIB kupca",
    "Smjer",
    "Vrsta",
    "Status",
    "Osnovica (EUR)",
    "PDV (EUR)",
    "Ukupno (EUR)",
    "Plaćeno",
    "Datum plaćanja",
    "Referenca",
  ].join(";")

  const rows = invoices.map((inv) =>
    [
      inv.invoiceNumber || "",
      formatDate(inv.issueDate),
      formatDate(inv.dueDate),
      escapeCsv(inv.buyerName || ""),
      inv.buyerOib || "",
      inv.direction,
      inv.type,
      inv.status,
      inv.netAmount.toFixed(2),
      inv.vatAmount.toFixed(2),
      inv.totalAmount.toFixed(2),
      inv.isPaid ? "DA" : "NE",
      formatDate(inv.paidAt),
      escapeCsv(inv.reference || ""),
    ].join(";")
  )

  return "\uFEFF" + [header, ...rows].join("\n")
}

export function expensesToCsv(expenses: ExpenseSummaryRow[]): string {
  const header = [
    "Datum",
    "Opis",
    "Dobavljač",
    "OIB dobavljača",
    "Kategorija",
    "Status",
    "Osnovica (EUR)",
    "PDV (EUR)",
    "Ukupno (EUR)",
    "Plaćeno",
    "Datum plaćanja",
    "Način plaćanja",
    "Link na račun",
    "Napomena",
  ].join(";")

  const rows = expenses.map((exp) =>
    [
      formatDate(exp.date),
      escapeCsv(exp.description),
      escapeCsv(exp.vendorName || ""),
      exp.vendorOib || "",
      escapeCsv(exp.categoryName || exp.categoryCode || ""),
      exp.status,
      exp.netAmount.toFixed(2),
      exp.vatAmount.toFixed(2),
      exp.totalAmount.toFixed(2),
      exp.isPaid ? "DA" : "NE",
      formatDate(exp.paymentDate),
      escapeCsv(exp.paymentMethod || ""),
      exp.receiptUrl || "",
      escapeCsv(exp.notes || ""),
    ].join(";")
  )

  return "\uFEFF" + [header, ...rows].join("\n")
}

export function kprToCsv(kprRows: KprRow[]): string {
  const header = [
    "Datum plaćanja",
    "Datum izdavanja",
    "Broj računa",
    "Kupac",
    "Osnovica (EUR)",
    "PDV (EUR)",
    "Ukupno (EUR)",
  ].join(";")

  const rows = kprRows.map((row) =>
    [
      formatDate(row.paidAt),
      formatDate(row.issueDate),
      row.invoiceNumber || "",
      escapeCsv(row.buyerName || ""),
      row.netAmount.toFixed(2),
      row.vatAmount.toFixed(2),
      row.totalAmount.toFixed(2),
    ].join(";")
  )

  // Calculate totals
  const totalNet = kprRows.reduce((sum, r) => sum + r.netAmount, 0)
  const totalVat = kprRows.reduce((sum, r) => sum + r.vatAmount, 0)
  const totalGross = kprRows.reduce((sum, r) => sum + r.totalAmount, 0)

  const totalsRow = [
    "",
    "",
    "",
    "UKUPNO",
    totalNet.toFixed(2),
    totalVat.toFixed(2),
    totalGross.toFixed(2),
  ].join(";")

  return "\uFEFF" + [header, ...rows, totalsRow].join("\n")
}

export function summaryToCsv(data: AccountantExportData): string {
  const lines: string[] = []

  lines.push(`\uFEFFSažetak izvoza za knjigovođu`)
  lines.push(`Tvrtka: ${data.companyName}`)
  lines.push(`OIB: ${data.companyOib}`)
  if (data.companyVatNumber) {
    lines.push(`PDV broj: ${data.companyVatNumber}`)
  }
  lines.push(`Razdoblje: ${formatDate(data.periodFrom)} - ${formatDate(data.periodTo)}`)
  lines.push(`Datum izvoza: ${formatDate(new Date())}`)
  lines.push("")

  lines.push("PRIHODI")
  lines.push(`Broj računa;${data.invoices.length}`)
  lines.push(`Ukupna osnovica;${data.totals.totalIncome.toFixed(2)} EUR`)
  lines.push(`Ukupan PDV;${data.totals.totalIncomeVat.toFixed(2)} EUR`)
  lines.push(`Ukupno;${data.totals.totalIncomeGross.toFixed(2)} EUR`)
  lines.push("")

  lines.push("RASHODI")
  lines.push(`Broj troškova;${data.expenses.length}`)
  lines.push(`Ukupna osnovica;${data.totals.totalExpenses.toFixed(2)} EUR`)
  lines.push(`Ukupan PDV;${data.totals.totalExpensesVat.toFixed(2)} EUR`)
  lines.push(`Ukupno;${data.totals.totalExpensesGross.toFixed(2)} EUR`)
  lines.push("")

  lines.push("REZULTAT")
  lines.push(`Neto dobit/gubitak;${data.totals.netProfit.toFixed(2)} EUR`)
  lines.push("")

  lines.push("KPR (Knjiga Primitaka i Izdataka)")
  lines.push(`Broj plaćenih računa;${data.kprRows.length}`)

  return lines.join("\n")
}

// Utility functions

function numberFromDecimal(value: Decimal | number | null | undefined): number {
  if (value === null || value === undefined) return 0
  if (typeof value === "number") return value
  return Number(value.toString())
}

function formatDate(date?: Date | null): string {
  if (!date) return ""
  return date.toISOString().slice(0, 10)
}

function escapeCsv(value: string): string {
  if (value.includes(";") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}
