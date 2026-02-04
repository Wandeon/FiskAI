"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useCallback, useTransition } from "react"
import { Search, X } from "lucide-react"

interface ContactFiltersProps {
  search?: string
}

export function ContactFilters({ search = "" }: ContactFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const updateSearch = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value) {
        params.set("search", value)
      } else {
        params.delete("search")
      }
      // Reset to page 1 when searching
      params.delete("page")

      startTransition(() => {
        router.push(`/contacts?${params.toString()}`)
      })
    },
    [router, searchParams]
  )

  const clearSearch = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString())
    params.delete("search")
    params.delete("page")

    startTransition(() => {
      router.push(`/contacts?${params.toString()}`)
    })
  }, [router, searchParams])

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
      <input
        type="text"
        placeholder="Pretrazi kontakte..."
        defaultValue={search}
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
  )
}
