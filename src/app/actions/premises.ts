"use server"

import { z } from "zod"
import { db } from "@/lib/db"
import { requireAuth, requireCompanyWithContext } from "@/lib/auth-utils"
import { revalidatePath } from "next/cache"

// Zod schemas for validation
const createPremisesSchema = z.object({
  companyId: z.string().uuid(),
  code: z.number().int().positive("Kod mora biti pozitivan broj"),
  name: z.string().min(1, "Naziv je obavezan"),
  address: z.string().optional(),
  isDefault: z.boolean().optional(),
})

const updatePremisesSchema = z.object({
  code: z.number().int().positive("Kod mora biti pozitivan broj").optional(),
  name: z.string().min(1, "Naziv je obavezan").optional(),
  address: z.string().optional(),
  isDefault: z.boolean().optional(),
})

const createDeviceSchema = z.object({
  companyId: z.string().uuid(),
  businessPremisesId: z.string().uuid(),
  code: z.number().int().positive("Kod mora biti pozitivan broj"),
  name: z.string().min(1, "Naziv je obavezan"),
  isDefault: z.boolean().optional(),
})

const updateDeviceSchema = z.object({
  code: z.number().int().positive("Kod mora biti pozitivan broj").optional(),
  name: z.string().min(1, "Naziv je obavezan").optional(),
  isDefault: z.boolean().optional(),
})

const uuidSchema = z.string().uuid()

interface ActionResult {
  success: boolean
  error?: string
  data?: unknown
}

export async function createPremises(input: unknown): Promise<ActionResult> {
  try {
    const validated = createPremisesSchema.safeParse(input)
    if (!validated.success) {
      return { success: false, error: validated.error.issues[0]?.message || "Neispravni podaci" }
    }
    const data = validated.data

    const user = await requireAuth()

    return requireCompanyWithContext(user.id!, async (company) => {
      // Check for duplicate code
      const existing = await db.businessPremises.findUnique({
        where: {
          companyId_code: {
            companyId: company.id,
            code: data.code,
          },
        },
      })

      if (existing) {
        return { success: false, error: `Poslovni prostor s kodom ${data.code} već postoji` }
      }

      // If this should be default, unset other defaults first
      if (data.isDefault) {
        await db.businessPremises.updateMany({
          where: { companyId: company.id, isDefault: true },
          data: { isDefault: false },
        })
      }

      const premises = await db.businessPremises.create({
        data: {
          companyId: company.id,
          code: data.code,
          name: data.name,
          address: data.address,
          isDefault: data.isDefault ?? false,
          isActive: true,
        },
      })

      revalidatePath("/settings/premises")
      return { success: true, data: premises }
    })
  } catch (error) {
    console.error("Failed to create premises:", error)
    return { success: false, error: "Greška pri stvaranju poslovnog prostora" }
  }
}

export async function updatePremises(id: unknown, input: unknown): Promise<ActionResult> {
  try {
    const idResult = uuidSchema.safeParse(id)
    if (!idResult.success) {
      return { success: false, error: "Nevažeći ID poslovnog prostora" }
    }
    const validatedId = idResult.data

    const validated = updatePremisesSchema.safeParse(input)
    if (!validated.success) {
      return { success: false, error: validated.error.issues[0]?.message || "Neispravni podaci" }
    }
    const data = validated.data

    const user = await requireAuth()

    return requireCompanyWithContext(user.id!, async (company) => {
      const existing = await db.businessPremises.findFirst({
        where: { id: validatedId, companyId: company.id },
      })
      if (!existing) {
        return { success: false, error: "Poslovni prostor nije pronađen" }
      }

      // Check for duplicate code if code is being changed
      if (data.code && data.code !== existing.code) {
        const duplicate = await db.businessPremises.findUnique({
          where: {
            companyId_code: {
              companyId: company.id,
              code: data.code,
            },
          },
        })
        if (duplicate) {
          return { success: false, error: `Poslovni prostor s kodom ${data.code} već postoji` }
        }
      }

      // If this should be default, unset other defaults first
      if (data.isDefault) {
        await db.businessPremises.updateMany({
          where: { companyId: company.id, isDefault: true, id: { not: validatedId } },
          data: { isDefault: false },
        })
      }

      const premises = await db.businessPremises.update({
        where: { id: validatedId },
        data,
      })

      revalidatePath("/settings/premises")
      return { success: true, data: premises }
    })
  } catch (error) {
    console.error("Failed to update premises:", error)
    return { success: false, error: "Greška pri ažuriranju poslovnog prostora" }
  }
}

export async function deletePremises(id: unknown): Promise<ActionResult> {
  try {
    const idResult = uuidSchema.safeParse(id)
    if (!idResult.success) {
      return { success: false, error: "Nevažeći ID poslovnog prostora" }
    }
    const validatedId = idResult.data

    const user = await requireAuth()

    return requireCompanyWithContext(user.id!, async (company) => {
      // Check if premises has any devices
      const deviceCount = await db.paymentDevice.count({
        where: { businessPremisesId: validatedId, companyId: company.id },
      })

      if (deviceCount > 0) {
        return {
          success: false,
          error: "Nije moguće obrisati poslovni prostor koji ima naplatne uređaje",
        }
      }

      // Check if premises has any invoice sequences
      const sequenceCount = await db.invoiceSequence.count({
        where: { businessPremisesId: validatedId, companyId: company.id },
      })

      if (sequenceCount > 0) {
        return {
          success: false,
          error: "Nije moguće obrisati poslovni prostor koji ima povijesne račune",
        }
      }

      const deleted = await db.businessPremises.deleteMany({
        where: { id: validatedId, companyId: company.id },
      })

      if (deleted.count === 0) {
        return { success: false, error: "Poslovni prostor nije pronađen" }
      }

      revalidatePath("/settings/premises")
      return { success: true }
    })
  } catch (error) {
    console.error("Failed to delete premises:", error)
    return { success: false, error: "Greška pri brisanju poslovnog prostora" }
  }
}

