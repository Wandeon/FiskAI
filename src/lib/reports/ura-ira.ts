import { db } from "@/lib/db"

export type IraRow = {
  issueDate: Date
  invoiceNumber: string
  buyerName: string | null
  buyerOib: string | null
  netAmount: number
  vatAmount: number
  totalAmount: number
  paidAt: Date | null
}

export type UraRow = {
  date: Date
  documentRef: string
  vendorName: string | null
  vendorOib: string | null
  netAmount: number
  vatAmount: number
  totalAmount: number
  vatDeductible: boolean
}

export async function fetchIraRows(companyId: string, from?: Date, to?: Date): Promise<IraRow[]> {
  const toDateInclusive = to
    ? (() => {
        const d = new Date(to)
        d.setHours(23, 59, 59, 999)
        return d
      })()
    : undefined

  const dateFilter =
    from || toDateInclusive
      ? {
          gte: from,
          lte: toDateInclusive,
        }
      : undefined

  const invoices = await db.eInvoice.findMany({
    where: {
      companyId,
      direction: "OUTBOUND",
      status: { not: "DRAFT" },
      ...(dateFilter ? { issueDate: dateFilter } : {}),
    },
    include: {
      buyer: { select: { name: true, oib: true } },
    },
    orderBy: { issueDate: "asc" },
  })

  return invoices.map((inv) => ({
    issueDate: inv.issueDate,
    invoiceNumber: inv.invoiceNumber,
    buyerName: inv.buyer?.name ?? null,
    buyerOib: inv.buyer?.oib ?? null,
    netAmount: Number(inv.netAmount),
    vatAmount: Number(inv.vatAmount),
    totalAmount: Number(inv.totalAmount),
    paidAt: inv.paidAt,
  }))
}

export async function fetchUraRows(companyId: string, from?: Date, to?: Date): Promise<UraRow[]> {
  const toDateInclusive = to
    ? (() => {
        const d = new Date(to)
        d.setHours(23, 59, 59, 999)
        return d
      })()
    : undefined

  const dateFilter =
    from || toDateInclusive
      ? {
          gte: from,
          lte: toDateInclusive,
        }
      : undefined

  const expenses = await db.expense.findMany({
    where: {
      companyId,
      status: { not: "DRAFT" },
      ...(dateFilter ? { date: dateFilter } : {}),
    },
    include: {
      vendor: { select: { name: true, oib: true } },
    },
    orderBy: { date: "asc" },
  })

  return expenses.map((exp) => ({
    date: exp.date,
    documentRef: exp.description,
    vendorName: exp.vendor?.name ?? null,
    vendorOib: exp.vendor?.oib ?? null,
    netAmount: Number(exp.netAmount),
    vatAmount: Number(exp.vatAmount),
    totalAmount: Number(exp.totalAmount),
    vatDeductible: exp.vatDeductible,
  }))
}

function formatDate(value?: Date | null) {
  if (!value) return ""
  return value.toISOString().slice(0, 10)
}

function escapeCsv(value: string | number | null | undefined) {
  const str = value === undefined || value === null ? "" : String(value)
  if (str.includes(";") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

export function iraToCsv(rows: IraRow[]): string {
  const header = [
    "Datum izdavanja",
    "Broj računa",
    "Kupac",
    "OIB kupca",
    "Osnovica (EUR)",
    "PDV (EUR)",
    "Ukupno (EUR)",
    "Plaćeno",
    "Datum plaćanja",
  ].join(";")

  const dataRows = rows.map((row) =>
    [
      formatDate(row.issueDate),
      row.invoiceNumber,
      row.buyerName ?? "",
      row.buyerOib ?? "",
      row.netAmount.toFixed(2),
      row.vatAmount.toFixed(2),
      row.totalAmount.toFixed(2),
      row.paidAt ? "DA" : "NE",
      formatDate(row.paidAt),
    ]
      .map(escapeCsv)
      .join(";")
  )

  return "\uFEFF" + [header, ...dataRows].join("\n")
}

export function uraToCsv(rows: UraRow[]): string {
  const header = [
    "Datum",
    "Opis",
    "Dobavljač",
    "OIB dobavljača",
    "Osnovica (EUR)",
    "PDV (EUR)",
    "Ukupno (EUR)",
    "Pretporez",
  ].join(";")

  const dataRows = rows.map((row) =>
    [
      formatDate(row.date),
      row.documentRef,
      row.vendorName ?? "",
      row.vendorOib ?? "",
      row.netAmount.toFixed(2),
      row.vatAmount.toFixed(2),
      row.totalAmount.toFixed(2),
      row.vatDeductible ? "DA" : "NE",
    ]
      .map(escapeCsv)
      .join(";")
  )

  return "\uFEFF" + [header, ...dataRows].join("\n")
}
