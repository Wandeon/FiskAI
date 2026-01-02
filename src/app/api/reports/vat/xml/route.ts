import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requireAuth, requireCompany } from "@/lib/auth-utils"
import { parseQuery, isValidationError, formatValidationError } from "@/lib/api/validation"
import { generatePdvFormForPeriod, validatePdvFormData } from "@/lib/reports/pdv-xml-generator"

const querySchema = z
  .object({
    from: z.coerce.date({ required_error: "Datum 'from' je obavezan" }),
    to: z.coerce.date({ required_error: "Datum 'to' je obavezan" }),
  })
  .refine((data) => data.from <= data.to, {
    message: "Datum 'from' mora biti prije datuma 'to'",
    path: ["from"],
  })

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    const company = await requireCompany(user.id!)

    const { searchParams } = new URL(request.url)
    const query = parseQuery(searchParams, querySchema)
    const { from: dateFrom, to: dateTo } = query

    // Generate PDV form
    const { xml, data } = await generatePdvFormForPeriod(company.id, dateFrom, dateTo)

    // Validate form data
    const validation = validatePdvFormData(data)
    if (!validation.valid) {
      console.warn("PDV form validation warnings:", validation.errors)
    }

    // Generate filename
    const periodStr =
      data.periodType === "MONTHLY"
        ? `${data.periodYear}-${String(data.periodMonth).padStart(2, "0")}`
        : `${data.periodYear}-Q${data.periodQuarter}`
    const fileName = `PDV-${company.oib}-${periodStr}.xml`

    return new NextResponse(xml, {
      status: 200,
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    })
  } catch (error) {
    if (isValidationError(error)) {
      return NextResponse.json(formatValidationError(error), { status: 400 })
    }
    console.error("PDV XML export error:", error)
    return NextResponse.json({ error: "Neuspjesan PDV XML izvoz" }, { status: 500 })
  }
}
