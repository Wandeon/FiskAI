"use server"

import { z } from "zod"
import { db } from "@/lib/db"
import { requireAuth, getCurrentCompany } from "@/lib/auth-utils"
import { revalidatePath } from "next/cache"
import { getEntitlementsForLegalForm } from "@/lib/modules/definitions"
import { oibSchema } from "@/lib/validations/oib"

// =============================================================================
// STEP 1: IDENTITY
// =============================================================================

const step1Schema = z.object({
  name: z.string().min(1, "Ime je obavezno"),
  oib: oibSchema,
  address: z.string().min(1, "Adresa je obavezna"),
  city: z.string().min(1, "Grad je obavezan"),
  postalCode: z.string().min(1, "Poštanski broj je obavezan"),
  foundingDate: z.string().optional(), // ISO date string
})

export type Step1Data = z.infer<typeof step1Schema>

/**
 * Save Step 1 data: Identity (OIB, name, address)
 * Creates or updates company with OBRT_PAUSAL legal form
 */
export async function savePausalniStep1(data: Step1Data) {
  const user = await requireAuth()

  const validated = step1Schema.safeParse(data)
  if (!validated.success) {
    return { error: "Neispravni podaci", details: validated.error.flatten() }
  }

  const formData = validated.data

  try {
    // Check if company already exists for this user
    const existingCompany = await getCurrentCompany(user.id!)

    if (existingCompany) {
      // Update existing company
      await db.company.update({
        where: { id: existingCompany.id },
        data: {
          name: formData.name,
          oib: formData.oib,
          address: formData.address,
          city: formData.city,
          postalCode: formData.postalCode,
          country: "HR",
          legalForm: "OBRT_PAUSAL",
          entitlements: getEntitlementsForLegalForm("OBRT_PAUSAL"),
          featureFlags: {
            ...(existingCompany.featureFlags as Record<string, unknown>),
            foundingDate: formData.foundingDate,
          },
        },
      })

      revalidatePath("/pausalni/onboarding")
      return { success: true, companyId: existingCompany.id }
    }

    // Check if OIB already exists
    const oibExists = await db.company.findUnique({
      where: { oib: formData.oib },
      include: { users: true },
    })

    if (oibExists) {
      const userMembership = oibExists.users.find((u) => u.userId === user.id)
      if (userMembership) {
        // User already has access, update company
        await db.company.update({
          where: { id: oibExists.id },
          data: {
            name: formData.name,
            address: formData.address,
            city: formData.city,
            postalCode: formData.postalCode,
            country: "HR",
            legalForm: "OBRT_PAUSAL",
            entitlements: getEntitlementsForLegalForm("OBRT_PAUSAL"),
            featureFlags: {
              ...(oibExists.featureFlags as Record<string, unknown>),
              foundingDate: formData.foundingDate,
            },
          },
        })

        revalidatePath("/pausalni/onboarding")
        return { success: true, companyId: oibExists.id }
      }
      return {
        error:
          "Tvrtka s ovim OIB-om je već registrirana. Ako ste zaposlenik, zamolite administratora za pozivnicu.",
      }
    }

    // Create new company
    const [, newCompany] = await db.$transaction([
      db.companyUser.updateMany({
        where: { userId: user.id! },
        data: { isDefault: false },
      }),
      db.company.create({
        data: {
          name: formData.name,
          oib: formData.oib,
          address: formData.address,
          city: formData.city,
          postalCode: formData.postalCode,
          country: "HR",
          legalForm: "OBRT_PAUSAL",
          email: null,
          iban: null,
          isVatPayer: false,
          entitlements: getEntitlementsForLegalForm("OBRT_PAUSAL"),
          featureFlags: {
            foundingDate: formData.foundingDate,
          },
          users: {
            create: {
              userId: user.id!,
              role: "OWNER",
              isDefault: true,
            },
          },
        },
      }),
    ])

    revalidatePath("/pausalni/onboarding")
    return { success: true, companyId: newCompany.id }
  } catch (error) {
    console.error("[Pausalni Onboarding] Step 1 failed:", error)
    return { error: "Došlo je do greške. Molimo pokušajte ponovno." }
  }
}

// =============================================================================
// STEP 2: SITUATION
// =============================================================================

const step2Schema = z.object({
  employedElsewhere: z.boolean(),
  acceptsCash: z.boolean(),
  isVatPayer: z.boolean(),
  expectedIncomeRange: z.enum(["under30", "30to60", "60to100", "over100"]),
})

export type Step2Data = z.infer<typeof step2Schema>

