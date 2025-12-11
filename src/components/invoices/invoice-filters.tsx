'use client'

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Search, X } from "lucide-react"
import { MultiSelect, MultiSelectOption } from "@/components/ui/multi-select"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface InvoiceFiltersProps {
  initialSearch?: string
  typeOptions: MultiSelectOption[]
  statusOptions: MultiSelectOption[]
  initialTypes?: string[]
  initialStatuses?: string[]
}

export function InvoiceFilters({
  initialSearch = "",
  typeOptions,
  statusOptions,
  initialTypes = [],
  initialStatuses = [],
}: InvoiceFiltersProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [search, setSearch] = useState(initialSearch)
  const [types, setTypes] = useState<MultiSelectOption[]>(
    typeOptions.filter((opt) => initialTypes.includes(opt.value))
  )
  const [statuses, setStatuses] = useState<MultiSelectOption[]>(
    statusOptions.filter((opt) => initialStatuses.includes(opt.value))
  )

  const clearFilters = () => {
    setSearch("")
    setTypes([])
    setStatuses([])
    startTransition(() => router.push("/invoices"))
  }

  const applyFilters = () => {
    const params = new URLSearchParams()
    if (search.trim()) params.set("search", search.trim())
    types.forEach((opt) => params.append("type", opt.value))
    statuses.forEach((opt) => params.append("status", opt.value))

    startTransition(() => {
      const query = params.toString()
      router.push(query ? `/invoices?${query}` : "/invoices")
    })
  }

  const hasFilters =
    Boolean(search.trim()) || types.length > 0 || statuses.length > 0

  return (
    <div className="space-y-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
          <input
            type="text"
            value={search}
            placeholder="Pretraži broj računa, kupca ili opis..."
            onChange={(event) => setSearch(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && applyFilters()}
            className="w-full rounded-button border border-[var(--border)] bg-[var(--surface-secondary)] py-2.5 pl-10 pr-4 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          />
        </div>
        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            disabled={isPending}
            className="md:self-start"
          >
            <X className="h-4 w-4 mr-1" />
            Očisti
          </Button>
        )}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
            Vrsta dokumenta
          </label>
          <MultiSelect
            options={typeOptions}
            value={types}
            onChange={setTypes}
            placeholder="Sve vrste"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
            Status
          </label>
          <MultiSelect
            options={statusOptions}
            value={statuses}
            onChange={setStatuses}
            placeholder="Svi statusi"
          />
        </div>
      </div>

      <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:items-center sm:justify-end">
        <Button
          onClick={applyFilters}
          disabled={isPending}
          className={cn("sm:w-auto", isPending && "pointer-events-none opacity-70")}
        >
          {isPending ? "Primjena..." : "Primijeni filtere"}
        </Button>
      </div>
    </div>
  )
}
