// src/app/api/cron/bank-sync/route.ts

import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getProvider } from "@/lib/bank-sync/providers"
import { processTransactionsWithDedup } from "@/lib/bank-sync/dedup"
import { recordCronError } from "@/lib/cron-dlq"

export async function POST(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const results: Array<{
    accountId: string
    status: string
    inserted?: number
    error?: string
  }> = []

  try {
    // Find all connected accounts
    const accounts = await db.bankAccount.findMany({
      where: { connectionStatus: "CONNECTED" },
      include: { connection: true },
    })

    const now = new Date()
    const warningThreshold = new Date()
    warningThreshold.setDate(warningThreshold.getDate() + 7)

    for (const account of accounts) {
      try {
        // Check expiration
        if (account.connectionExpiresAt) {
          if (account.connectionExpiresAt < now) {
            // Expired - mark and skip
            await db.bankAccount.update({
              where: { id: account.id },
              data: { connectionStatus: "EXPIRED" },
            })
            results.push({ accountId: account.id, status: "expired" })
            continue
          }

          if (account.connectionExpiresAt < warningThreshold) {
            // Expiring soon - TODO: send notification
            console.log(`[bank-sync] Account ${account.id} expires in <7 days`)
          }
        }

        if (!account.syncProviderAccountId || !account.connection) {
          results.push({ accountId: account.id, status: "skipped", error: "No provider account" })
          continue
        }

        // Fetch transactions
        const provider = getProvider(account.syncProvider)
        const since = account.lastSyncAt || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)

        const transactions = await provider.fetchTransactions(account.syncProviderAccountId, since)

        // Process with dedup
        const dedupResult = await processTransactionsWithDedup(
          account.id,
          account.companyId,
          transactions
        )

        // Update balance
        const balance = await provider.fetchBalance(account.syncProviderAccountId)

        await db.bankAccount.update({
          where: { id: account.id },
          data: {
            lastSyncAt: new Date(),
            currentBalance: balance?.amount ?? account.currentBalance,
          },
        })

        results.push({
          accountId: account.id,
          status: "synced",
          inserted: dedupResult.inserted,
        })
      } catch (error) {
        console.error(`[bank-sync] Error syncing account ${account.id}:`, error)

        // Record to dead letter queue for visibility
        await recordCronError({
          jobName: "bank-sync",
          entityId: account.id,
          entityType: "BankAccount",
          error: error instanceof Error ? error : new Error(String(error)),
          metadata: {
            companyId: account.companyId,
            syncProvider: account.syncProvider,
            lastSyncAt: account.lastSyncAt?.toISOString(),
          },
        })

        results.push({
          accountId: account.id,
          status: "error",
          error: error instanceof Error ? error.message : "Unknown error",
        })
      }
    }

    return NextResponse.json({
      processed: accounts.length,
      results,
    })
  } catch (error) {
    console.error("[bank-sync] Cron error:", error)

    // Record global cron error to DLQ
    await recordCronError({
      jobName: "bank-sync",
      error: error instanceof Error ? error : new Error(String(error)),
      errorCode: "CRON_GLOBAL_ERROR",
    })

    return NextResponse.json({ error: "Sync failed" }, { status: 500 })
  }
}

// Also support GET for easy testing
export async function GET(request: Request) {
  return POST(request)
}
