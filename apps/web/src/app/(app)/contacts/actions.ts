"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@fiskai/db"
import { z } from "zod"
import { revalidatePath } from "next/cache"

// OIB is optional for contacts (foreign contacts may not have one)
const oibOptionalSchema = z.string().length(11).regex(/^\d+$/).optional().or(z.literal(""))

const contactSchema = z.object({
  type: z.enum(["CUSTOMER", "SUPPLIER", "BOTH"]),
  name: z.string().min(2, "Naziv mora imati najmanje 2 znaka"),
  oib: oibOptionalSchema,
  email: z.string().email("Neispravan email").optional().or(z.literal("")),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  zipCode: z.string().optional(),
  country: z.string().default("HR"),
})

export type ContactInput = z.infer<typeof contactSchema>

async function getCompanyId() {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Niste prijavljeni")

  const member = await prisma.companyMember.findFirst({
    where: { userId: session.user.id },
  })
  if (!member) throw new Error("Nemate pristup tvrtki")

  return member.companyId
}

export async function getContacts(params: {
  search?: string
  type?: "ALL" | "CUSTOMER" | "SUPPLIER" | "BOTH"
  page?: number
  limit?: number
}) {
  const companyId = await getCompanyId()
  const { search = "", type = "ALL", page = 1, limit = 12 } = params

  const where = {
    companyId,
    ...(type !== "ALL" && { type }),
    ...(search && {
      OR: [
        { name: { contains: search, mode: "insensitive" as const } },
        { oib: { contains: search } },
        { email: { contains: search, mode: "insensitive" as const } },
      ],
    }),
  }

  const [contacts, total] = await Promise.all([
    prisma.contact.findMany({
      where,
      orderBy: { name: "asc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        _count: { select: { invoices: true } },
      },
    }),
    prisma.contact.count({ where }),
  ])

  return {
    contacts,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasMore: page * limit < total,
    },
  }
}

export async function createContact(input: ContactInput) {
  try {
    const companyId = await getCompanyId()
    const parsed = contactSchema.safeParse(input)

    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0]?.message || "Neispravni podaci" }
    }

    const contact = await prisma.contact.create({
      data: {
        companyId,
        type: parsed.data.type,
        name: parsed.data.name,
        oib: parsed.data.oib || null,
        email: parsed.data.email || null,
        phone: parsed.data.phone || null,
        address: parsed.data.address || null,
        city: parsed.data.city || null,
        zipCode: parsed.data.zipCode || null,
        country: parsed.data.country,
      },
    })

    revalidatePath("/contacts")
    return { success: true, contactId: contact.id }
  } catch (error) {
    console.error("Create contact error:", error)
    return { success: false, error: "Greška pri stvaranju kontakta" }
  }
}

export async function updateContact(id: string, input: ContactInput) {
  try {
    const companyId = await getCompanyId()
    const parsed = contactSchema.safeParse(input)

    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0]?.message || "Neispravni podaci" }
    }

    await prisma.contact.update({
      where: { id, companyId },
      data: {
        type: parsed.data.type,
        name: parsed.data.name,
        oib: parsed.data.oib || null,
        email: parsed.data.email || null,
        phone: parsed.data.phone || null,
        address: parsed.data.address || null,
        city: parsed.data.city || null,
        zipCode: parsed.data.zipCode || null,
        country: parsed.data.country,
      },
    })

    revalidatePath("/contacts")
    return { success: true }
  } catch (error) {
    console.error("Update contact error:", error)
    return { success: false, error: "Greška pri ažuriranju kontakta" }
  }
}

export async function deleteContact(id: string) {
  try {
    const companyId = await getCompanyId()

    await prisma.contact.delete({
      where: { id, companyId },
    })

    revalidatePath("/contacts")
    return { success: true }
  } catch (error) {
    console.error("Delete contact error:", error)
    return { success: false, error: "Greška pri brisanju kontakta" }
  }
}

export async function getContact(id: string) {
  const companyId = await getCompanyId()

  const contact = await prisma.contact.findFirst({
    where: { id, companyId },
  })

  return contact
}
