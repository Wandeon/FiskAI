"use client"

import { useState, useTransition } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Search, X, Eye, Edit2 } from "lucide-react"
import { cn } from "@/lib/utils"

const DEFAULT_STATUS_CONFIG = { label: "Nepoznato", className: "bg-white/10 text-white/70" }

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  DRAFT: { label: "Nacrt", className: "bg-white/10 text-white/70" },
  ISSUED: { label: "Izdan", className: "bg-blue-500/20 text-blue-400" },
  SENT: { label: "Poslan", className: "bg-cyan-500/20 text-cyan-400" },
  DELIVERED: { label: "Dostavljen", className: "bg-emerald-500/20 text-emerald-400" },
  ACCEPTED: { label: "Prihvacen", className: "bg-green-500/20 text-green-400" },
  REJECTED: { label: "Odbijen", className: "bg-red-500/20 text-red-400" },
  CANCELLED: { label: "Storniran", className: "bg-gray-500/20 text-gray-400" },
}

const STATUS_FILTERS = [
  { value: "ALL", label: "Svi" },
  { value: "DRAFT", label: "Nacrti" },
  { value: "ISSUED", label: "Izdani" },
  { value: "SENT", label: "Poslani" },
  { value: "DELIVERED", label: "Dostavljeni" },
  { value: "ACCEPTED", label: "Prihvaceni" },
  { value: "REJECTED", label: "Odbijeni" },
  { value: "CANCELLED", label: "Stornirani" },
] as const

interface Invoice {
  id: string
  invoiceNumberFull: string
  status: string
  issueDate: Date
  dueDate: Date | null
  totalCents: number
  currency: string
  contactName: string | null
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
  hasMore: boolean
}

interface InvoiceTableProps {
  invoices: Invoice[]
  pagination: Pagination
  search: string
  status: string
}

