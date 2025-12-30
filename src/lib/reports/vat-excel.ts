/**
 * VAT Report Excel Export
 * Generates an Excel-compatible CSV with VAT report data
 */

export interface VatReportData {
  companyName: string
  companyOib: string
  dateFrom: Date
  dateTo: Date
  outputVat: {
    net: number
    vat: number
    total: number
  }
  inputVat: {
    deductible: number
    nonDeductible: number
    total: number
  }
  vatPayable: number
}

/**
 * Generates an Excel-compatible CSV with VAT report data
 * This creates a CSV that Excel will properly format with Croatian locale settings
 */
export function vatToExcel(data: VatReportData): string {
  const lines: string[] = []

  // Header section
  lines.push('"PDV OBRAZAC"')
  lines.push('"' + data.companyName + '"')
  lines.push('"OIB: ' + data.companyOib + '"')
  lines.push('"Razdoblje: ' + formatDate(data.dateFrom) + " - " + formatDate(data.dateTo) + '"')
  lines.push("") // Empty line

  // Output VAT section
  lines.push('"IZLAZNI PDV (iz računa)"')
  lines.push('"Stavka","Iznos (EUR)"')
  lines.push('"Osnovica",' + data.outputVat.net.toFixed(2))
  lines.push('"PDV",' + data.outputVat.vat.toFixed(2))
  lines.push('"Ukupno računi",' + data.outputVat.total.toFixed(2))
  lines.push("") // Empty line

  // Input VAT section
  lines.push('"ULAZNI PDV (iz troškova)"')
  lines.push('"Stavka","Iznos (EUR)"')
  lines.push('"Priznati PDV",' + data.inputVat.deductible.toFixed(2))
  lines.push('"Nepriznati PDV",' + data.inputVat.nonDeductible.toFixed(2))
  lines.push('"Ukupno PDV",' + data.inputVat.total.toFixed(2))
  lines.push("") // Empty line

  // Summary section
  lines.push('"OBVEZA PDV-a"')
  lines.push('"Stavka","Iznos (EUR)"')
  lines.push('"Izlazni PDV",' + data.outputVat.vat.toFixed(2))
  lines.push('"Ulazni PDV (priznati)",-' + data.inputVat.deductible.toFixed(2))
  lines.push("") // Empty line

  // Final result
  const resultLabel = data.vatPayable >= 0 ? "ZA UPLATU" : "ZA POVRAT"
  lines.push('"' + resultLabel + '",' + Math.abs(data.vatPayable).toFixed(2))
  lines.push("") // Empty line

  // Footer
  lines.push('"Generirano:",' + formatDate(new Date()))
  lines.push('"Izvor: FiskAI - PDV izvještavanje"')

  return lines.join("\n")
}

function formatDate(date: Date | null | undefined): string {
  if (!date) return ""
  return '"' + new Date(date).toLocaleDateString("hr-HR") + '"'
}
