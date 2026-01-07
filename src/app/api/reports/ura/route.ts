import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requireAuth, requireCompanyWithPermission } from "@/lib/auth-utils"
import { parseQuery, isValidationError, formatValidationError } from "@/lib/api/validation"
import { createControlSum } from "@/lib/exports/control-sum"
import { fetchUraRows, uraToCsv } from "@/lib/reports/ura-ira"
import { lockAccountingPeriodsForRange } from "@/lib/period-locking/service"

const querySchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
})

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    return await requireCompanyWithPermission(user.id!, "reports:export", async (company) => {
      const { searchParams } = new URL(request.url)
      const query = parseQuery(searchParams, querySchema)
      const { from, to } = query

      const fromParam = searchParams.get("from")
      const toParam = searchParams.get("to")

      const rows = await fetchUraRows(company.id, from, to)

      if (from && to) {
        await lockAccountingPeriodsForRange(company.id, from, to, user.id!, "export_ura")
      }
      const csv = uraToCsv(rows)
      const controlSum = createControlSum(csv)

      const rangeLabel = from && to ? `${fromParam}-${toParam}` : "all"
      const filename = `ura-${company.oib}-${rangeLabel}.csv`

      return new NextResponse(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename}"`,
          "X-Export-Control-Sum": controlSum,
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
    console.error("URA export error:", error)
    return NextResponse.json({ error: "Neuspješan URA izvoz" }, { status: 500 })
  }
}