function formatCurrency(cents: number, currency: string): string {
  const amount = cents / 100
  return new Intl.NumberFormat("hr-HR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount) + " " + currency
}

function formatDate(date: Date): string {
  const d = new Date(date)
  const day = d.getDate().toString().padStart(2, "0")
  const month = (d.getMonth() + 1).toString().padStart(2, "0")
  const year = d.getFullYear()
  return `${day}.${month}.${year}`
}

export function InvoiceTable({ invoices, pagination, search, status }: InvoiceTableProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const [searchValue, setSearchValue] = useState(search)

  const updateSearch = (value: string) => {
    setSearchValue(value)
    const params = new URLSearchParams(searchParams.toString())
    if (value) {
      params.set("search", value)
      params.delete("page")
    } else {
      params.delete("search")
    }
    startTransition(() => {
      router.push(`/invoices?${params.toString()}`)
    })
  }

  const clearSearch = () => {
    setSearchValue("")
    const params = new URLSearchParams(searchParams.toString())
    params.delete("search")
    startTransition(() => {
      router.push(`/invoices?${params.toString()}`)
    })
  }

  const updateStatus = (newStatus: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (newStatus !== "ALL") {
      params.set("status", newStatus)
    } else {
      params.delete("status")
    }
    params.delete("page")
    startTransition(() => {
      router.push(`/invoices?${params.toString()}`)
    })
  }

  const goToPage = (page: number) => {
    const params = new URLSearchParams(searchParams.toString())
    if (page > 1) {
      params.set("page", String(page))
    } else {
      params.delete("page")
    }
    startTransition(() => {
      router.push(`/invoices?${params.toString()}`)
    })
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Status Filter Buttons */}
        <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0">
          {STATUS_FILTERS.map((filter) => {
            const isActive = status === filter.value
            return (
              <button
                key={filter.value}
                onClick={() => updateStatus(filter.value)}
                className={cn(
                  "flex-shrink-0 rounded-lg px-4 py-2 text-sm font-medium transition-all",
                  isActive
                    ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                    : "bg-white/5 text-white/60 border border-white/10 hover:bg-white/10 hover:text-white"
                )}
              >
                {filter.label}
              </button>
            )
          })}
        </div>

        {/* Search */}
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
          <input
            type="text"
            placeholder="Pretrazi racune..."
            value={searchValue}
            onChange={(e) => updateSearch(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-10 pr-10 text-sm text-white placeholder:text-white/40 focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 transition-colors"
          />
          {search && (
            <button
              onClick={clearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-0.5 text-white/40 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          {isPending && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/10">
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-white/50">
                Broj
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-white/50">
                Datum
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-white/50">
                Kupac
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase text-white/50">
                Iznos
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium uppercase text-white/50">
                Status
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase text-white/50">
                Akcije
              </th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((invoice) => {
              const statusConfig = STATUS_CONFIG[invoice.status] ?? DEFAULT_STATUS_CONFIG
              return (
                <tr
                  key={invoice.id}
                  className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors"
                >
                  {/* Broj */}
                  <td className="px-4 py-3">
                    <span className="font-mono text-sm font-medium text-white">
                      {invoice.invoiceNumberFull}
                    </span>
                  </td>

                  {/* Datum */}
                  <td className="px-4 py-3">
                    <div className="text-sm text-white/70">
                      {formatDate(invoice.issueDate)}
                    </div>
                    {invoice.dueDate && (
                      <div className="text-xs text-white/40">
                        Dospijece: {formatDate(invoice.dueDate)}
                      </div>
                    )}
                  </td>

                  {/* Kupac */}
                  <td className="px-4 py-3">
                    <span className="text-sm text-white/70">
                      {invoice.contactName || "-"}
                    </span>
                  </td>

                  {/* Iznos */}
                  <td className="px-4 py-3 text-right">
                    <span className="font-mono text-sm font-medium text-white">
                      {formatCurrency(invoice.totalCents, invoice.currency)}
                    </span>
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3 text-center">
                    <span
                      className={cn(
                        "inline-flex rounded-full px-3 py-1 text-xs font-medium",
                        statusConfig.className
                      )}
                    >
                      {statusConfig.label}
                    </span>
                  </td>

                  {/* Akcije */}
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        href={`/invoices/${invoice.id}`}
                        className="rounded-lg p-2 text-white/50 hover:text-white hover:bg-white/10 transition-colors"
                      >
                        <Eye className="h-4 w-4" />
                      </Link>
                      {invoice.status === "DRAFT" && (
                        <Link
                          href={`/invoices/${invoice.id}/edit`}
                          className="rounded-lg p-2 text-white/50 hover:text-white hover:bg-white/10 transition-colors"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Link>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => goToPage(Math.max(1, pagination.page - 1))}
            disabled={pagination.page === 1}
            className={cn(
              "flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              pagination.page === 1
                ? "pointer-events-none text-white/30"
                : "bg-white/5 text-white/70 border border-white/10 hover:bg-white/10 hover:text-white"
            )}
          >
            Prethodna
          </button>

          <div className="flex items-center gap-1">
            {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
              .filter((p) => {
                return (
                  p === 1 ||
                  p === pagination.totalPages ||
                  Math.abs(p - pagination.page) <= 1
                )
              })
              .map((p, idx, arr) => {
                const prevPage = arr[idx - 1]
                const showEllipsis = prevPage && p - prevPage > 1

                return (
                  <span key={p} className="flex items-center gap-1">
                    {showEllipsis && (
                      <span className="px-2 text-white/30">...</span>
                    )}
                    <button
                      onClick={() => goToPage(p)}
                      className={cn(
                        "min-w-[36px] rounded-lg px-3 py-2 text-sm font-medium text-center transition-colors",
                        p === pagination.page
                          ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                          : "bg-white/5 text-white/70 border border-white/10 hover:bg-white/10 hover:text-white"
                      )}
                    >
                      {p}
                    </button>
                  </span>
                )
              })}
          </div>

          <button
            onClick={() => goToPage(Math.min(pagination.totalPages, pagination.page + 1))}
            disabled={pagination.page === pagination.totalPages}
            className={cn(
              "flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              pagination.page === pagination.totalPages
                ? "pointer-events-none text-white/30"
                : "bg-white/5 text-white/70 border border-white/10 hover:bg-white/10 hover:text-white"
            )}
          >
            Sljedeca
          </button>
        </div>
      )}
    </div>
  )
}
