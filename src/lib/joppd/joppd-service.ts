import { S3Client } from "@aws-sdk/client-s3"
import { createHash } from "crypto"
import { JoppdSubmissionStatus, Prisma } from "@prisma/client"

import { prisma } from "@/lib/prisma"
import { generateR2Key } from "@/lib/r2-client"
import { uploadWithRetention } from "@/lib/r2-client-retention"
import { getEffectiveRuleVersion } from "@/lib/fiscal-rules/service"
import { recordStoredArtifact } from "@/lib/artifacts/service"

import { generateJoppdXml, type JoppdLineInput } from "./joppd-generator"
import { signJoppdXml, type SigningCredentials } from "./joppd-signer"
import { validateJoppdXml } from "./joppd-xml-schema"

export interface PrepareJoppdSubmissionInput {
  companyId: string
  payoutId: string
  credentials: SigningCredentials
  retentionYears: number
  correctionOfSubmissionId?: string
  lineCorrections?: Record<string, string>
}

export interface PrepareJoppdCorrectionInput {
  companyId: string
  originalSubmissionId: string
  credentials: SigningCredentials
  retentionYears: number
  lineCorrections?: Record<string, string>
}

const r2Client = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
  },
})

export async function prepareJoppdSubmission(input: PrepareJoppdSubmissionInput) {
  const payout = await prisma.payout.findUnique({
    where: { id: input.payoutId },
    include: {
      company: true,
      lines: {
        orderBy: { lineNumber: "asc" },
      },
    },
  })

  if (!payout || payout.companyId !== input.companyId) {
    throw new Error("Payout not found for provided company")
  }

  const ruleVersion = await getEffectiveRuleVersion("JOPPD_CODEBOOK", payout.payoutDate)
  const correctionLookup = input.lineCorrections ?? {}
  const lineInputs: JoppdLineInput[] = payout.lines.map((line, index) => ({
    lineNumber: line.lineNumber ?? index + 1,
    payoutLineId: line.id,
    ruleVersionId: line.ruleVersionId ?? null,
    recipientName: line.employeeName ?? line.recipientName,
    recipientOib: line.employeeOib ?? line.recipientOib,
    grossAmount: line.grossAmount ? line.grossAmount.toFixed(2) : null,
    netAmount: line.netAmount ? line.netAmount.toFixed(2) : null,
    taxAmount: line.taxAmount ? line.taxAmount.toFixed(2) : null,
    originalLineId: correctionLookup[line.id] ?? null,
    lineData: line.joppdData,
  }))

  const submission = await prisma.$transaction(async (tx) => {
    const created = await tx.joppdSubmission.create({
      data: {
        companyId: input.companyId,
        periodYear: payout.periodYear,
        periodMonth: payout.periodMonth,
        isCorrection: Boolean(input.correctionOfSubmissionId),
        correctedSubmissionId: input.correctionOfSubmissionId ?? null,
        createdAt: payout.payoutDate,
      },
    })

    await tx.joppdSubmissionLine.createMany({
      data: lineInputs.map((line) => ({
        submissionId: created.id,
        payoutLineId: line.payoutLineId,
        lineNumber: line.lineNumber,
        lineData: line.lineData as Prisma.InputJsonValue,
        originalLineId: line.originalLineId,
        ruleVersionId: line.ruleVersionId ?? ruleVersion.id,
      })),
    })

    await tx.joppdSubmissionEvent.create({
      data: {
        submissionId: created.id,
        status: JoppdSubmissionStatus.PREPARED,
        note: created.isCorrection ? "Correction draft prepared" : "Submission prepared",
      },
    })

    return created
  })

  const xmlPayload = generateJoppdXml({
    submissionId: submission.id,
    companyOib: payout.company.oib,
    companyName: payout.company.name,
    periodYear: payout.periodYear,
    periodMonth: payout.periodMonth,
    payoutId: payout.id,
    payoutDate: payout.payoutDate,
    createdAt: submission.createdAt ?? payout.payoutDate,
    correctionOfSubmissionId: input.correctionOfSubmissionId ?? null,
    lines: lineInputs,
  })

  const validation = validateJoppdXml(xmlPayload)
  if (!validation.valid) {
    throw new Error(`JOPPD XML failed schema validation: ${validation.errors.join("; ")}`)
  }

  const signedXml = signJoppdXml(xmlPayload, input.credentials)
  const signedXmlBuffer = Buffer.from(signedXml, "utf8")
  const signedXmlHash = createHash("sha256").update(signedXmlBuffer).digest("hex")

  const inputSnapshot = {
    companyId: input.companyId,
    payoutId: payout.id,
    payoutDate: payout.payoutDate.toISOString(),
    periodYear: payout.periodYear,
    periodMonth: payout.periodMonth,
    correctionOfSubmissionId: input.correctionOfSubmissionId ?? null,
    lineCorrections: input.lineCorrections ?? {},
    lines: lineInputs.map((line) => ({
      lineNumber: line.lineNumber,
      payoutLineId: line.payoutLineId,
      ruleVersionId: line.ruleVersionId ?? null,
      recipientName: line.recipientName ?? null,
      recipientOib: line.recipientOib ?? null,
      grossAmount: line.grossAmount ?? null,
      netAmount: line.netAmount ?? null,
      taxAmount: line.taxAmount ?? null,
      originalLineId: line.originalLineId ?? null,
      lineData: line.lineData ?? null,
    })),
  }
  const inputHash = createHash("sha256").update(JSON.stringify(inputSnapshot)).digest("hex")

  const period = `${payout.periodYear}-${String(payout.periodMonth).padStart(2, "0")}`
  const fileName = `joppd-${payout.company.oib}-${period}-${payout.id}.xml`
  const storageKey = generateR2Key(input.companyId, signedXmlHash, fileName)

  await uploadWithRetention(r2Client, storageKey, signedXmlBuffer, "application/xml", {
    retentionYears: input.retentionYears,
    metadata: {
      "submission-id": submission.id,
      "company-id": input.companyId,
      "payout-id": payout.id,
      "period-year": payout.periodYear.toString(),
      "period-month": payout.periodMonth.toString(),
    },
  })

  await recordStoredArtifact({
    companyId: input.companyId,
    type: "XML",
    fileName,
    contentType: "application/xml",
    sizeBytes: signedXmlBuffer.length,
    storageKey,
    checksum: signedXmlHash,
    generatorVersion: "joppd-xml@1",
    inputHash,
    generationMeta: {
      artifactKind: "JOPPD_XML",
      submissionId: submission.id,
      payoutId: payout.id,
      periodYear: payout.periodYear,
      periodMonth: payout.periodMonth,
    },
    createdById: null,
    reason: "joppd_xml_generate",
  })

  return prisma.joppdSubmission.update({
    where: { id: submission.id },
    data: {
      signedXmlStorageKey: storageKey,
      signedXmlHash,
    },
  })
}

