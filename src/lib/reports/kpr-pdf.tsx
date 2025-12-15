import { Document, Page, Text, View, StyleSheet, Font } from "@react-pdf/renderer"
import { KprSummary } from "./kpr"

// Define styles for the PDF
const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontSize: 9,
    fontFamily: "Helvetica",
  },
  header: {
    marginBottom: 20,
    borderBottom: 1,
    paddingBottom: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 10,
    color: "#666",
  },
  companyInfo: {
    marginBottom: 10,
    fontSize: 9,
  },
  table: {
    marginTop: 10,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f0f0f0",
    borderBottom: 1,
    padding: 5,
    fontWeight: "bold",
    fontSize: 8,
  },
  tableRow: {
    flexDirection: "row",
    borderBottom: 0.5,
    borderColor: "#e0e0e0",
    padding: 5,
    fontSize: 8,
  },
  tableRowAlt: {
    flexDirection: "row",
    borderBottom: 0.5,
    borderColor: "#e0e0e0",
    padding: 5,
    backgroundColor: "#f9f9f9",
    fontSize: 8,
  },
  tableTotalRow: {
    flexDirection: "row",
    backgroundColor: "#e8f4f8",
    borderTop: 2,
    borderBottom: 2,
    padding: 5,
    fontWeight: "bold",
    fontSize: 9,
    marginTop: 5,
  },
  col1: { width: "7%" }, // Redni broj
  col2: { width: "12%" }, // Datum
  col3: { width: "15%" }, // Broj dokumenta
  col4: { width: "30%" }, // Opis
  col5: { width: "12%", textAlign: "right" }, // Primitak
  col6: { width: "12%", textAlign: "right" }, // Izdatak
  col7: { width: "12%", textAlign: "right" }, // Saldo
  summary: {
    marginTop: 20,
    padding: 15,
    backgroundColor: "#f5f5f5",
    borderRadius: 5,
  },
  summaryTitle: {
    fontSize: 12,
    fontWeight: "bold",
    marginBottom: 10,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 5,
    fontSize: 9,
  },
  summaryLabel: {
    fontWeight: "bold",
  },
  summaryValue: {
    textAlign: "right",
  },
  monthSection: {
    marginTop: 15,
    marginBottom: 10,
  },
  monthHeader: {
    fontSize: 11,
    fontWeight: "bold",
    marginBottom: 5,
    backgroundColor: "#e8f4f8",
    padding: 5,
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 30,
    right: 30,
    textAlign: "center",
    fontSize: 8,
    color: "#666",
    borderTop: 1,
    paddingTop: 10,
  },
})

interface KprPdfDocumentProps {
  summary: KprSummary
  companyName: string
  companyOib: string
  from?: Date
  to?: Date
  groupByMonth?: boolean
}