export async function createDevice(input: unknown): Promise<ActionResult> {
  try {
    const validated = createDeviceSchema.safeParse(input)
    if (!validated.success) {
      return { success: false, error: validated.error.issues[0]?.message || "Neispravni podaci" }
    }
    const data = validated.data

    const user = await requireAuth()

    return requireCompanyWithContext(user.id!, async (company) => {
      const premises = await db.businessPremises.findFirst({
        where: { id: data.businessPremisesId, companyId: company.id },
      })

      if (!premises) {
        return { success: false, error: "Poslovni prostor nije pronađen" }
      }

      // Check for duplicate code within premises
      const existing = await db.paymentDevice.findUnique({
        where: {
          businessPremisesId_code: {
            businessPremisesId: data.businessPremisesId,
            code: data.code,
          },
        },
      })

      if (existing) {
        return {
          success: false,
          error: `Naplatni uređaj s kodom ${data.code} već postoji u ovom poslovnom prostoru`,
        }
      }

      // If this should be default, unset other defaults first
      if (data.isDefault) {
        await db.paymentDevice.updateMany({
          where: {
            businessPremisesId: data.businessPremisesId,
            companyId: company.id,
            isDefault: true,
          },
          data: { isDefault: false },
        })
      }

      const device = await db.paymentDevice.create({
        data: {
          companyId: company.id,
          businessPremisesId: data.businessPremisesId,
          code: data.code,
          name: data.name,
          isDefault: data.isDefault ?? false,
          isActive: true,
        },
      })

      revalidatePath("/settings/premises")
      return { success: true, data: device }
    })
  } catch (error) {
    console.error("Failed to create device:", error)
    return { success: false, error: "Greška pri stvaranju naplatnog uređaja" }
  }
}

export async function updateDevice(id: unknown, input: unknown): Promise<ActionResult> {
  try {
    const idResult = uuidSchema.safeParse(id)
    if (!idResult.success) {
      return { success: false, error: "Nevažeći ID naplatnog uređaja" }
    }
    const validatedId = idResult.data

    const validated = updateDeviceSchema.safeParse(input)
    if (!validated.success) {
      return { success: false, error: validated.error.issues[0]?.message || "Neispravni podaci" }
    }
    const data = validated.data

    const user = await requireAuth()

    return requireCompanyWithContext(user.id!, async (company) => {
      const existing = await db.paymentDevice.findFirst({
        where: { id: validatedId, companyId: company.id },
      })
      if (!existing) {
        return { success: false, error: "Naplatni uređaj nije pronađen" }
      }

      // Check for duplicate code if code is being changed
      if (data.code && data.code !== existing.code) {
        const duplicate = await db.paymentDevice.findUnique({
          where: {
            businessPremisesId_code: {
              businessPremisesId: existing.businessPremisesId,
              code: data.code,
            },
          },
        })
        if (duplicate) {
          return { success: false, error: `Naplatni uređaj s kodom ${data.code} već postoji` }
        }
      }

      // If this should be default, unset other defaults first
      if (data.isDefault) {
        await db.paymentDevice.updateMany({
          where: {
            businessPremisesId: existing.businessPremisesId,
            companyId: company.id,
            isDefault: true,
            id: { not: validatedId },
          },
          data: { isDefault: false },
        })
      }

      const device = await db.paymentDevice.update({
        where: { id: validatedId },
        data,
      })

      revalidatePath("/settings/premises")
      return { success: true, data: device }
    })
  } catch (error) {
    console.error("Failed to update device:", error)
    return { success: false, error: "Greška pri ažuriranju naplatnog uređaja" }
  }
}

export async function deleteDevice(id: unknown): Promise<ActionResult> {
  try {
    const idResult = uuidSchema.safeParse(id)
    if (!idResult.success) {
      return { success: false, error: "Nevažeći ID naplatnog uređaja" }
    }
    const validatedId = idResult.data

    const user = await requireAuth()

    return requireCompanyWithContext(user.id!, async (company) => {
      const deleted = await db.paymentDevice.deleteMany({
        where: { id: validatedId, companyId: company.id },
      })

      if (deleted.count === 0) {
        return { success: false, error: "Naplatni uređaj nije pronađen" }
      }

      revalidatePath("/settings/premises")
      return { success: true }
    })
  } catch (error) {
    console.error("Failed to delete device:", error)
    return { success: false, error: "Greška pri brisanju naplatnog uređaja" }
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function getDefaultPremisesAndDevice(_companyId: unknown): Promise<{
  premises: { id: string; code: number; name: string } | null
  device: { id: string; code: number; name: string } | null
}> {
  // Note: _companyId is ignored - we get company from auth context
  const user = await requireAuth()

  return requireCompanyWithContext(user.id!, async (company) => {
    const premises = await db.businessPremises.findFirst({
      where: { companyId: company.id, isDefault: true, isActive: true },
      select: { id: true, code: true, name: true },
    })

    if (!premises) {
      return { premises: null, device: null }
    }

    const device = await db.paymentDevice.findFirst({
      where: { businessPremisesId: premises.id, isDefault: true, isActive: true },
      select: { id: true, code: true, name: true },
    })

    return { premises, device }
  })
}
