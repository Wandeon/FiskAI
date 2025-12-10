import Link from "next/link"
import { requireAuth, requireCompany } from "@/lib/auth-utils"
import { getEInvoices } from "@/app/actions/e-invoice"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { EInvoiceActions } from "./invoice-actions"

const statusLabels: Record<string, string> = {
  DRAFT: "Nacrt",
  PENDING_FISCALIZATION: "Čeka fiskalizaciju",
  FISCALIZED: "Fiskalizirano",
  SENT: "Poslano",
  DELIVERED: "Dostavljeno",
  ACCEPTED: "Prihvaćeno",
  REJECTED: "Odbijeno",
  ARCHIVED: "Arhivirano",
  ERROR: "Greška",
}

const statusColors: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  PENDING_FISCALIZATION: "bg-yellow-100 text-yellow-700",
  FISCALIZED: "bg-blue-100 text-blue-700",
  SENT: "bg-blue-100 text-blue-700",
  DELIVERED: "bg-green-100 text-green-700",
  ACCEPTED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
  ARCHIVED: "bg-gray-100 text-gray-600",
  ERROR: "bg-red-100 text-red-700",
}

export default async function EInvoicesPage() {
  const user = await requireAuth()
  const company = await requireCompany(user.id!)

  const eInvoices = await getEInvoices()

  // Calculate summary stats
  const stats = {
    total: eInvoices.length,
    drafts: eInvoices.filter(i => i.status === "DRAFT").length,
    sent: eInvoices.filter(i => ["SENT", "DELIVERED", "ACCEPTED"].includes(i.status)).length,
    totalAmount: eInvoices.reduce((sum, i) => sum + Number(i.totalAmount), 0),
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">E-Računi</h1>
        <Link href="/e-invoices/new">
          <Button>Novi E-Račun</Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-500">Ukupno računa</p>
            <p className="text-2xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-500">Nacrti</p>
            <p className="text-2xl font-bold">{stats.drafts}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-500">Poslano</p>
            <p className="text-2xl font-bold">{stats.sent}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-500">Ukupni iznos</p>
            <p className="text-2xl font-bold">{stats.totalAmount.toFixed(2)} EUR</p>
          </CardContent>
        </Card>
      </div>

      {/* Invoice List */}
      <Card>
        <CardContent className="p-0">
          {eInvoices.length === 0 ? (
            <div className="p-10 text-center">
              <div className="text-4xl mb-4">📄</div>
              <h3 className="font-semibold text-gray-900 mb-2">Nemate još nijedan e-račun</h3>
              <p className="text-gray-500 mb-4">
                Kreirajte svoj prvi e-račun i pošaljite ga kupcu.
              </p>
              <Link href="/e-invoices/new">
                <Button>Kreiraj prvi e-račun</Button>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                      Broj računa
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                      Kupac
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                      Datum
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                      Dospijeće
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">
                      Iznos
                    </th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-500">
                      Status
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">
                      Akcije
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {eInvoices.map((invoice) => (
                    <tr key={invoice.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <Link
                          href={`/e-invoices/${invoice.id}`}
                          className="font-medium text-blue-600 hover:underline"
                        >
                          {invoice.invoiceNumber}
                        </Link>
                        {invoice.jir && (
                          <p className="text-xs text-gray-400 mt-0.5">
                            JIR: {invoice.jir.substring(0, 8)}...
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium">{invoice.buyer?.name || "-"}</p>
                          {invoice.buyer?.oib && (
                            <p className="text-xs text-gray-500">OIB: {invoice.buyer.oib}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {new Date(invoice.issueDate).toLocaleDateString("hr-HR")}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {invoice.dueDate
                          ? new Date(invoice.dueDate).toLocaleDateString("hr-HR")
                          : "-"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <p className="font-mono font-medium">
                          {Number(invoice.totalAmount).toFixed(2)} {invoice.currency}
                        </p>
                        <p className="text-xs text-gray-500">
                          PDV: {Number(invoice.vatAmount).toFixed(2)}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                            statusColors[invoice.status] || "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {statusLabels[invoice.status] || invoice.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <EInvoiceActions
                          invoiceId={invoice.id}
                          status={invoice.status}
                          hasProvider={!!company.eInvoiceProvider}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
