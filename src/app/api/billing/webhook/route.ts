import { NextResponse } from "next/server"
import { db } from "@/lib/db"

// Minimal billing webhook stub to sync entitlements/legal form.
// Expected payload: { companyId: string, legalForm?: string, isVatPayer?: boolean, entitlements?: string[] }
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null)
    if (!body?.companyId) {
      return NextResponse.json({ error: "Missing companyId" }, { status: 400 })
    }

    await db.company.update({
      where: { id: body.companyId },
      data: {
        legalForm: body.legalForm ?? undefined,
        isVatPayer: body.isVatPayer ?? undefined,
        entitlements: Array.isArray(body.entitlements) ? body.entitlements : undefined,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Billing webhook failed", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
