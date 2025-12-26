// src/lib/regulatory-truth/quality/coverage-gate.ts
import { db } from "@/lib/db"
import { generateCoverageReport, saveCoverageReport, type CoverageMetrics } from "./coverage-report"

export interface GateResult {
  passed: boolean
  coverageReport: CoverageMetrics
  blockers: string[]
  recommendations: string[]
}

/**
 * Minimum requirements for each content type
 */
const MINIMUM_REQUIREMENTS: Record<string, { minScore: number; required: string[] }> = {
  LOGIC: {
    minScore: 0.6,
    required: ["claims"],
  },
  PROCESS: {
    minScore: 0.7,
    required: ["processes"],
  },
  REFERENCE: {
    minScore: 0.8,
    required: ["referenceTables"],
  },
  DOCUMENT: {
    minScore: 0.7,
    required: ["assets"],
  },
  TRANSITIONAL: {
    minScore: 0.8,
    required: ["provisions"],
  },
  MIXED: {
    minScore: 0.5,
    required: [], // At least some extraction
  },
  GENERAL: {
    minScore: 0.4,
    required: [],
  },
}

/**
 * Run coverage gate - determines if extraction is complete enough for review
 */
export async function runCoverageGate(evidenceId: string): Promise<GateResult> {
  // Generate coverage report
  const coverageReport = await generateCoverageReport(evidenceId)
  await saveCoverageReport(coverageReport)

  const blockers: string[] = []
  const recommendations: string[] = []

  // Get requirements for this content type
  const contentType = coverageReport.primaryContentType ?? "GENERAL"
  const requirements = MINIMUM_REQUIREMENTS[contentType] ?? MINIMUM_REQUIREMENTS.GENERAL

  // Check minimum score
  if (coverageReport.coverageScore < requirements.minScore) {
    blockers.push(
      `Coverage score ${(coverageReport.coverageScore * 100).toFixed(0)}% below minimum ${(requirements.minScore * 100).toFixed(0)}%`
    )
  }

  // Check required shapes
  for (const shape of requirements.required) {
    if (coverageReport.missingShapes.includes(shape)) {
      blockers.push(`Missing required shape: ${shape}`)
    }
  }

  // Add recommendations based on warnings
  for (const warning of coverageReport.warnings) {
    if (warning.includes("Low classification confidence")) {
      recommendations.push("Consider manual content classification")
    }
    if (warning.includes("legacy source pointers")) {
      recommendations.push("Re-run multi-shape extraction to get atomic claims")
    }
    if (warning.includes("No extractions")) {
      recommendations.push("Review content manually - may be empty or OCR failed")
    }
  }

  // Additional recommendations based on content type
  if (contentType === "MIXED" && coverageReport.missingShapes.length > 2) {
    recommendations.push(
      "Content classified as MIXED but few shapes extracted - consider re-classification"
    )
  }

  const passed = blockers.length === 0

  return {
    passed,
    coverageReport,
    blockers,
    recommendations,
  }
}

/**
 * Block publication if coverage gate fails
 */
export async function canPublish(evidenceId: string): Promise<{
  allowed: boolean
  reason: string
}> {
  const gateResult = await runCoverageGate(evidenceId)

  if (!gateResult.passed) {
    return {
      allowed: false,
      reason: `Coverage gate failed: ${gateResult.blockers.join("; ")}`,
    }
  }

  // Check if reviewer has approved
  const report = await db.coverageReport.findUnique({
    where: { evidenceId },
  })

  if (!report?.reviewerApproved) {
    return {
      allowed: false,
      reason: "Pending reviewer approval",
    }
  }

  return {
    allowed: true,
    reason: "Coverage gate passed and reviewer approved",
  }
}

/**
 * Mark coverage report as reviewed
 */
export async function approveForPublication(
  evidenceId: string,
  reviewerId: string,
  notes?: string
): Promise<void> {
  await db.coverageReport.update({
    where: { evidenceId },
    data: {
      reviewerApproved: true,
      reviewerNotes: notes,
      reviewedAt: new Date(),
      reviewedBy: reviewerId,
    },
  })
}

/**
 * Reject coverage - requires re-extraction
 */
export async function rejectCoverage(
  evidenceId: string,
  reviewerId: string,
  notes: string
): Promise<void> {
  await db.coverageReport.update({
    where: { evidenceId },
    data: {
      reviewerApproved: false,
      reviewerNotes: notes,
      reviewedAt: new Date(),
      reviewedBy: reviewerId,
    },
  })
}
