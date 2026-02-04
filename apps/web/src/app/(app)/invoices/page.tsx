import Link from "next/link"
import { FileText, Plus } from "lucide-react"
import { getInvoices } from "./actions"
import { InvoiceTable } from "@/components/invoices"
import { EmptyState } from "@/components/ui/empty-state"

interface InvoicesPageProps {
  searchParams: Promise<{
    search?: string
    status?: string
    page?: string
  }>
}

export default async function InvoicesPage({ searchParams }: InvoicesPageProps) {
  const params = await searchParams
  const search = params.search || ""
  const status = params.status || "ALL"
  const page = parseInt(params.page || "1", 10)

  const { invoices, pagination } = await getInvoices({
    search,
    status,
    page,
    limit: 20,
  })

  // Check if there are any invoices at all (without filters)
  const hasAnyInvoices = invoices.length > 0 || search !== "" || status !== "ALL"
  let totalInvoices = pagination.total
  if (!hasAnyInvoices) {
    const allInvoicesResult = await getInvoices({ page: 1, limit: 1 })
    totalInvoices = allInvoicesResult.pagination.total
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-white">Racuni</h1>
            <p className="text-white/60 mt-1">
              Upravljajte racunima i e-racunima
            </p>
          </div>
          <Link
            href="/invoices/new"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 transition-all"
          >
            <Plus className="h-4 w-4" />
            Novi racun
          </Link>
        </div>

        {/* Content */}
        {totalInvoices === 0 ? (
          <EmptyState
            icon={<FileText className="h-8 w-8" />}
            title="Nemate racuna"
            description="Kreirajte prvi racun da biste poceli s fakturiranjem"
            action={
              <Link
                href="/invoices/new"
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 transition-all"
              >
                <Plus className="h-4 w-4" />
                Kreiraj racun
              </Link>
            }
            className="bg-white/5 rounded-2xl border border-white/10 py-16"
          />
        ) : invoices.length === 0 ? (
          <EmptyState
            icon={<FileText className="h-8 w-8" />}
            title="Nema rezultata"
            description={`Nema racuna koji odgovaraju pretrazi "${search}"`}
            className="bg-white/5 rounded-2xl border border-white/10 py-16"
          />
        ) : (
          <>
            {/* Results Count */}
            <p className="text-sm text-white/50 mb-4">
              Prikazano {(page - 1) * pagination.limit + 1}-
              {Math.min(page * pagination.limit, pagination.total)} od {pagination.total} racuna
            </p>

            {/* Invoice Table */}
            <InvoiceTable
              invoices={invoices}
              pagination={pagination}
              search={search}
              status={status}
            />
          </>
        )}
      </div>
    </div>
  )
}
