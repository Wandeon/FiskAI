import { KprSummary } from "./kpr"

/**
 * Generates an Excel-compatible CSV with enhanced formatting
 * This creates a CSV that Excel will properly format with Croatian locale settings
 */
export function kprToExcel(
  summary: KprSummary,
  companyName: string,
  companyOib: string,
  from?: Date,
  to?: Date
): string {
  const lines: string[] = []

  // Header section
  lines.push(`"KNJIGA PRIMITAKA I IZDATAKA (KPR)"`)
  lines.push(`"${companyName}"`)
  lines.push(`"OIB: ${companyOib}"`)
  lines.push(`"Period: ${formatPeriod(from, to)}"`)
  lines.push("") // Empty line

  // Table header
  lines.push(
    [
      "Redni broj",
      "Datum",
      "Broj računa/dokumenta",
      "Opis",
      "Primitak (Prihod)",
      "Izdatak (Trošak)",
      "Saldo",
    ]
      .map((h) => `"${h}"`)
      .join(",")
  )

  // Data rows
  summary.rows.forEach((row, idx) => {
    lines.push(
      [
        idx + 1,
        formatDate(row.date),
        escapeCsv(row.documentNumber || ""),
        escapeCsv(row.description || ""),
        row.income > 0 ? row.income.toFixed(2) : "",
        row.expense > 0 ? row.expense.toFixed(2) : "",
        row.balance.toFixed(2),
      ].join(",")
    )
  })

  // Total row
  lines.push("") // Empty line
  lines.push(
    [
      "",
      "",
      "",
      `"UKUPNO"`,
      summary.totalIncome.toFixed(2),
      summary.totalExpense.toFixed(2),
      summary.netIncome.toFixed(2),
    ].join(",")
  )

  // Summary section
  lines.push("") // Empty line
  lines.push("") // Empty line
  lines.push(`"SAŽETAK"`)
  lines.push(`"Ukupan prihod (Primitak):",${summary.totalIncome.toFixed(2)}," EUR"`)
  lines.push(`"Ukupni troškovi (Izdatak):",${summary.totalExpense.toFixed(2)}," EUR"`)
  lines.push(`"Neto dobit:",${summary.netIncome.toFixed(2)}," EUR"`)
  lines.push(`"Broj transakcija:",${summary.rows.length}`)

  // Monthly breakdown
  if (Object.keys(summary.byMonth).length > 0) {
    lines.push("") // Empty line
    lines.push("") // Empty line
    lines.push(`"MJESEČNI PREGLED"`)
    lines.push(["Mjesec", "Prihod", "Trošak", "Neto"].map((h) => `"${h}"`).join(","))

    Object.entries(summary.byMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([monthKey, monthData]) => {
        lines.push(
          [
            `"${getMonthName(monthKey)}"`,
            monthData.totalIncome.toFixed(2),
            monthData.totalExpense.toFixed(2),
            monthData.netIncome.toFixed(2),
          ].join(",")
        )
      })
  }

  // Quarterly breakdown
  if (summary.byQuarter && Object.keys(summary.byQuarter).length > 0) {
    lines.push("") // Empty line
    lines.push("") // Empty line
    lines.push(`"KVARTALNI PREGLED"`)
    lines.push(["Kvartal", "Prihod", "Trošak", "Neto"].map((h) => `"${h}"`).join(","))

    Object.entries(summary.byQuarter)
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([quarterKey, quarterData]) => {
        lines.push(
          [
            `"${quarterKey}"`,
            quarterData.totalIncome.toFixed(2),
            quarterData.totalExpense.toFixed(2),
            quarterData.netIncome.toFixed(2),
          ].join(",")
        )
      })
  }

  // Footer
  lines.push("") // Empty line
  lines.push(`"Generirano:",${formatDate(new Date())}`)
  lines.push(`"Izvor: FiskAI - Sustav za paušalne obrtnike"`)

  return lines.join("\n")
}

function formatDate(date: Date | null | undefined): string {
  if (!date) return ""
  return `"${new Date(date).toLocaleDateString("hr-HR")}"`
}

function formatPeriod(from?: Date, to?: Date): string {
  if (!from && !to) return "Cijeli period"
  const parts = []
  if (from) parts.push(`od ${new Date(from).toLocaleDateString("hr-HR")}`)
  if (to) parts.push(`do ${new Date(to).toLocaleDateString("hr-HR")}`)
  return parts.join(" ")
}

function escapeCsv(value: string): string {
  if (!value) return ""
  // Escape quotes and wrap in quotes
  const escaped = value.replace(/"/g, '""')
  return `"${escaped}"`
}

function getMonthName(monthKey: string): string {
  if (monthKey === "unknown") return "Nepoznati period"
  const [year, month] = monthKey.split("-")
  const monthNames = [
    "Siječanj",
    "Veljača",
    "Ožujak",
    "Travanj",
    "Svibanj",
    "Lipanj",
    "Srpanj",
    "Kolovoz",
    "Rujan",
    "Listopad",
    "Studeni",
    "Prosinac",
  ]
  return `${monthNames[parseInt(month) - 1]} ${year}`
}
