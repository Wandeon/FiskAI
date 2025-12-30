import type { Company } from "@prisma/client"
import { db } from "@/lib/db"
import { logServiceBoundarySnapshot } from "@/lib/audit-hooks"
import { runWithAuditContext } from "@/lib/audit-context"

export interface UpdateTenantInput {
  name?: string
  email?: string | null
  phone?: string | null
  address?: string
  city?: string
  postalCode?: string
  country?: string
  legalForm?: string | null
  isVatPayer?: boolean
}

export async function getTenantById(companyId: string): Promise<Company | null> {
  return db.company.findUnique({ where: { id: companyId } })
}

export async function getTenantForUser(userId: string): Promise<Company | null> {
  const companyUser = await db.companyUser.findFirst({
    where: { userId, isDefault: true },
    select: { company: true },
  })

  return companyUser?.company ?? null
}

export async function updateTenant(
  companyId: string,
  input: UpdateTenantInput,
  actorId: string,
  reason: string
): Promise<Company> {
  const before = await db.company.findUnique({ where: { id: companyId } })
  if (!before) {
    throw new Error("Tenant not found")
  }

  const updated = await runWithAuditContext(
    { actorId, reason },
    async () =>
      db.company.update({
        where: { id: companyId },
        data: {
          name: input.name ?? undefined,
          email: input.email ?? undefined,
          phone: input.phone ?? undefined,
          address: input.address ?? undefined,
          city: input.city ?? undefined,
          postalCode: input.postalCode ?? undefined,
          country: input.country ?? undefined,
          legalForm: input.legalForm ?? undefined,
          isVatPayer: input.isVatPayer ?? undefined,
        },
      })
  )

  await logServiceBoundarySnapshot({
    companyId,
    userId: actorId,
    actor: actorId,
    reason,
    action: "UPDATE",
    entity: "Company",
    entityId: companyId,
    before: {
      name: before.name,
      email: before.email,
      phone: before.phone,
      address: before.address,
      city: before.city,
      postalCode: before.postalCode,
      country: before.country,
      legalForm: before.legalForm,
      isVatPayer: before.isVatPayer,
    },
    after: {
      name: updated.name,
      email: updated.email,
      phone: updated.phone,
      address: updated.address,
      city: updated.city,
      postalCode: updated.postalCode,
      country: updated.country,
      legalForm: updated.legalForm,
      isVatPayer: updated.isVatPayer,
    },
  })

  return updated
}
