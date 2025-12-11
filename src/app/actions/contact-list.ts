"use server"

import { db } from "@/lib/db"
import { requireAuth, requireCompany } from "@/lib/auth-utils"
import { ContactType } from "@prisma/client"

export interface ContactListParams {
  search?: string
  type?: ContactType | "ALL"
  segments?: ContactSegment[]
  page?: number
  limit?: number
}

export type ContactSegment = "VAT_PAYER" | "MISSING_EMAIL" | "NO_DOCUMENTS"

export async function getContactList(params: ContactListParams = {}) {
  const user = await requireAuth()
  const company = await requireCompany(user.id!)

  const { search, type, segments = [], page = 1, limit = 20 } = params
  const skip = (page - 1) * limit

  const segmentConditions = []
  if (segments.includes("VAT_PAYER")) {
    segmentConditions.push({ vatNumber: { not: null } })
  }
  if (segments.includes("MISSING_EMAIL")) {
    segmentConditions.push({
      OR: [
        { email: null },
        { email: "" },
      ],
    })
  }
  if (segments.includes("NO_DOCUMENTS")) {
    segmentConditions.push({
      AND: [
        { eInvoicesAsBuyer: { none: {} } },
        { eInvoicesAsSeller: { none: {} } },
      ],
    })
  }

  const where = {
    companyId: company.id,
    ...(type && type !== "ALL" && { type }),
    ...(search && {
      OR: [
        { name: { contains: search, mode: "insensitive" as const } },
        { oib: { contains: search } },
        { email: { contains: search, mode: "insensitive" as const } },
      ],
    }),
    ...(segmentConditions.length > 0 && { AND: segmentConditions }),
  }

  const [contacts, total] = await Promise.all([
    db.contact.findMany({
      where,
      orderBy: { name: "asc" },
      skip,
      take: limit,
      select: {
        id: true,
        name: true,
        type: true,
        oib: true,
        email: true,
        phone: true,
        city: true,
        _count: {
          select: {
            eInvoicesAsBuyer: true,
            eInvoicesAsSeller: true,
          },
        },
      },
    }),
    db.contact.count({ where }),
  ])

  return {
    contacts,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasMore: skip + contacts.length < total,
    },
  }
}
