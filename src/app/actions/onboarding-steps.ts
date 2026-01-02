"use server"

import { z } from "zod"
import { db } from "@/lib/db"
import { requireAuth, getCurrentCompany } from "@/lib/auth-utils"
import { revalidatePath } from "next/cache"

const stepSchema = z.number().int().min(1).max(10)

export async function getValidatedOnboardingStep(): Promise<number> {
  const user = await requireAuth()
  const company = await getCurrentCompany(user.id!)
  if (!company) return 1
  return company.onboardingStep || 1
}

interface CompanyValidationData {
  name?: string | null
  oib?: string | null
  legalForm?: string | null
  email?: string | null
  featureFlags?: Record<string, unknown> | null
}

async function validateStep(company: CompanyValidationData, step: number): Promise<boolean> {
  const featureFlags = company.featureFlags as Record<string, unknown> | null
  switch (step) {
    case 1:
      return !!(company.name?.trim() && company.oib?.match(/^\d{11}$/) && company.legalForm)
    case 2:
      return true
    case 3:
      return true
    case 4:
      return !!company.email?.includes("@")
    case 5:
      if (company.legalForm !== "OBRT_PAUSAL") return true
      return !!(
        typeof featureFlags?.acceptsCash === "boolean" &&
        typeof featureFlags?.hasEmployees === "boolean" &&
        typeof featureFlags?.employedElsewhere === "boolean" &&
        typeof featureFlags?.hasEuVatId === "boolean" &&
        featureFlags?.taxBracket
      )
    case 6:
      return true
    default:
      return false
  }
}

export async function advanceOnboardingStep(
  targetStep: unknown
): Promise<{ success: boolean; error?: string }> {
  const validated = stepSchema.safeParse(targetStep)
  if (!validated.success) {
    return { success: false, error: "Invalid step number" }
  }
  const validatedTargetStep = validated.data

  const user = await requireAuth()
  const company = await getCurrentCompany(user.id!)
  if (!company) return { success: false, error: "No company found" }
  const currentStep = company.onboardingStep || 1
  if (validatedTargetStep > currentStep + 1) return { success: false, error: "Cannot skip steps" }
  if (validatedTargetStep <= currentStep) return { success: true }
  const isCurrentStepValid = await validateStep(company, currentStep)
  if (!isCurrentStepValid) return { success: false, error: "Current step is not complete" }
  await db.company.update({
    where: { id: company.id },
    data: { onboardingStep: validatedTargetStep },
  })
  revalidatePath("/onboarding")
  return { success: true }
}
