import { createHash } from "crypto"
import type { Artifact, ArtifactType } from "@prisma/client"
import { db } from "@/lib/db"
import { generateR2Key, uploadToR2, downloadFromR2 } from "@/lib/r2-client"
import { logServiceBoundarySnapshot } from "@/lib/audit-hooks"
import { runWithAuditContext } from "@/lib/audit-context"

export interface StoreArtifactInput {
  companyId: string
  type: ArtifactType
  fileName: string
  contentType: string
  data: Buffer
  createdById?: string | null
  reason?: string | null
}

export interface StoredArtifactResult {
  artifact: Artifact
  checksumVerified: boolean
}

export async function storeArtifact(input: StoreArtifactInput): Promise<Artifact> {
  const checksum = createHash("sha256").update(input.data).digest("hex")
  const storageKey = generateR2Key(input.companyId, checksum, input.fileName)

  await uploadToR2(storageKey, input.data, input.contentType)

  const artifact = await runWithAuditContext(
    { actorId: input.createdById ?? undefined, reason: input.reason ?? "artifact_upload" },
    async () => {
      return db.artifact.create({
        data: {
          companyId: input.companyId,
          type: input.type,
          fileName: input.fileName,
          contentType: input.contentType,
          sizeBytes: input.data.length,
          storageKey,
          checksum,
          createdById: input.createdById ?? null,
        },
      })
    }
  )

  await logServiceBoundarySnapshot({
    companyId: input.companyId,
    userId: input.createdById ?? null,
    actor: input.createdById ?? null,
    reason: input.reason ?? "artifact_upload",
    action: "CREATE",
    entity: "Artifact",
    entityId: artifact.id,
    after: {
      type: artifact.type,
      fileName: artifact.fileName,
      storageKey: artifact.storageKey,
      checksum: artifact.checksum,
    },
  })

  return artifact
}

export async function fetchArtifactPayload(
  companyId: string,
  artifactId: string
): Promise<StoredArtifactResult> {
  const artifact = await db.artifact.findFirst({
    where: { id: artifactId, companyId },
  })

  if (!artifact) {
    throw new Error("Artifact not found")
  }

  const payload = await downloadFromR2(artifact.storageKey)
  const checksum = createHash("sha256").update(payload).digest("hex")
  const checksumVerified = checksum === artifact.checksum

  if (!checksumVerified) {
    throw new Error("Artifact checksum mismatch")
  }

  return { artifact, checksumVerified }
}
