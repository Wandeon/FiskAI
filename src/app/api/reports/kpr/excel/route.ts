import { NextRequest, NextResponse } from "next/server"
import { requireAuth, requireCompany } from "@/lib/auth-utils"
import { fetchKpr } from "@/lib/reports/kpr"
import { kprToExcel } from "@/lib/reports/kpr-excel"
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
    return apiError(error, {
      status: 500,
      code: "OPERATION_FAILED",
      message: "Neuspješan KPR Excel izvoz",
    })
  }
}
