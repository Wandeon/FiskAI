import { NextResponse } from "next/server"
import { requireAuth, requireCompanyWithContext } from "@/lib/auth-utils"
import { db } from "@/lib/db"
import { z } from "zod"
import { revalidatePath } from "next/cache"
import { sanitizeCsvValue } from "@/lib/csv-sanitize"
import { parseBody, isValidationError, formatValidationError } from "@/lib/api/validation"

const rowSchema = z.object({
  name: z.string().min(1, "Product name is required").max(255, "Product name too long"),
  sku: z.string().max(100, "SKU too long").optional(),
  unit: z.string().max(20, "Unit too long").optional(),
  price: z.number().min(0, "Price cannot be negative").optional(),
  vatRate: z
    .number()
    .min(0, "VAT rate cannot be negative")
    .max(100, "VAT rate cannot exceed 100%")
    .optional(),
  vatCategory: z.string().max(10, "VAT category too long").optional(),
})

const importSchema = z.object({
  rows: z
    .array(rowSchema)
    .min(1, "At least one product is required")
    .max(500, "Maximum 500 products per import"),
})

export async function POST(request: Request) {
  try {
    const user = await requireAuth()

    return requireCompanyWithContext(user.id!, async (company) => {
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

      // Check for duplicate SKUs in existing products (fixes #727)
      const skusToImport = rows.filter((r) => r.sku).map((r) => r.sku!)
      if (skusToImport.length > 0) {
        const existingSkus = await db.product.findMany({
          where: {
            // companyId auto-filtered by tenant isolation extension
            sku: { in: skusToImport },
          },
          select: { sku: true },
        })
        const existingSkuSet = new Set(existingSkus.map((p) => p.sku))
        const duplicates = rows.filter((r) => r.sku && existingSkuSet.has(r.sku))
        if (duplicates.length > 0) {
          return NextResponse.json(
            {
              error: `Proizvodi s duplikatnim SKU-ovima već postoje: ${duplicates
                .map((d) => d.sku)
                .join(", ")}`,
            },
            { status: 400 }
          )
        }
      }

      await db.$transaction(
        rows.map((row) =>
          db.product.create({
            data: {
              companyId: company.id,
              // Sanitize string values to prevent CSV formula injection (fixes #858)
              name: sanitizeCsvValue(row.name),
              sku: row.sku ? sanitizeCsvValue(row.sku) : null,
              unit: row.unit ? sanitizeCsvValue(row.unit) : "kom",
              price: row.price ?? 0,
              vatRate: row.vatRate ?? 25,
              vatCategory: row.vatCategory ? sanitizeCsvValue(row.vatCategory) : "S",
              description: null,
              isActive: true,
            },
          })
        )
      )

      revalidatePath("/products")
      return NextResponse.json({ success: true, created: rows.length })
    })
  } catch (error) {
    console.error("Import failed", error)
    return NextResponse.json({ error: "Greška pri uvozu" }, { status: 500 })
  }
}