function formatDate(date: Date | null | undefined): string {
  if (!date) return ""
  return new Date(date).toLocaleDateString("hr-HR")
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("hr-HR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

function formatPeriod(from?: Date, to?: Date): string {
  if (!from && !to) return "Cijeli period"
  const parts = []
  if (from) parts.push(`od ${formatDate(from)}`)
  if (to) parts.push(`do ${formatDate(to)}`)
  return parts.join(" ")
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

export function KprPdfDocument({
  summary,
  companyName,
  companyOib,
  from,
  to,
  groupByMonth = false,
}: KprPdfDocumentProps) {
  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Knjiga Primitaka i Izdataka (KPR)</Text>
          <Text style={styles.companyInfo}>
            {companyName} | OIB: {companyOib}
          </Text>
          <Text style={styles.subtitle}>Period: {formatPeriod(from, to)}</Text>
        </View>

        {/* Table Header */}
        <View style={styles.tableHeader}>
          <Text style={styles.col1}>Rb.</Text>
          <Text style={styles.col2}>Datum</Text>
          <Text style={styles.col3}>Broj dokumenta</Text>
          <Text style={styles.col4}>Opis</Text>
          <Text style={styles.col5}>Primitak</Text>
          <Text style={styles.col6}>Izdatak</Text>
          <Text style={styles.col7}>Saldo</Text>
        </View>

        {/* Table Rows */}
        {!groupByMonth
          ? // Show all rows in one table
            summary.rows.map((row, idx) => (
              <View key={idx} style={idx % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
                <Text style={styles.col1}>{idx + 1}</Text>
                <Text style={styles.col2}>{formatDate(row.date)}</Text>
                <Text style={styles.col3}>{row.documentNumber || ""}</Text>
                <Text style={styles.col4}>{row.description || ""}</Text>
                <Text style={styles.col5}>{row.income > 0 ? formatCurrency(row.income) : ""}</Text>
                <Text style={styles.col6}>{row.expense > 0 ? formatCurrency(row.expense) : ""}</Text>
                <Text style={styles.col7}>{formatCurrency(row.balance)}</Text>
              </View>
            ))
          : // Show grouped by month
            Object.entries(summary.byMonth).map(([monthKey, monthData]) => (
              <View key={monthKey} style={styles.monthSection} wrap={false}>
                <Text style={styles.monthHeader}>{getMonthName(monthKey)}</Text>
                {monthData.rows.map((row, idx) => (
                  <View key={idx} style={idx % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
                    <Text style={styles.col1}>
                      {summary.rows.findIndex((r) => r === row) + 1}
                    </Text>
                    <Text style={styles.col2}>{formatDate(row.date)}</Text>
                    <Text style={styles.col3}>{row.documentNumber || ""}</Text>
                    <Text style={styles.col4}>{row.description || ""}</Text>
                    <Text style={styles.col5}>
                      {row.income > 0 ? formatCurrency(row.income) : ""}
                    </Text>
                    <Text style={styles.col6}>
                      {row.expense > 0 ? formatCurrency(row.expense) : ""}
                    </Text>
                    <Text style={styles.col7}>{formatCurrency(row.balance)}</Text>
                  </View>
                ))}
                {/* Month subtotal */}
                <View style={styles.tableTotalRow}>
                  <Text style={styles.col1}></Text>
                  <Text style={styles.col2}></Text>
                  <Text style={styles.col3}></Text>
                  <Text style={styles.col4}>Ukupno za mjesec:</Text>
                  <Text style={styles.col5}>{formatCurrency(monthData.totalIncome)}</Text>
                  <Text style={styles.col6}>{formatCurrency(monthData.totalExpense)}</Text>
                  <Text style={styles.col7}>{formatCurrency(monthData.netIncome)}</Text>
                </View>
              </View>
            ))}

        {/* Grand Total */}
        <View style={styles.tableTotalRow}>
          <Text style={styles.col1}></Text>
          <Text style={styles.col2}></Text>
          <Text style={styles.col3}></Text>
          <Text style={styles.col4}>UKUPNO:</Text>
          <Text style={styles.col5}>{formatCurrency(summary.totalIncome)}</Text>
          <Text style={styles.col6}>{formatCurrency(summary.totalExpense)}</Text>
          <Text style={styles.col7}>{formatCurrency(summary.netIncome)}</Text>
        </View>

        {/* Summary Section */}
        <View style={styles.summary}>
          <Text style={styles.summaryTitle}>Sažetak</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Ukupan prihod (Primitak):</Text>
            <Text style={styles.summaryValue}>{formatCurrency(summary.totalIncome)} EUR</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Ukupni troškovi (Izdatak):</Text>
            <Text style={styles.summaryValue}>{formatCurrency(summary.totalExpense)} EUR</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Neto dobit:</Text>
            <Text style={styles.summaryValue}>{formatCurrency(summary.netIncome)} EUR</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Broj transakcija:</Text>
            <Text style={styles.summaryValue}>{summary.rows.length}</Text>
          </View>
        </View>

        {/* Footer */}
        <Text style={styles.footer}>
          Generirano: {formatDate(new Date())} | FiskAI - Sustav za paušalne obrtnike
        </Text>
      </Page>
    </Document>
  )
}
