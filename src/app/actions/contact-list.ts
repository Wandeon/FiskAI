"use server"

import { db } from "@/lib/db"
import { requireAuth, requireCompany } from "@/lib/auth-utils"
import { ContactType } from "@prisma/client"

export interface ContactListParams {
  search?: string
  type?: ContactType | "ALL"
  page?: number
  limit?: number
}

export async function getContactList(params: ContactListParams = {}) {
  const user = await requireAuth()
  const company = await requireCompany(user.id!)

  const { search, type, page = 1, limit = 20 } = params
  const skip = (page - 1) * limit

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
