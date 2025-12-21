import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth-utils"
import { seedRegulatorySources } from "@/lib/regulatory-truth/scripts/seed-sources"

export async function POST() {
  const user = await getCurrentUser()

  if (!user || user.systemRole !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const result = await seedRegulatorySources()
    return NextResponse.json({ success: true, result })
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}
