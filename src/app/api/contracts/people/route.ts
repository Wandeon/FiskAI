import { NextResponse } from "next/server"
import { getCurrentCompany, getCurrentUser } from "@/lib/auth-utils"
import { db, runWithTenant } from "@/lib/db"
import { requirePermission } from "@/lib/rbac"

export async function GET() {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const company = await getCurrentCompany(user.id!)
  if (!company) {
    return NextResponse.json({ error: "No company found" }, { status: 404 })
  }

  await requirePermission(user.id!, company.id, "person:read")

  const people = await runWithTenant({ companyId: company.id, userId: user.id! }, async () => {
    return db.person.findMany({
      where: { companyId: company.id },
      select: {
        id: true,
        fullName: true,
        oib: true,
        email: true,
        phone: true,
        iban: true,
        addressLine1: true,
        addressLine2: true,
        city: true,
        postalCode: true,
        country: true,
        updatedAt: true,
        contactRoles: true,
        employeeRoles: true,
        directorRoles: true,
      },
      orderBy: { updatedAt: "desc" },
    })
  })

  return NextResponse.json({ data: people })
}
