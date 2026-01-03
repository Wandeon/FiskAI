// Retention-enabled upload function for R2
// This extends the existing r2-client with retention policy support

import {
  S3Client,
  PutObjectCommand,
  PutObjectRetentionCommand,
  ObjectLockRetentionMode,
} from "@aws-sdk/client-s3"
import { promises as fs } from "fs"
import path from "path"

export interface RetentionOptions {
  retentionYears?: number // Croatian compliance: 11 years
  metadata?: Record<string, string>
}

const BUCKET = process.env.R2_BUCKET_NAME || "fiskai-documents"
const MOCK_DIR = process.env.R2_MOCK_DIR || null
const DETERMINISTIC_MODE = process.env.DETERMINISTIC_MODE === "true"

/**
 * Upload file to R2 with 11-year retention policy for Croatian compliance.
 *
 * @param client - S3Client instance
 * @param key - R2 storage key
 * @param data - File buffer
 * @param contentType - MIME type
 * @param options - Retention and metadata options
 * @returns Storage key
 */
export async function uploadWithRetention(
  client: S3Client,
  key: string,
  data: Buffer,
  contentType: string,
  options?: RetentionOptions
): Promise<string> {
  const { retentionYears, metadata } = options || {}

  if (MOCK_DIR) {
    const filePath = path.join(MOCK_DIR, key)
    await fs.mkdir(path.dirname(filePath), { recursive: true })
    await fs.writeFile(filePath, data)
    await fs.writeFile(
      `${filePath}.meta.json`,
      JSON.stringify(
        {
          contentType,
          retentionYears: retentionYears ?? null,
          metadata: metadata ?? {},
          uploadedAt: DETERMINISTIC_MODE ? "2000-01-01T00:00:00.000Z" : new Date().toISOString(),
        },
        null,
        2
      )
    )
    return key
  }

  // Upload the file with metadata
  await client.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: data,
      ContentType: contentType,
      Metadata: {
        ...metadata,
        ...(retentionYears ? { "retention-years": retentionYears.toString() } : {}),
        "uploaded-at": DETERMINISTIC_MODE ? "2000-01-01T00:00:00.000Z" : new Date().toISOString(),
      },
    })
  )

  // Apply Object Lock retention if specified
  if (retentionYears && process.env.R2_OBJECT_LOCK_ENABLED === "true") {
    try {
      const retainUntilDate = new Date()
      retainUntilDate.setFullYear(retainUntilDate.getFullYear() + retentionYears)

      await client.send(
        new PutObjectRetentionCommand({
          Bucket: BUCKET,
          Key: key,
          Retention: {
            Mode: ObjectLockRetentionMode.COMPLIANCE,
            RetainUntilDate: retainUntilDate,
          },
        })
      )
    } catch (error) {
      // Log but don't fail - Object Lock might not be configured yet
      console.warn(`[R2] Failed to apply Object Lock retention to ${key}:`, error)
    }
  }

  return key
}