export async function prepareJoppdCorrection(input: PrepareJoppdCorrectionInput) {
  const originalSubmission = await prisma.joppdSubmission.findUnique({
    where: { id: input.originalSubmissionId },
    include: {
      lines: {
        orderBy: { lineNumber: "asc" },
        include: {
          payoutLine: {
            include: {
              payout: {
                include: {
                  company: true,
                  lines: {
                    orderBy: { lineNumber: "asc" },
                  },
                },
              },
            },
          },
        },
      },
    },
  })

  if (!originalSubmission) {
    throw new Error("Original submission not found")
  }

  if (originalSubmission.companyId !== input.companyId) {
    throw new Error("Original submission does not belong to provided company")
  }

  if (originalSubmission.lines.length === 0) {
    throw new Error("Original submission has no lines to correct")
  }

  const payout = originalSubmission.lines[0].payoutLine.payout
  if (!payout) {
    throw new Error("Payout not found for correction workflow")
  }

  const payoutIdSet = new Set(originalSubmission.lines.map((line) => line.payoutLine.payoutId))
  if (payoutIdSet.size > 1) {
    throw new Error("Correction workflow requires a single payout per submission")
  }

  const defaultRuleVersionId =
    originalSubmission.lines.find((line) => line.ruleVersionId)?.ruleVersionId ??
    (await getEffectiveRuleVersion("JOPPD_CODEBOOK", payout.payoutDate)).id

  const originalLineLookup = new Map(
    originalSubmission.lines.map((line) => [line.payoutLineId, line])
  )
  const correctionLookup = input.lineCorrections ?? {}

  const lineInputs: JoppdLineInput[] = payout.lines.map((line, index) => ({
    lineNumber: line.lineNumber ?? index + 1,
    payoutLineId: line.id,
    recipientName: line.recipientName,
    recipientOib: line.recipientOib,
    grossAmount: line.grossAmount ? line.grossAmount.toFixed(2) : null,
    netAmount: line.netAmount ? line.netAmount.toFixed(2) : null,
    taxAmount: line.taxAmount ? line.taxAmount.toFixed(2) : null,
    originalLineId: correctionLookup[line.id] ?? originalLineLookup.get(line.id)?.id ?? null,
    lineData: line.joppdData,
  }))

  const submission = await prisma.$transaction(async (tx) => {
    const created = await tx.joppdSubmission.create({
      data: {
        companyId: input.companyId,
        periodYear: payout.periodYear,
        periodMonth: payout.periodMonth,
        isCorrection: true,
        correctedSubmissionId: originalSubmission.id,
      },
    })

    await tx.joppdSubmissionLine.createMany({
      data: lineInputs.map((line) => ({
        submissionId: created.id,
        payoutLineId: line.payoutLineId,
        lineNumber: line.lineNumber,
        lineData: line.lineData as Prisma.InputJsonValue,
        originalLineId: line.originalLineId,
        ruleVersionId:
          originalLineLookup.get(line.payoutLineId)?.ruleVersionId ?? defaultRuleVersionId,
      })),
    })

    await tx.joppdSubmissionEvent.create({
      data: {
        submissionId: created.id,
        status: JoppdSubmissionStatus.PREPARED,
        note: `Correction prepared for submission ${originalSubmission.id}`,
      },
    })

    return created
  })

  const xmlPayload = generateJoppdXml({
    submissionId: submission.id,
    companyOib: payout.company.oib,
    companyName: payout.company.name,
    periodYear: payout.periodYear,
    periodMonth: payout.periodMonth,
    payoutId: payout.id,
    payoutDate: payout.payoutDate,
    createdAt: submission.createdAt ?? payout.payoutDate,
    correctionOfSubmissionId: originalSubmission.id,
    lines: lineInputs,
  })

  const validation = validateJoppdXml(xmlPayload)
  if (!validation.valid) {
    throw new Error(`JOPPD XML failed schema validation: ${validation.errors.join("; ")}`)
  }

  const signedXml = signJoppdXml(xmlPayload, input.credentials)
  const signedXmlHash = createHash("sha256").update(signedXml).digest("hex")
  const storageKey = generateR2Key(input.companyId, signedXmlHash, `joppd-${submission.id}.xml`)

  await uploadWithRetention(r2Client, storageKey, Buffer.from(signedXml), "application/xml", {
    retentionYears: input.retentionYears,
    metadata: {
      "submission-id": submission.id,
      "company-id": input.companyId,
      "payout-id": payout.id,
      "period-year": payout.periodYear.toString(),
      "period-month": payout.periodMonth.toString(),
      "correction-of": originalSubmission.id,
    },
  })

  return prisma.joppdSubmission.update({
    where: { id: submission.id },
    data: {
      signedXmlStorageKey: storageKey,
      signedXmlHash,
    },
  })
}