/**
 * Save Step 2 data: Situation (employment, cash, VAT, income range)
 */
export async function savePausalniStep2(data: Step2Data) {
  const user = await requireAuth()
  const company = await getCurrentCompany(user.id!)

  if (!company) {
    return { error: "Molimo najprije popunite prvi korak" }
  }

  const validated = step2Schema.safeParse(data)
  if (!validated.success) {
    return { error: "Neispravni podaci", details: validated.error.flatten() }
  }

  const formData = validated.data

  try {
    const existingFlags = (company.featureFlags as Record<string, unknown>) || {}

    await db.company.update({
      where: { id: company.id },
      data: {
        isVatPayer: formData.isVatPayer,
        vatNumber: formData.isVatPayer ? `HR${company.oib}` : null,
        featureFlags: {
          ...existingFlags,
          employedElsewhere: formData.employedElsewhere,
          acceptsCash: formData.acceptsCash,
          expectedIncomeRange: formData.expectedIncomeRange,
        },
      },
    })

    revalidatePath("/pausalni/onboarding")
    return { success: true }
  } catch (error) {
    console.error("[Pausalni Onboarding] Step 2 failed:", error)
    return { error: "Došlo je do greške. Molimo pokušajte ponovno." }
  }
}

// =============================================================================
// STEP 3: SETUP (Final)
// =============================================================================

const step3Schema = z.object({
  iban: z.string().optional(),
  hasFiscalizationCert: z.boolean().optional(),
  // Logo and bank connection are handled separately
})

export type Step3Data = z.infer<typeof step3Schema>

/**
 * Save Step 3 data: Setup (IBAN, fiscalization, etc.)
 * Marks onboarding as complete
 */
export async function savePausalniStep3(data: Step3Data & { email: string }) {
  const user = await requireAuth()
  const company = await getCurrentCompany(user.id!)

  if (!company) {
    return { error: "Molimo najprije popunite prethodne korake" }
  }

  const validated = step3Schema.safeParse(data)
  if (!validated.success) {
    return { error: "Neispravni podaci", details: validated.error.flatten() }
  }

  // Email is required for onboarding completion
  if (!data.email?.includes("@")) {
    return { error: "Email adresa je obavezna" }
  }

  try {
    const existingFlags = (company.featureFlags as Record<string, unknown>) || {}

    await db.company.update({
      where: { id: company.id },
      data: {
        email: data.email,
        iban: data.iban || null,
        featureFlags: {
          ...existingFlags,
          hasFiscalizationCert: data.hasFiscalizationCert,
          onboardingCompletedAt: new Date().toISOString(),
        },
        onboardingStep: 3, // Mark as complete
      },
    })

    revalidatePath("/dashboard")
    revalidatePath("/pausalni/onboarding")
    return { success: true }
  } catch (error) {
    console.error("[Pausalni Onboarding] Step 3 failed:", error)
    return { error: "Došlo je do greške. Molimo pokušajte ponovno." }
  }
}

// =============================================================================
// GET CURRENT DATA
// =============================================================================

export interface PausalniOnboardingData {
  // Step 1
  name: string | null
  oib: string | null
  address: string | null
  city: string | null
  postalCode: string | null
  foundingDate?: string
  // Step 2
  employedElsewhere?: boolean
  acceptsCash?: boolean
  isVatPayer: boolean
  expectedIncomeRange?: string
  // Step 3
  email: string | null
  iban: string | null
  hasFiscalizationCert?: boolean
}

/**
 * Get current onboarding data for the paušalni wizard
 */
export async function getPausalniOnboardingData(): Promise<PausalniOnboardingData | null> {
  const user = await requireAuth()
  const company = await getCurrentCompany(user.id!)

  if (!company) {
    return null
  }

  const featureFlags = (company.featureFlags as Record<string, unknown>) || {}

  return {
    // Step 1
    name: company.name,
    oib: company.oib,
    address: company.address,
    city: company.city,
    postalCode: company.postalCode,
    foundingDate: featureFlags.foundingDate as string | undefined,
    // Step 2
    employedElsewhere: featureFlags.employedElsewhere as boolean | undefined,
    acceptsCash: featureFlags.acceptsCash as boolean | undefined,
    isVatPayer: company.isVatPayer,
    expectedIncomeRange: featureFlags.expectedIncomeRange as string | undefined,
    // Step 3
    email: company.email,
    iban: company.iban,
    hasFiscalizationCert: featureFlags.hasFiscalizationCert as boolean | undefined,
  }
}
