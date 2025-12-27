import { NextRequest, NextResponse } from "next/server"
import { requireAuth, requireCompany } from "@/lib/auth-utils"
import { fetchKpr } from "@/lib/reports/kpr"
import { KprPdfDocument } from "@/lib/reports/kpr-pdf"
import { renderToBuffer } from "@react-pdf/renderer"

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    const company = await requireCompany(user.id!)

    const { searchParams } = new URL(request.url)
    const fromParam = searchParams.get("from")
    const toParam = searchParams.get("to")
    const groupByMonth = searchParams.get("groupByMonth") === "true"

    const from = fromParam ? new Date(fromParam) : undefined
    const to = toParam ? new Date(toParam) : undefined

    const summary = await fetchKpr(company.id, from, to)

    // Generate PDF
    const pdfBuffer = await renderToBuffer(
      KprPdfDocument({
        summary,
        companyName: company.name,
        companyOib: company.oib,
        from,
        to,
        groupByMonth,
      })
    )

    const fileName = `kpr-${company.oib}-${new Date().toISOString().slice(0, 10)}.pdf`

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    })
  } catch (error) {
    console.error("KPR PDF export error:", error)
    return NextResponse.json({ error: "Neuspješan KPR PDF izvoz" }, { status: 500 })
  }
}
