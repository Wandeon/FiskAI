import { NextRequest, NextResponse } from "next/server"
import { requireAuth, requireCompany } from "@/lib/auth-utils"
import { fetchKpr, kprToCsv } from "@/lib/reports/kpr"
import { apiError } from "@/lib/api-error"

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    const company = await requireCompany(user.id!)

    const { searchParams } = new URL(request.url)
    const fromParam = searchParams.get("from")
    const toParam = searchParams.get("to")

    const from = fromParam ? new Date(fromParam) : undefined
    const to = toParam ? new Date(toParam) : undefined

    const summary = await fetchKpr(company.id, from, to)
    const csv = kprToCsv(summary)

    const rangeLabel = from && to
      ? `${from.toISOString().slice(0,10)}-${to.toISOString().slice(0,10)}`
      : 'all'

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="kpr-${company.oib}-${rangeLabel}.csv"`,
      },
    })
  } catch (error) {
    return apiError(error, {
      status: 500,
      code: "OPERATION_FAILED",
      message: "Neuspješan KPR izvoz",
    })
  }
}
