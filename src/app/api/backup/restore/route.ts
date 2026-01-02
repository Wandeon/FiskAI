// src/app/api/backup/restore/route.ts
// POST endpoint for restoring company data from backup

import { NextResponse } from "next/server"
import { z } from "zod"
import { getCurrentUser, getCurrentCompany } from "@/lib/auth-utils"
import { validateBackupData, BackupData } from "@/lib/backup/export"
import { restoreCompanyData, parseBackupJson, RestoreMode } from "@/lib/backup/restore"
import { logger } from "@/lib/logger"

// Maximum backup file size: 50MB
const MAX_BACKUP_SIZE = 50 * 1024 * 1024
const ALLOWED_TYPES = ["application/json", "text/plain"]

// Schema for JSON body restore
const restoreBodySchema = z.object({
  data: z.union([z.string(), z.record(z.string(), z.unknown())]),
  mode: z.enum(["merge", "replace"]).optional().default("merge"),
  skipContacts: z.boolean().optional().default(false),
  skipProducts: z.boolean().optional().default(false),
  skipInvoices: z.boolean().optional().default(false),
  skipExpenses: z.boolean().optional().default(false),
})

/**
 * Validates a backup file from FormData
 */
function validateBackupFile(
  file: FormDataEntryValue | null
): { success: true; file: File } | { success: false; error: string } {
  if (!file || !(file instanceof File)) {
    return { success: false, error: "No backup file provided" }
  }

  // Allow JSON files or files with no type (common for .json uploads)
  if (file.type && !ALLOWED_TYPES.includes(file.type) && !file.name.endsWith(".json")) {
    return { success: false, error: "Invalid file type. Only JSON backup files are allowed" }
  }

  if (file.size > MAX_BACKUP_SIZE) {
    return { success: false, error: `Backup file too large. Maximum size: 50MB` }
  }

  if (file.size === 0) {
    return { success: false, error: "Empty backup file" }
  }

  return { success: true, file }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const company = await getCurrentCompany(user.id!)
    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 })
    }

    // Parse the request body
    const contentType = request.headers.get("content-type") || ""
    let backupData: BackupData | Record<string, unknown>
    let mode: RestoreMode = "merge"
    let skipContacts = false
    let skipProducts = false
    let skipInvoices = false
    let skipExpenses = false

    if (contentType.includes("multipart/form-data")) {
      // Handle file upload
      const formData = await request.formData()
      const fileEntry = formData.get("file")

      // Validate the backup file
      const validation = validateBackupFile(fileEntry)
      if (!validation.success) {
        return NextResponse.json({ error: validation.error }, { status: 400 })
      }

      const fileContent = await validation.file.text()

      // Validate JSON parsing
      try {
        backupData = parseBackupJson(fileContent)
      } catch {
        return NextResponse.json({ error: "Invalid JSON in backup file" }, { status: 400 })
      }

      // Get and validate options from form data
      const modeParam = formData.get("mode") as string | null
      if (modeParam === "replace" || modeParam === "merge") {
        mode = modeParam
      }
      skipContacts = formData.get("skipContacts") === "true"
      skipProducts = formData.get("skipProducts") === "true"
      skipInvoices = formData.get("skipInvoices") === "true"
      skipExpenses = formData.get("skipExpenses") === "true"
    } else {
      // Handle JSON body with Zod validation
      let body: unknown
      try {
        body = await request.json()
      } catch {
        return NextResponse.json({ error: "Invalid JSON in request body" }, { status: 400 })
      }

      const parsed = restoreBodySchema.safeParse(body)
      if (!parsed.success) {
        return NextResponse.json(
          { error: "Invalid request body", details: parsed.error.flatten() },
          { status: 400 }
        )
      }

      // If data is a string, parse it
      if (typeof parsed.data.data === "string") {
        try {
          backupData = parseBackupJson(parsed.data.data)
        } catch {
          return NextResponse.json({ error: "Invalid JSON in backup data string" }, { status: 400 })
        }
      } else {
        backupData = parsed.data.data
        // Convert date strings to Date objects
        if (
          backupData &&
          typeof backupData === "object" &&
          "createdAt" in backupData &&
          typeof backupData.createdAt === "string"
        ) {
          ;(backupData as Record<string, unknown>).createdAt = new Date(
            backupData.createdAt as string
          )
        }
      }

      mode = parsed.data.mode
      skipContacts = parsed.data.skipContacts
      skipProducts = parsed.data.skipProducts
      skipInvoices = parsed.data.skipInvoices
      skipExpenses = parsed.data.skipExpenses
    }

    // Validate the backup data structure
    const validation = validateBackupData(backupData as BackupData)
    if (!validation.valid) {
      return NextResponse.json(
        { error: "Invalid backup data", details: validation.errors },
        { status: 400 }
      )
    }

    // After validation, we know backupData is a valid BackupData
    const validatedBackupData = backupData as BackupData

    logger.info(
      {
        userId: user.id,
        companyId: company.id,
        mode,
        skipContacts,
        skipProducts,
        skipInvoices,
        skipExpenses,
        operation: "backup_restore_request",
      },
      "Backup restore requested"
    )

    // Perform the restore
    const result = await restoreCompanyData(validatedBackupData, {
      companyId: company.id,
      userId: user.id!,
      mode,
      skipContacts,
      skipProducts,
      skipInvoices,
      skipExpenses,
    })

    logger.info(
      {
        userId: user.id,
        companyId: company.id,
        mode,
        counts: result.counts,
        success: result.success,
        operation: "backup_restore_complete",
      },
      "Backup restore completed"
    )

    return NextResponse.json({
      success: result.success,
      mode: result.mode,
      counts: result.counts,
      errors: result.errors.length > 0 ? result.errors : undefined,
      restoredAt: result.restoredAt.toISOString(),
    })
  } catch (error) {
    logger.error({ error }, "Backup restore failed")

    if (error instanceof Error) {
      return NextResponse.json({ error: "Restore failed", details: error.message }, { status: 500 })
    }

    return NextResponse.json({ error: "Restore failed due to unknown error" }, { status: 500 })
  }
}
