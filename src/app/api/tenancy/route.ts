import { NextRequest, NextResponse } from "next/server"
import { requireAuth, requireCompany } from "@/lib/auth-utils"
import { updateTenant } from "@/lib/tenancy/service"

export async function GET() {
  const user = await requireAuth()
  const company = await requireCompany(user.id!)

  return NextResponse.json({
    tenant: {
      id: company.id,
      name: company.name,
      email: company.email,
      phone: company.phone,
      address: company.address,
      city: company.city,
      postalCode: company.postalCode,
      country: company.country,
      legalForm: company.legalForm,
      isVatPayer: company.isVatPayer,
      createdAt: company.createdAt,
      updatedAt: company.updatedAt,
    },
  })
}

export async function PATCH(req: NextRequest) {
  const user = await requireAuth()
  const company = await requireCompany(user.id!)
  const body = await req.json()

  const updated = await updateTenant(company.id, body, user.id!, body.reason ?? "tenant_update")

  return NextResponse.json({
    tenant: {
      id: updated.id,
      name: updated.name,
      email: updated.email,
      phone: updated.phone,
      address: updated.address,
      city: updated.city,
      postalCode: updated.postalCode,
      country: updated.country,
      legalForm: updated.legalForm,
      isVatPayer: updated.isVatPayer,
      updatedAt: updated.updatedAt,
    },
  })
}
