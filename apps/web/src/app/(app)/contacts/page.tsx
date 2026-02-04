import Link from "next/link"
import { Users, Plus, ChevronLeft, ChevronRight } from "lucide-react"
import { getContacts } from "./actions"
import { ContactCard, ContactFilters } from "@/components/contacts"
import { EmptyState } from "@/components/ui/empty-state"

interface ContactsPageProps {
  searchParams: Promise<{
    search?: string
    type?: string
    page?: string
  }>
}

const typeFilters = [
  { value: "ALL", label: "Svi" },
  { value: "CUSTOMER", label: "Kupci" },
  { value: "SUPPLIER", label: "Dobavljaci" },
  { value: "BOTH", label: "Oba" },
] as const

export default async function ContactsPage({ searchParams }: ContactsPageProps) {
  const params = await searchParams
  const search = params.search || ""
  const type = (params.type as "ALL" | "CUSTOMER" | "SUPPLIER" | "BOTH") || "ALL"
  const page = parseInt(params.page || "1", 10)

  const { contacts, pagination } = await getContacts({
    search,
    type,
    page,
    limit: 12,
  })

  const buildUrl = (newParams: Record<string, string | undefined>) => {
    const urlParams = new URLSearchParams()
    const merged = { search, type, page: String(page), ...newParams }

    Object.entries(merged).forEach(([key, value]) => {
      if (value && value !== "ALL" && value !== "1") {
        urlParams.set(key, value)
      }
    })

    const queryString = urlParams.toString()
    return `/contacts${queryString ? `?${queryString}` : ""}`
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-white">Kontakti</h1>
            <p className="text-white/60 mt-1">
              Upravljajte kupcima i dobavljacima
            </p>
          </div>
          <Link
            href="/contacts/new"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 transition-all"
          >
            <Plus className="h-4 w-4" />
            Novi kontakt
          </Link>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          {/* Type Filter Buttons */}
          <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0">
            {typeFilters.map((filter) => {
              const isActive = type === filter.value
              return (
                <Link
                  key={filter.value}
                  href={buildUrl({ type: filter.value, page: "1" })}
                  className={`flex-shrink-0 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                    isActive
                      ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                      : "bg-white/5 text-white/60 border border-white/10 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  {filter.label}
                </Link>
              )
            })}
          </div>

          {/* Search */}
          <div className="flex-1 sm:max-w-xs">
            <ContactFilters search={search} />
          </div>
        </div>

        {/* Results Count */}
        {pagination.total > 0 && (
          <p className="text-sm text-white/50 mb-4">
            Prikazano {(page - 1) * pagination.limit + 1}-
            {Math.min(page * pagination.limit, pagination.total)} od {pagination.total} kontakata
          </p>
        )}

        {/* Content */}
        {contacts.length === 0 ? (
          <EmptyState
            icon={<Users className="h-8 w-8" />}
            title={search ? "Nema rezultata" : "Nemate kontakata"}
            description={
              search
                ? `Nema kontakata koji odgovaraju pretrazi "${search}"`
                : "Dodajte prvi kontakt da biste poceli s radom"
            }
            action={
              !search && (
                <Link
                  href="/contacts/new"
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 transition-all"
                >
                  <Plus className="h-4 w-4" />
                  Dodaj kontakt
                </Link>
              )
            }
            className="bg-white/5 rounded-2xl border border-white/10 py-16"
          />
        ) : (
          <>
            {/* Contact Grid */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {contacts.map((contact) => (
                <ContactCard key={contact.id} contact={contact} />
              ))}
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                <Link
                  href={buildUrl({ page: String(Math.max(1, page - 1)) })}
                  className={`flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    page === 1
                      ? "pointer-events-none text-white/30"
                      : "bg-white/5 text-white/70 border border-white/10 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Prethodna
                </Link>

                <div className="flex items-center gap-1">
                  {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                    .filter((p) => {
                      // Show first, last, current, and adjacent pages
                      return (
                        p === 1 ||
                        p === pagination.totalPages ||
                        Math.abs(p - page) <= 1
                      )
                    })
                    .map((p, idx, arr) => {
                      // Add ellipsis indicator
                      const prevPage = arr[idx - 1]
                      const showEllipsis = prevPage && p - prevPage > 1

                      return (
                        <span key={p} className="flex items-center gap-1">
                          {showEllipsis && (
                            <span className="px-2 text-white/30">...</span>
                          )}
                          <Link
                            href={buildUrl({ page: String(p) })}
                            className={`min-w-[36px] rounded-lg px-3 py-2 text-sm font-medium text-center transition-colors ${
                              p === page
                                ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                                : "bg-white/5 text-white/70 border border-white/10 hover:bg-white/10 hover:text-white"
                            }`}
                          >
                            {p}
                          </Link>
                        </span>
                      )
                    })}
                </div>

                <Link
                  href={buildUrl({ page: String(Math.min(pagination.totalPages, page + 1)) })}
                  className={`flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    page === pagination.totalPages
                      ? "pointer-events-none text-white/30"
                      : "bg-white/5 text-white/70 border border-white/10 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  Sljedeca
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
