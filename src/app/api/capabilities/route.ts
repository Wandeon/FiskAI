import { NextResponse } from "next/server"
import { getCurrentUser, getCurrentCompany } from "@/lib/auth-utils"
import { deriveCapabilities } from "@/lib/capabilities"

export async function GET() {
  const user = await getCurrentUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const company = await getCurrentCompany(user.id!)

  if (!company) {
    return NextResponse.json({ error: "No company found" }, { status: 404 })
  }

  const capabilities = deriveCapabilities(company)
  return NextResponse.json(capabilities)
}
