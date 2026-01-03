import { NextRequest, NextResponse } from "next/server"

import { auth } from "@/lib/auth"
import { getCurrentCompany } from "@/lib/auth-utils"
import { db } from "@/lib/db"
import { getSnapshotsForJoppdSubmissionLines } from "@/lib/rules/snapshot-reader"

/**
 * JOPPD Submission Audit Export
 *
 * Returns the full audit trail for a JOPPD submission, including:
 * - Submission header (id, period, status, timestamps)
 * - Lines with their applied rule snapshots
 *
 * This endpoint is the first consumer of AppliedRuleSnapshot reads,
 * proving the snapshot pipeline works end-to-end.
 *
 * Access control:
 * - Requires authenticated user
 * - Requires user to have access to the submission's company
 * - Tenant isolation via explicit companyId filter
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // 1. Authenticate user
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id: submissionId } = await params

  try {
    // 2. Get user's current company (tenant)
    const company = await getCurrentCompany(session.user.id)
    if (!company) {
      return NextResponse.json(
        { error: "No company access. Complete onboarding first." },
        { status: 403 }
      )
    }

    // 3. Fetch submission header with tenant isolation
    const submission = await db.joppdSubmission.findUnique({
      where: { id: submissionId },
      select: {
        id: true,
        companyId: true,
        periodYear: true,
        periodMonth: true,
        isCorrection: true,
        correctedSubmissionId: true,
        status: true,
        submissionReference: true,
        signedXmlHash: true,
        createdAt: true,
        submittedAt: true,
        acceptedAt: true,
        rejectedAt: true,
        rejectionReason: true,
      },
    })

    if (!submission) {
      return NextResponse.json({ error: "Submission not found" }, { status: 404 })
    }

    // 4. Verify tenant access - do NOT trust submissionId alone
    if (submission.companyId !== company.id) {
      // Log potential unauthorized access attempt
      console.warn(
        `Unauthorized JOPPD audit access attempt: user ${session.user.id} ` +
          `tried to access submission ${submissionId} belonging to company ${submission.companyId}`
      )
      return NextResponse.json(
        { error: "Submission not found" },
        { status: 404 } // 404 instead of 403 to avoid information leakage
      )
    }

    // 5. Get lines with snapshots (batch query, no N+1)
    const linesWithSnapshots = await getSnapshotsForJoppdSubmissionLines(company.id, submissionId)

    if (!linesWithSnapshots) {
      // This shouldn't happen if submission exists, but handle gracefully
      return NextResponse.json({ error: "Failed to fetch submission lines" }, { status: 500 })
    }

    // 6. Build audit response
    const auditResponse = {
      submission: {
        id: submission.id,
        companyId: submission.companyId,
        periodYear: submission.periodYear,
        periodMonth: submission.periodMonth,
        period: `${submission.periodYear}-${String(submission.periodMonth).padStart(2, "0")}`,
        isCorrection: submission.isCorrection,
        correctedSubmissionId: submission.correctedSubmissionId,
        status: submission.status,
        submissionReference: submission.submissionReference,
        signedXmlHash: submission.signedXmlHash,
        createdAt: submission.createdAt?.toISOString() ?? null,
        submittedAt: submission.submittedAt?.toISOString() ?? null,
        acceptedAt: submission.acceptedAt?.toISOString() ?? null,
        rejectedAt: submission.rejectedAt?.toISOString() ?? null,
        rejectionReason: submission.rejectionReason,
      },
      lines: linesWithSnapshots.map((line) => ({
        id: line.id,
        lineNumber: line.lineNumber,
        payoutLineId: line.payoutLineId,
        lineData: line.lineData,
        ruleVersionId: line.ruleVersionId,
        appliedRuleSnapshot: line.appliedRuleSnapshot
          ? {
              id: line.appliedRuleSnapshot.id,
              ruleTableKey: line.appliedRuleSnapshot.ruleTableKey,
              version: line.appliedRuleSnapshot.version,
              effectiveFrom: line.appliedRuleSnapshot.effectiveFrom.toISOString(),
              dataHash: line.appliedRuleSnapshot.dataHash,
              snapshotData: line.appliedRuleSnapshot.snapshotData,
            }
          : null,
      })),
      meta: {
        totalLines: linesWithSnapshots.length,
        linesWithSnapshots: linesWithSnapshots.filter((l) => l.appliedRuleSnapshot !== null).length,
        linesWithoutSnapshots: linesWithSnapshots.filter((l) => l.appliedRuleSnapshot === null)
          .length,
        generatedAt: new Date().toISOString(),
      },
    }

    return NextResponse.json(auditResponse)
  } catch (error) {
    console.error("JOPPD audit export failed:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
