import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth-utils"

export async function GET() {
  const user = await getCurrentUser()

  if (!user || user.systemRole !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const sources = await db.regulatorySource.findMany({
    orderBy: { lastFetchedAt: "desc" },
    include: {
      _count: {
        select: {
          evidence: true,
          monitoringAlerts: true,
        },
      },
    },
  })

  return NextResponse.json({ sources })
}
