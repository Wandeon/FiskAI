"use server"

import { auth } from "@/lib/auth"
import { prisma, InvoiceStatus, Prisma } from "@fiskai/db"

async function getCompanyId() {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Niste prijavljeni")
  const member = await prisma.companyMember.findFirst({
    where: { userId: session.user.id },
  })
  if (!member) throw new Error("Nemate pristup tvrtki")
  return member.companyId
}

const VALID_STATUSES: string[] = Object.values(InvoiceStatus)

export async function getInvoices(params: {
  search?: string
  status?: string
  page?: number
  limit?: number
}) {
  const companyId = await getCompanyId()
  const { search = "", status, page = 1, limit = 20 } = params

  const statusFilter = status && status !== "ALL" && VALID_STATUSES.includes(status)
    ? status as InvoiceStatus
    : undefined

  const where: Prisma.InvoiceWhereInput = {
    companyId,
    ...(statusFilter && { status: statusFilter }),
    ...(search && {
      OR: [
        { invoiceNumberFull: { contains: search } },
        { contact: { name: { contains: search, mode: "insensitive" } } },
      ],
    }),
  }

  const [invoices, total] = await Promise.all([
    prisma.invoice.findMany({
      where,
      orderBy: { issueDate: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: { contact: { select: { name: true } } },
    }),
    prisma.invoice.count({ where }),
  ])

  return {
    invoices: invoices.map((inv) => ({
      id: inv.id,
      invoiceNumberFull: inv.invoiceNumberFull,
      status: inv.status,
      issueDate: inv.issueDate,
      dueDate: inv.dueDate,
      totalCents: inv.totalCents,
      currency: inv.currency,
      contactName: inv.contact?.name || null,
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasMore: page * limit < total,
    },
  }
}
