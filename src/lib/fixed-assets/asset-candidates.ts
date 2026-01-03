import type { Expense, ExpenseLine } from "@prisma/client"
import { Prisma } from "@prisma/client"
import type { TransactionClient } from "@/lib/db"
import { THRESHOLDS } from "@/lib/fiscal-data/data/thresholds"

type AssetCandidateInput = {
  expense: Expense
  lines: ExpenseLine[]
}

const Decimal = Prisma.Decimal

export async function emitAssetCandidates(
  tx: TransactionClient,
  { expense, lines }: AssetCandidateInput
) {
  const thresholdValue = new Decimal(THRESHOLDS.assetCapitalization.value.toString())
  const candidates = lines.filter((line) =>
    new Decimal(line.totalAmount).greaterThan(thresholdValue)
  )

  if (candidates.length === 0) return

  await tx.fixedAssetCandidate.createMany({
    data: candidates.map((line) => ({
      companyId: expense.companyId,
      expenseId: expense.id,
      expenseLineId: line.id,
      description: line.description,
      amount: line.totalAmount,
      currency: expense.currency,
      thresholdValue: THRESHOLDS.assetCapitalization.value,
    })),
    skipDuplicates: true,
  })
}
