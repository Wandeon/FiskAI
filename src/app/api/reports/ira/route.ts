import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requireAuth, requireCompany } from "@/lib/auth-utils"
import { parseQuery, isValidationError, formatValidationError } from "@/lib/api/validation"
import { createControlSum } from "@/lib/exports/control-sum"
import { fetchIraRows, iraToCsv } from "@/lib/reports/ura-ira"

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

    const fromParam = searchParams.get("from")
    const toParam = searchParams.get("to")

    const rows = await fetchIraRows(company.id, from, to)
    const csv = iraToCsv(rows)
    const controlSum = createControlSum(csv)

    const rangeLabel = from && to ? `${fromParam}-${toParam}` : "all"
    const filename = `ira-${company.oib}-${rangeLabel}.csv`

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "X-Export-Control-Sum": controlSum,
      },
    })
  } catch (error) {
    if (isValidationError(error)) {
      return NextResponse.json(formatValidationError(error), { status: 400 })
    }
    console.error("IRA export error:", error)
    return NextResponse.json({ error: "Neuspješan IRA izvoz" }, { status: 500 })
  }
}
