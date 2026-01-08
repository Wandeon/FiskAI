import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requireAuth, requireCompanyWithPermission } from "@/lib/auth-utils"
import { parseQuery, isValidationError, formatValidationError } from "@/lib/api/validation"
import { fetchKpr } from "@/lib/reports/kpr"
import { KprPdfDocument } from "@/lib/reports/kpr-pdf"
import { renderToBuffer } from "@react-pdf/renderer"

const querySchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  groupByMonth: z
    .string()
    .optional()
    .transform((v) => v === "true"),
})

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    return await requireCompanyWithPermission(user.id!, "reports:export", async (company) => {
      const { searchParams } = new URL(request.url)
      const query = parseQuery(searchParams, querySchema)
      const { from, to, groupByMonth } = query

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
    })
  } catch (error) {
    if (isValidationError(error)) {
      return NextResponse.json(formatValidationError(error), { status: 400 })
    }
    if (error instanceof Error && error.message.includes("Permission denied")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    console.error("KPR PDF export error:", error)
    return NextResponse.json({ error: "Neuspješan KPR PDF izvoz" }, { status: 500 })
  }
}
