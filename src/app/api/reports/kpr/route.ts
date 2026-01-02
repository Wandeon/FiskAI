import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requireAuth, requireCompany } from "@/lib/auth-utils"
import { parseQuery, isValidationError, formatValidationError } from "@/lib/api/validation"
import { fetchKpr, kprToCsv } from "@/lib/reports/kpr"

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
    const csv = kprToCsv(summary)

    const rangeLabel =
      from && to ? `${from.toISOString().slice(0, 10)}-${to.toISOString().slice(0, 10)}` : "all"

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="kpr-${company.oib}-${rangeLabel}.csv"`,
      },
    })
  } catch (error) {
    if (isValidationError(error)) {
      return NextResponse.json(formatValidationError(error), { status: 400 })
    }
    console.error("KPR export error:", error)
    return NextResponse.json({ error: "Neuspješan KPR izvoz" }, { status: 500 })
  }
}
