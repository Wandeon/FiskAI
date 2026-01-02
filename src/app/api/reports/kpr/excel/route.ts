import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requireAuth, requireCompany } from "@/lib/auth-utils"
import { parseQuery, isValidationError, formatValidationError } from "@/lib/api/validation"
import { fetchKpr } from "@/lib/reports/kpr"
import { kprToExcel } from "@/lib/reports/kpr-excel"

const querySchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
})

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    const company = await requireCompany(user.id!)

    const { searchParams } = new URL(request.url)
    const query = parseQuery(searchParams, querySchema)
    const { from, to } = query

    const summary = await fetchKpr(company.id, from, to)
    const excel = kprToExcel(summary, company.name, company.oib, from, to)

    const fileName = `kpr-${company.oib}-${new Date().toISOString().slice(0, 10)}.csv`

    return new NextResponse(excel, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    })
  } catch (error) {
    if (isValidationError(error)) {
      return NextResponse.json(formatValidationError(error), { status: 400 })
    }
    console.error("KPR Excel export error:", error)
    return NextResponse.json({ error: "Neuspješan KPR Excel izvoz" }, { status: 500 })
  }
}