export async function markJoppdSubmitted(id: string, submissionReference?: string) {
  return prisma.$transaction(async (tx) => {
    const updated = await tx.joppdSubmission.update({
      where: { id },
      data: {
        status: JoppdSubmissionStatus.SUBMITTED,
        submissionReference: submissionReference ?? null,
        submittedAt: new Date(),
      },
    })

    await tx.joppdSubmissionEvent.create({
      data: {
        submissionId: id,
        status: JoppdSubmissionStatus.SUBMITTED,
        note: submissionReference ? `Submission reference: ${submissionReference}` : null,
      },
    })

    return updated
  })
}

export async function markJoppdAccepted(id: string) {
  return prisma.$transaction(async (tx) => {
    const updated = await tx.joppdSubmission.update({
      where: { id },
      data: {
        status: JoppdSubmissionStatus.ACCEPTED,
        acceptedAt: new Date(),
      },
    })

    await tx.joppdSubmissionEvent.create({
      data: {
        submissionId: id,
        status: JoppdSubmissionStatus.ACCEPTED,
      },
    })

    return updated
  })
}

export async function markJoppdRejected(id: string, rejectionReason?: string) {
  return prisma.$transaction(async (tx) => {
    const updated = await tx.joppdSubmission.update({
      where: { id },
      data: {
        status: JoppdSubmissionStatus.REJECTED,
        rejectedAt: new Date(),
        rejectionReason: rejectionReason ?? null,
      },
    })

    await tx.joppdSubmissionEvent.create({
      data: {
        submissionId: id,
        status: JoppdSubmissionStatus.REJECTED,
        note: rejectionReason ?? null,
      },
    })

    return updated
  })
}
