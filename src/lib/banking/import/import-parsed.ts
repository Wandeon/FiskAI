import { createHash } from "crypto"
import { db } from "@/lib/db"
import type { TransactionClient } from "@/lib/db"

export type ParsedBankTransactionInput = {
  date: Date
  description: string
  amount: string
  reference?: string | null
  counterpartyName?: string | null
  counterpartyIban?: string | null
  currency?: string | null
}

export async function importParsedBankTransactions(
  params: {
    companyId: string
    bankAccountId: string
    importedBy: string
    fileName: string
    importedAt: Date
    transactions: ParsedBankTransactionInput[]
  },
  client: Pick<TransactionClient, "statementImport" | "bankTransaction"> = db
) {
  const snapshot = {
    companyId: params.companyId,
    bankAccountId: params.bankAccountId,
    fileName: params.fileName,
    importedBy: params.importedBy,
    importedAt: params.importedAt.toISOString(),
    transactions: params.transactions.map((t) => ({
      date: t.date.toISOString(),
      description: t.description,
      amount: t.amount,
      reference: t.reference ?? null,
      counterpartyName: t.counterpartyName ?? null,
      counterpartyIban: t.counterpartyIban ?? null,
      currency: t.currency ?? null,
    })),
  }

  const fileChecksum = createHash("sha256").update(JSON.stringify(snapshot)).digest("hex")

  const statementImport = await client.statementImport.create({
    data: {
      companyId: params.companyId,
      bankAccountId: params.bankAccountId,
      fileName: params.fileName,
      fileChecksum,
      format: "XML_CAMT053",
      transactionCount: params.transactions.length,
      importedAt: params.importedAt,
      importedBy: params.importedBy,
      metadata: {
        source: "parsed-transactions",
      },
    } as any,
  })

  if (params.transactions.length) {
    await client.bankTransaction.createMany({
      data: params.transactions.map((txn) => ({
        companyId: params.companyId,
        bankAccountId: params.bankAccountId,
        statementImportId: statementImport.id,
        date: txn.date,
        description: txn.description,
        amount: txn.amount,
        balance: "0.00",
        currency: txn.currency ?? "EUR",
        reference: txn.reference ?? null,
        counterpartyName: txn.counterpartyName ?? null,
        counterpartyIban: txn.counterpartyIban ?? null,
        matchStatus: "UNMATCHED",
        confidenceScore: 0,
      })),
      skipDuplicates: false,
    } as any)
  }

  return { statementImportId: statementImport.id, fileChecksum }
}

