import { NextResponse } from "next/server"
import { requireAuth, getCurrentCompany } from "@/lib/auth-utils"
import { db } from "@/lib/db"
import { withApiLogging } from "@/lib/api-logging"
import { updateContext } from "@/lib/context"

export const POST = withApiLogging(async () => {
  const user = await requireAuth()
  updateContext({ userId: user.id! })

  const company = await getCurrentCompany(user.id!)

  if (!company) {
    return NextResponse.json({ ok: false, reason: "NO_COMPANY" }, { status: 400 })
  }

  updateContext({ companyId: company.id })

  await db.companyUser.updateMany({
    where: {
      userId: user.id!,
      companyId: company.id,
    },
    data: {
      notificationSeenAt: new Date(),
    },
  })

  return NextResponse.json({ ok: true })
})
