import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requireAuth, requireCompanyWithPermission } from "@/lib/auth-utils"
import { parseQuery, isValidationError, formatValidationError } from "@/lib/api/validation"
import { db } from "@/lib/db"
import { setTenantContext } from "@/lib/prisma-extensions"
import { ProfitLossPdfDocument } from "@/lib/reports/profit-loss-pdf"
import { renderToBuffer } from "@react-pdf/renderer"

const querySchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
})

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    return await requireCompanyWithPermission(user.id!, "reports:export", async (company) => {
      setTenantContext({ companyId: company.id, userId: user.id! })

      const { searchParams } = new URL(request.url)
      const query = parseQuery(searchParams, querySchema)

      const now = new Date()
      const defaultFrom = new Date(now.getFullYear(), 0, 1) // Start of year
      const defaultTo = now

      const dateFrom = query.from ?? defaultFrom
      const dateTo = query.to ?? defaultTo

      const [invoices, expenses] = await Promise.all([
        db.eInvoice.findMany({
          where: {
            companyId: company.id,
            issueDate: { gte: dateFrom, lte: dateTo },
            status: { not: "DRAFT" },
          },
          select: { netAmount: true },
        }),
        db.expense.findMany({
          where: {
            companyId: company.id,
            date: { gte: dateFrom, lte: dateTo },
            status: "PAID",
          },
          select: { netAmount: true },
        }),
      ])

      const revenue = invoices.reduce((sum, i) => sum + Number(i.netAmount), 0)
      const costs = expenses.reduce((sum, e) => sum + Number(e.netAmount), 0)
      const profit = revenue - costs

      // Generate PDF
      const pdfBuffer = await renderToBuffer(
        ProfitLossPdfDocument({
          companyName: company.name,
          companyOib: company.oib,
          dateFrom,
          dateTo,
          revenue,
          costs,
          profit,
          invoiceCount: invoices.length,
          expenseCount: expenses.length,
        })
      )

      const fileName = `dobit-gubitak-${company.oib}-${dateFrom.toISOString().slice(0, 10)}-${dateTo.toISOString().slice(0, 10)}.pdf`

      return new NextResponse(new Uint8Array(pdfBuffer), {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${fileName}"`,
        },
      })
    })
  } catch (error) {
    if (isValidationError(error)) {
      return NextResponse.json(formatValidationError(error), { status: 400 })
    }
    if (error instanceof Error && error.message.includes("Permission denied")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    console.error("Profit/Loss PDF export error:", error)
    return NextResponse.json({ error: "Neuspješan izvoz dobit/gubitak PDF-a" }, { status: 500 })
  }
}
