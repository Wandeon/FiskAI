"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Search, X } from "lucide-react"
import { MultiSelect, MultiSelectOption } from "@/components/ui/multi-select"
import { Button } from "@/components/ui/button"

interface ExpenseFiltersProps {
  statusOptions: MultiSelectOption[]
  categoryOptions: MultiSelectOption[]
  initialStatuses?: string[]
  initialCategories?: string[]
  initialSearch?: string
}

export function ExpenseFilters({
  statusOptions,
  categoryOptions,
  initialStatuses = [],
  initialCategories = [],
  initialSearch = "",
}: ExpenseFiltersProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [statusValues, setStatusValues] = useState<MultiSelectOption[]>(
    statusOptions.filter((opt) => initialStatuses.includes(opt.value))
  )
  const [categoryValues, setCategoryValues] = useState<MultiSelectOption[]>(
    categoryOptions.filter((opt) => initialCategories.includes(opt.value))
  )
  const [search, setSearch] = useState(initialSearch)

  const hasFilters =
    statusValues.length > 0 || categoryValues.length > 0 || search.trim().length > 0

  const applyFilters = () => {
    const params = new URLSearchParams()
    if (search.trim()) {
      params.set("search", search.trim())
    }
    statusValues.forEach((opt) => params.append("status", opt.value))
    categoryValues.forEach((opt) => params.append("category", opt.value))

    startTransition(() => {
      const query = params.toString()
      router.push(query ? `/expenses?${query}` : "/expenses")
    })
  }

  const clearFilters = () => {
    setStatusValues([])
    setCategoryValues([])
    setSearch("")
    startTransition(() => router.push("/expenses"))
  }

  return (
    <div className="space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && applyFilters()}
            placeholder="Pretraži dobavljača, opis ili OIB..."
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
            <X className="mr-1 h-4 w-4" />
            Očisti
          </Button>
        )}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <FilterBlock
          label="Status"
          placeholder="Svi statusi"
          options={statusOptions}
          value={statusValues}
          onChange={setStatusValues}
        />
        <FilterBlock
          label="Kategorije"
          placeholder="Sve kategorije"
          options={categoryOptions}
          value={categoryValues}
          onChange={setCategoryValues}
        />
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
        <Button onClick={applyFilters} disabled={isPending}>
          {isPending ? "Primjena..." : "Primijeni filtere"}
        </Button>
      </div>
    </div>
  )
}

interface FilterBlockProps {
  label: string
  placeholder: string
  options: MultiSelectOption[]
  value: MultiSelectOption[]
  onChange: (value: MultiSelectOption[]) => void
}

function FilterBlock({ label, placeholder, options, value, onChange }: FilterBlockProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
        {label}
      </label>
      <MultiSelect options={options} value={value} onChange={onChange} placeholder={placeholder} />
    </div>
  )
}
