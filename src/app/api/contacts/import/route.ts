import { NextResponse } from "next/server"
import { getCurrentUser, getCurrentCompany } from "@/lib/auth-utils"
import { db } from "@/lib/db"
import { z } from "zod"
import { revalidatePath } from "next/cache"
import { upsertOrganizationFromContact } from "@/lib/master-data/organization-service"
import { parseBody, isValidationError, formatValidationError } from "@/lib/api/validation"

const rowSchema = z.object({
  type: z.enum(["CUSTOMER", "SUPPLIER", "BOTH"]),
  name: z.string().min(1, "Name is required"),
  oib: z
    .string()
    .regex(/^[0-9]{11}$/, "OIB must be exactly 11 digits")
    .optional()
    .or(z.literal("")),
  email: z.string().email("Invalid email format").optional().or(z.literal("")),
  phone: z.string().max(50, "Phone number too long").optional(),
  address: z.string().max(255, "Address too long").optional(),
  city: z.string().max(100, "City name too long").optional(),
  postalCode: z.string().max(20, "Postal code too long").optional(),
  country: z.string().max(100, "Country name too long").optional(),
  paymentTermsDays: z.number().int().min(0).max(365).optional(),
})

const importSchema = z.object({
  rows: z
    .array(rowSchema)
    .min(1, "At least one contact is required")
    .max(500, "Maximum 500 contacts per import"),
})

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const company = await getCurrentCompany(user.id!)

    if (!company) {
      return NextResponse.json({ error: "No company found" }, { status: 404 })
    }

    // Use parseBody for consistent validation
    let parsed: z.infer<typeof importSchema>
    try {
      parsed = await parseBody(request, importSchema)
    } catch (error) {
      if (isValidationError(error)) {
        return NextResponse.json(formatValidationError(error), { status: 400 })
      }
      return NextResponse.json({ error: "Neispravni podaci" }, { status: 400 })
    }

    const rows = parsed.rows.filter((row) => row.name.trim().length > 0)
    if (rows.length === 0) {
      return NextResponse.json({ error: "Prazan CSV" }, { status: 400 })
    }

    // Check for duplicate OIBs within the import
    const oibs = rows.map((r) => r.oib).filter(Boolean) as string[]
    const duplicateOibs = oibs.filter((oib, i) => oibs.indexOf(oib) !== i)
    if (duplicateOibs.length > 0) {
      return NextResponse.json(
        { error: `Duplikat OIB u CSV-u: ${duplicateOibs[0]}` },
        { status: 400 }
      )
    }

    // Check for existing OIBs in database
    if (oibs.length > 0) {
      const existingContacts = await db.contact.findMany({
        where: {
          companyId: company.id,
          oib: { in: oibs },
        },
        select: { oib: true },
      })
      if (existingContacts.length > 0) {
        return NextResponse.json(
          { error: `Kontakt s OIB-om ${existingContacts[0].oib} vec postoji` },
          { status: 400 }
        )
      }
    }

    await db.$transaction(async (tx) => {
      for (const row of rows) {
        const { organizationId } = await upsertOrganizationFromContact(tx, company.id, {
          name: row.name,
          oib: row.oib,
          email: row.email,
          phone: row.phone,
          address: row.address,
          city: row.city,
          postalCode: row.postalCode,
          country: row.country,
        })

        await tx.contact.create({
          data: {
            companyId: company.id,
            type: row.type,
            name: row.name,
            oib: row.oib || null,
            email: row.email || null,
            phone: row.phone || null,
            address: row.address || null,
            city: row.city || null,
            postalCode: row.postalCode || null,
            country: row.country || "HR",
            paymentTermsDays: row.paymentTermsDays ?? 15,
            organizationId,
          },
        })
      }
    })

    revalidatePath("/contacts")
    return NextResponse.json({ success: true, created: rows.length })
  } catch (error) {
    console.error("Import failed", error)
    return NextResponse.json({ error: "Greska pri uvozu" }, { status: 500 })
  }
}
