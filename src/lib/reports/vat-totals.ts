/**
 * VAT Report Totals Calculation
 *
 * Server-side aggregation using Money class for precise arithmetic.
 * UI components should call this function and render the results,
 * not perform VAT calculations directly.
 */

import { Money } from "@/domain/shared"
import type { Prisma } from "@prisma/client"

/**
 * Raw invoice data from Prisma query
 */
export interface InvoiceVatData {
  netAmount: Prisma.Decimal
  vatAmount: Prisma.Decimal
  totalAmount: Prisma.Decimal
}

/**
 * Raw URA input data from Prisma query
 */
export interface UraInputVatData {
  deductibleVatAmount: Prisma.Decimal
  nonDeductibleVatAmount: Prisma.Decimal
  vatAmount: Prisma.Decimal
}

/**
 * Raw expense data from Prisma query
 */
export interface ExpenseVatData {
  netAmount: Prisma.Decimal
  vatAmount: Prisma.Decimal
  totalAmount: Prisma.Decimal
  vatDeductible: boolean
}

/**
 * Output VAT totals (from outgoing invoices)
 */
export interface OutputVatTotals {
  net: number
  vat: number
  total: number
}

/**
 * Input VAT totals (from incoming expenses/URA)
 */
export interface InputVatTotals {
  deductible: number
  nonDeductible: number
  total: number
}

/**
 * Complete VAT report totals
 */
export interface VatReportTotals {
  outputVat: OutputVatTotals
  inputVat: InputVatTotals
  vatPayable: number
}

/**
 * Calculate VAT report totals using Money class for precise arithmetic.
 *
 * This function should be called server-side. The UI should only render
 * the pre-calculated values, not perform VAT calculations.
 *
 * @param invoices - Array of invoice data with net, VAT, and total amounts
 * @param uraInputs - Array of URA input records (if available)
 * @param expenses - Array of expense data (fallback when URA inputs not available)
 * @returns Pre-calculated VAT report totals
 */
export function calculateVatReportTotals(
  invoices: InvoiceVatData[],
  uraInputs: UraInputVatData[],
  expenses: ExpenseVatData[]
): VatReportTotals {
  // Calculate output VAT from invoices using Money
  let outputNet = Money.zero()
  let outputVat = Money.zero()
  let outputTotal = Money.zero()

  for (const invoice of invoices) {
    outputNet = outputNet.add(Money.fromString(invoice.netAmount.toString()))
    outputVat = outputVat.add(Money.fromString(invoice.vatAmount.toString()))
    outputTotal = outputTotal.add(Money.fromString(invoice.totalAmount.toString()))
  }

  // Calculate input VAT
  let inputDeductible = Money.zero()
  let inputNonDeductible = Money.zero()
  let inputTotal = Money.zero()

  if (uraInputs.length > 0) {
    // Use URA inputs when available (more accurate)
    for (const ura of uraInputs) {
      inputDeductible = inputDeductible.add(Money.fromString(ura.deductibleVatAmount.toString()))
      inputNonDeductible = inputNonDeductible.add(
        Money.fromString(ura.nonDeductibleVatAmount.toString())
      )
      inputTotal = inputTotal.add(Money.fromString(ura.vatAmount.toString()))
    }
  } else {
    // Fallback to expenses when URA inputs not available
    for (const expense of expenses) {
      const vatMoney = Money.fromString(expense.vatAmount.toString())

      if (expense.vatDeductible) {
        inputDeductible = inputDeductible.add(vatMoney)
      } else {
        inputNonDeductible = inputNonDeductible.add(vatMoney)
      }
      inputTotal = inputTotal.add(vatMoney)
    }
  }

  // Calculate VAT payable (output VAT - deductible input VAT)
  const vatPayable = outputVat.subtract(inputDeductible)

  // Return rounded display numbers
  return {
    outputVat: {
      net: outputNet.round().toDisplayNumber(),
      vat: outputVat.round().toDisplayNumber(),
      total: outputTotal.round().toDisplayNumber(),
    },
    inputVat: {
      deductible: inputDeductible.round().toDisplayNumber(),
      nonDeductible: inputNonDeductible.round().toDisplayNumber(),
      total: inputTotal.round().toDisplayNumber(),
    },
    vatPayable: vatPayable.round().toDisplayNumber(),
  }
}
