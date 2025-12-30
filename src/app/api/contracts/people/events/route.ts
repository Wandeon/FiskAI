import { NextResponse } from "next/server"
import { getCurrentCompany, getCurrentUser } from "@/lib/auth-utils"
import { db, runWithTenant } from "@/lib/db"
import { requirePermission } from "@/lib/rbac"

export async function GET(request: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const company = await getCurrentCompany(user.id!)
  if (!company) {
    return NextResponse.json({ error: "No company found" }, { status: 404 })
  }

  await requirePermission(user.id!, company.id, "person:read")

  const { searchParams } = new URL(request.url)
  const sinceParam = searchParams.get("since")
  const since = sinceParam ? new Date(sinceParam) : null

  if (sinceParam && Number.isNaN(since?.getTime())) {
    return NextResponse.json({ error: "Invalid since parameter" }, { status: 400 })
  }

  const events = await runWithTenant({ companyId: company.id, userId: user.id! }, async () => {
    return db.personEvent.findMany({
      where: {
        companyId: company.id,
        ...(since ? { createdAt: { gt: since } } : {}),
      },
      orderBy: { createdAt: "asc" },
    })
  })

  return NextResponse.json({ data: events })
}
