/**
 * Format a number as currency (EUR by default)
 */
export function formatCurrency(amount: number, currency: string = "EUR"): string {
  return new Intl.NumberFormat("hr-HR", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

/**
 * Format a date in Croatian format
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date
  return d.toLocaleDateString("hr-HR")
}

/**
 * Format a date with time
 */
export function formatDateTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date
  return d.toLocaleString("hr-HR")
}

/**
 * Format a number with Croatian locale
 */
export function formatNumber(num: number, decimals: number = 2): string {
  return new Intl.NumberFormat("hr-HR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num)
}
