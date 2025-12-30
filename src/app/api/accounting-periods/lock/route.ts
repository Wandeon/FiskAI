import { NextRequest, NextResponse } from "next/server"
import { requireAuth, requireCompany } from "@/lib/auth-utils"
import { lockAccountingPeriod, unlockAccountingPeriod } from "@/lib/period-locking/service"

export async function POST(req: NextRequest) {
  const user = await requireAuth()
  const company = await requireCompany(user.id!)
  const body = await req.json()

  const reason = body.reason ?? "period_lock_change"

  if (body.action === "unlock") {
    const period = await unlockAccountingPeriod(company.id, body.periodId, user.id!, reason)
    return NextResponse.json({ period })
  }

  const period = await lockAccountingPeriod(company.id, body.periodId, user.id!, reason)
  return NextResponse.json({ period })
}
