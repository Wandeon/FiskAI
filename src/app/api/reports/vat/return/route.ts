import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requireAuth, requireCompany } from "@/lib/auth-utils"
import { parseQuery, isValidationError, formatValidationError } from "@/lib/api/validation"
import { createControlSum } from "@/lib/exports/control-sum"
import {
  getPeriodDescription,
  preparePdvFormData,
  validatePdvFormData,
} from "@/lib/reports/pdv-xml-generator"

const querySchema = z
  .object({
    from: z.coerce.date({ message: "Datum 'from' je obavezan" }),
    to: z.coerce.date({ message: "Datum 'to' je obavezan" }),
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

    const data = await preparePdvFormData(company.id, dateFrom, dateTo)
    const validation = validatePdvFormData(data)

    const payload = {
      data,
      periodDescription: getPeriodDescription(data),
      validation,
    }

    const json = JSON.stringify(payload, null, 2)
    const controlSum = createControlSum(json)
    const responseBody = JSON.stringify({ ...payload, controlSum }, null, 2)

    return new NextResponse(responseBody, {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "X-Export-Control-Sum": controlSum,
      },
    })
  } catch (error) {
    if (isValidationError(error)) {
      return NextResponse.json(formatValidationError(error), { status: 400 })
    }
    console.error("PDV return generation error:", error)
    return NextResponse.json({ error: "Neuspješna PDV prijava" }, { status: 500 })
  }
}
