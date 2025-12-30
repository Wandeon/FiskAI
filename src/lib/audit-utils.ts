import { createHash } from "crypto"

export function computeAuditChecksum(payload: Record<string, unknown>): string {
  const serialized = JSON.stringify(payload)
  return createHash("sha256").update(serialized).digest("hex")
}
