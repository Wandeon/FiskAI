import { NextResponse } from "next/server"
import { createHash } from "crypto"
import { z } from "zod"
import { requireAuth, requireCompany } from "@/lib/auth-utils"
import { db } from "@/lib/db"
import { setTenantContext } from "@/lib/prisma-extensions"
import { detectDocumentType } from "@/lib/import/detect-document-type"
import { DocumentType } from "@prisma/client"
import { uploadToR2, generateR2Key } from "@/lib/r2-client"
import { scanBuffer } from "@/lib/security/virus-scanner"

const MAX_UPLOAD_BYTES = 20 * 1024 * 1024
const ALLOWED_EXTENSIONS = ["pdf", "xml", "csv", "jpg", "jpeg", "png", "heic", "webp"]

// Schema for optional formData fields
const bankAccountIdSchema = z.string().uuid("Invalid bank account ID format").optional()
const documentTypeSchema = z.nativeEnum(DocumentType).optional()

/**
 * Validates an import file from FormData
 */
function validateImportFile(
  file: FormDataEntryValue | null
): { success: true; file: File; extension: string } | { success: false; error: string } {
  if (!file || !(file instanceof File)) {
    return { success: false, error: "File is required" }
  }

  const fileName = file.name || "upload"
  const extension = fileName.split(".").pop()?.toLowerCase() || ""

  // Validate file extension
  if (!ALLOWED_EXTENSIONS.includes(extension)) {
    return {
      success: false,
      error: `Unsupported file type. Allowed: ${ALLOWED_EXTENSIONS.join(", ")}`,
    }
  }

  // Validate file size
  if (file.size === 0) {
    return { success: false, error: "Empty file" }
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    return { success: false, error: "File too large (max 20MB)" }
  }

  return { success: true, file, extension }
}

export async function POST(request: Request) {
  const user = await requireAuth()
  const company = await requireCompany(user.id!)

  setTenantContext({
    companyId: company.id,
    userId: user.id!,
  })

  const formData = await request.formData()
  const fileEntry = formData.get("file")
  const bankAccountIdEntry = formData.get("bankAccountId")
  const documentTypeEntry = formData.get("documentType")

  // Validate file
  const fileValidation = validateImportFile(fileEntry)
  if (!fileValidation.success) {
    return NextResponse.json({ error: fileValidation.error }, { status: 400 })
  }
  const { file } = fileValidation
  const fileName = file.name || "upload"

  // Validate optional bankAccountId if provided
  let bankAccountId: string | null = null
  if (bankAccountIdEntry && typeof bankAccountIdEntry === "string" && bankAccountIdEntry !== "") {
    const result = bankAccountIdSchema.safeParse(bankAccountIdEntry)
    if (!result.success) {
      return NextResponse.json({ error: "Invalid bank account ID format" }, { status: 400 })
    }
    bankAccountId = result.data ?? null
  }

  // Validate optional documentType if provided
  let documentTypeOverride: DocumentType | null = null
  if (documentTypeEntry && typeof documentTypeEntry === "string" && documentTypeEntry !== "") {
    const result = documentTypeSchema.safeParse(documentTypeEntry)
    if (!result.success) {
      return NextResponse.json({ error: "Invalid document type" }, { status: 400 })
    }
    documentTypeOverride = result.data ?? null
  }

  const arrayBuffer = await file.arrayBuffer()

  const buffer = Buffer.from(arrayBuffer)
  const checksum = createHash("sha256").update(buffer).digest("hex")

  // Scan for viruses before processing
  const scanResult = await scanBuffer(buffer, fileName)
  if (scanResult.isInfected) {
    return NextResponse.json(
      {
        error: scanResult.error
          ? "Sigurnosno skeniranje nije uspjelo. Pokušajte ponovno kasnije."
          : "Datoteka je odbijena sigurnosnim skeniranjem.",
        viruses: scanResult.viruses,
      },
      { status: 400 }
    )
  }

  // Upload file to R2 storage
  const key = generateR2Key(company.id, checksum, fileName)
  await uploadToR2(key, buffer, file.type)

  // Detect document type
  const detection = detectDocumentType(fileName, file.type)
  const documentType = documentTypeOverride || detection.type

  // Create import job
  const job = await db.importJob.create({
    data: {
      companyId: company.id,
      userId: user.id!,
      bankAccountId: bankAccountId || null,
      fileChecksum: checksum,
      originalName: fileName,
      storageKey: key,
      status: "PENDING",
      documentType,
    },
  })

  // Trigger background processing - use localhost in development to avoid DNS/port issues
  const isDev = process.env.NODE_ENV !== "production"
  const baseUrl = isDev
    ? `http://localhost:${process.env.PORT || 3000}`
    : process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
  fetch(`${baseUrl}/api/import/process`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jobId: job.id }),
  }).catch((err) => console.error("Failed to trigger processing:", err))

  return NextResponse.json({
    success: true,
    jobId: job.id,
    status: job.status,
    documentType,
    detectionConfidence: detection.confidence,
  })
}
