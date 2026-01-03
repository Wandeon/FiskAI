import { Prisma, RegulatoryRule } from "@prisma/client"
import { resolveRulePrecedence } from "@/lib/regulatory-truth/agents/arbiter"
import { db } from "@/lib/db"
import { getVatRateFromCategory } from "@/lib/validations/product"

const VAT_CATEGORY_TO_CONCEPT_ID: Record<string, string> = {
  S: "pdv-standard-rate",
  AA: "pdv-reduced-rate",
  E: "pdv-zero-rate",
  Z: "pdv-zero-rate",
  O: "pdv-zero-rate",
}

const Decimal = Prisma.Decimal

function parseVatRate(rule: RegulatoryRule | null, fallbackRate: number): number {
  if (!rule) return fallbackRate
  const parsed = Number(rule.value)
  return Number.isFinite(parsed) ? parsed : fallbackRate
}

export function computeVatLineTotals(input: {
  quantity: Prisma.Decimal | number | string
  unitPrice: Prisma.Decimal | number | string
  vatRatePercent: Prisma.Decimal | number | string
}): {
  quantity: Prisma.Decimal
  unitPrice: Prisma.Decimal
  vatRate: Prisma.Decimal
  netAmount: Prisma.Decimal
  vatAmount: Prisma.Decimal
  totalAmount: Prisma.Decimal
} {
  const quantity = input.quantity instanceof Decimal ? input.quantity : new Decimal(input.quantity)
  const unitPrice =
    input.unitPrice instanceof Decimal ? input.unitPrice : new Decimal(input.unitPrice)
  const vatRate =
    input.vatRatePercent instanceof Decimal
      ? input.vatRatePercent
      : new Decimal(input.vatRatePercent)

  const netAmount = quantity.mul(unitPrice).toDecimalPlaces(2, Decimal.ROUND_HALF_UP)
  const vatAmount = netAmount.mul(vatRate).div(100).toDecimalPlaces(2, Decimal.ROUND_HALF_UP)
  const totalAmount = netAmount.add(vatAmount).toDecimalPlaces(2, Decimal.ROUND_HALF_UP)

  return {
    quantity,
    unitPrice,
    vatRate,
    netAmount,
    vatAmount,
    totalAmount,
  }
}

export async function resolveVatRuleForCategory(
  vatCategory: string,
  issueDate: Date
): Promise<RegulatoryRule | null> {
  const conceptId = VAT_CATEGORY_TO_CONCEPT_ID[vatCategory]
  if (!conceptId) return null

  const rules = await db.regulatoryRule.findMany({
    where: {
      conceptId,
      status: "PUBLISHED",
      effectiveFrom: { lte: issueDate },
      OR: [{ effectiveUntil: null }, { effectiveUntil: { gt: issueDate } }],
    },
  })

  if (rules.length === 0) return null
  if (rules.length === 1) return rules[0]

  const precedence = await resolveRulePrecedence(rules.map((rule) => rule.id))
  return rules.find((rule) => rule.id === precedence.winningRuleId) ?? rules[0]
}

export async function buildVatLineTotals(
  line: {
    description: string
    quantity: number
    unit: string
    unitPrice: number
    vatRate?: number
    vatCategory?: string
  },
  issueDate: Date
): Promise<{
  lineNumber?: number
  description: string
  quantity: Prisma.Decimal
  unit: string
  unitPrice: Prisma.Decimal
  netAmount: Prisma.Decimal
  vatRate: Prisma.Decimal
  vatCategory: string
  vatAmount: Prisma.Decimal
  vatRuleId?: string | null
}> {
  const vatCategory = line.vatCategory || "S"
  const fallbackRate = line.vatRate ?? getVatRateFromCategory(vatCategory)
  const rule = await resolveVatRuleForCategory(vatCategory, issueDate)
  const resolvedRate = parseVatRate(rule, fallbackRate)

  const totals = computeVatLineTotals({
    quantity: line.quantity,
    unitPrice: line.unitPrice,
    vatRatePercent: resolvedRate,
  })

  return {
    description: line.description,
    quantity: totals.quantity,
    unit: line.unit,
    unitPrice: totals.unitPrice,
    netAmount: totals.netAmount,
    vatRate: totals.vatRate,
    vatCategory,
    vatAmount: totals.vatAmount,
    vatRuleId: rule?.id ?? null,
  }
}
