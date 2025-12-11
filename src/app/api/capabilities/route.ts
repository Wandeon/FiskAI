import { NextResponse } from "next/server"
import { requireAuth, getCurrentCompany } from "@/lib/auth-utils"
import { deriveCapabilities } from "@/lib/capabilities"

export async function GET() {
  try {
    const user = await requireAuth()
    const company = await getCurrentCompany(user.id!)
    const capabilities = deriveCapabilities(company)
    return NextResponse.json(capabilities)
  } catch (error) {
    console.error("Failed to load capabilities", error)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
}
