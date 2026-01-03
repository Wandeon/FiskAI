// src/lib/db/regulatory.ts
// OWNER: Prisma (regulatory client)
// This is the Prisma client for the Regulatory Truth Layer (RTL).
// Uses REGULATORY_DATABASE_URL and has NO tenant isolation.
// RTL tables are system-wide, not tenant-scoped.

import { PrismaClient } from "../../generated/regulatory-client"
import { PrismaPg } from "@prisma/adapter-pg"
import { Pool } from "pg"

// Global singleton for regulatory database pool and client
const globalForRegulatory = globalThis as unknown as {
  regulatoryPool: Pool | undefined
  regulatoryClient: PrismaClient | undefined
}

/**
 * Get the regulatory database URL.
 *
 * PRODUCTION: Requires REGULATORY_DATABASE_URL explicitly.
 * This ensures resource isolation and prevents accidental deployment
 * of "split architecture" pointing both clients at the same DB.
 *
 * DEVELOPMENT/TEST: Falls back to DATABASE_URL for convenience.
 */
function getRegulatoryDatabaseUrl(): string {
  const regulatoryUrl = process.env.REGULATORY_DATABASE_URL
  const coreUrl = process.env.DATABASE_URL

  if (process.env.NODE_ENV === "production") {
    if (!regulatoryUrl) {
      throw new Error(
        "REGULATORY_DATABASE_URL is required in production. " +
          "Set it explicitly to ensure resource isolation between core and regulatory databases. " +
          "If intentionally using the same database, set REGULATORY_DATABASE_URL to the same value as DATABASE_URL."
      )
    }
    return regulatoryUrl
  }

  // Development/test: allow fallback
  if (!regulatoryUrl && !coreUrl) {
    throw new Error(
      "Neither REGULATORY_DATABASE_URL nor DATABASE_URL is set. " +
        "Set at least DATABASE_URL in .env.local or environment."
    )
  }

  return regulatoryUrl || coreUrl!
}

// Regulatory database pool - separate from core to prevent resource contention
// RTL can run heavy queries (evidence scans, claim joins) that shouldn't starve core
const regulatoryPool =
  globalForRegulatory.regulatoryPool ??
  new Pool({
    connectionString: getRegulatoryDatabaseUrl(),
  })

// Regulatory Prisma client - NO tenant isolation
// RTL tables don't have companyId, they're system-wide
const dbReg =
  globalForRegulatory.regulatoryClient ??
  new PrismaClient({ adapter: new PrismaPg(regulatoryPool) })

// Cache in development to survive hot-reload
if (process.env.NODE_ENV !== "production") {
  globalForRegulatory.regulatoryPool = regulatoryPool
  globalForRegulatory.regulatoryClient = dbReg
}

/**
 * Regulatory Prisma client type
 * No tenant isolation - RTL is system-wide
 */
export type RegulatoryPrismaClient = typeof dbReg

/**
 * Transaction client type for regulatory transactions
 */
export type RegulatoryTransactionClient = Parameters<
  Parameters<RegulatoryPrismaClient["$transaction"]>[0]
>[0]

// Export regulatory client
export { dbReg }
