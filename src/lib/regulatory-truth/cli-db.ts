// src/lib/regulatory-truth/cli-db.ts
// CLI-compatible database client that loads env and properly connects

import { config } from "dotenv"
import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import { Pool } from "pg"

// Load environment variables for CLI usage
config({ path: ".env.local" })
config({ path: ".env" })

// Create shared pool and prisma instance
let _pool: Pool | null = null
let _db: PrismaClient | null = null

export function getPool(): Pool {
  if (!_pool) {
    _pool = new Pool({ connectionString: process.env.DATABASE_URL })
  }
  return _pool
}

export function getCliDb(): PrismaClient {
  if (!_db) {
    const pool = getPool()
    _db = new PrismaClient({ adapter: new PrismaPg(pool) })
  }
  return _db
}

export async function closeCliDb(): Promise<void> {
  if (_db) {
    await _db.$disconnect()
    _db = null
  }
  if (_pool) {
    await _pool.end()
    _pool = null
  }
}

// Export a singleton instance for use by agents
export const cliDb = getCliDb()
