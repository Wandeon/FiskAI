"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Command, CornerDownLeft, Search } from "lucide-react"
import { navigation } from "@/lib/navigation"
import { cn } from "@/lib/utils"

interface CommandEntry {
  id: string
  label: string
  description?: string
  href: string
}

interface CommandPaletteProps {
  className?: string
  triggerType?: "button" | "fab"
}

export function CommandPalette({ className, triggerType = "button" }: CommandPaletteProps) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState("")

  const commands: CommandEntry[] = useMemo(() => {
    const entries: CommandEntry[] = []
    navigation.forEach((section) => {
      section.items.forEach((item) => {
        entries.push({
          id: item.href,
          label: item.name,
          description: section.title,
          href: item.href,
        })

        item.children?.forEach((child) => {
          entries.push({
            id: `${child.href}`,
            label: child.name,
            description: `${section.title} • ${item.name}`,
            href: child.href,
          })
        })
      })
    })
    return entries
  }, [])

  const filtered = useMemo(() => {
    if (!query.trim()) return commands.slice(0, 8)
    const q = query.toLowerCase()
    return commands
      .filter(
        (entry) =>
          entry.label.toLowerCase().includes(q) ||
          entry.description?.toLowerCase().includes(q)
      )
      .slice(0, 10)
  }, [commands, query])

  const handleOpen = useCallback(() => {
    setIsOpen(true)
    setQuery("")
  }, [])

  const handleClose = useCallback(() => {
    setIsOpen(false)
    setQuery("")
  }, [])

  const handleSelect = useCallback(
    (href: string) => {
      router.push(href)
      handleClose()
    },
    [router, handleClose]
  )

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault()
        handleOpen()
      }
      if (event.key === "Escape") {
        handleClose()
      }
    }

    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [handleOpen, handleClose])

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden"
      return () => {
        document.body.style.overflow = ""
      }
    }
  }, [isOpen])

  return (
    <>
      {triggerType === "button" ? (
        <button
          type="button"
          onClick={handleOpen}
          className={cn(
            "hidden items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-secondary)] px-4 py-2 text-sm text-[var(--muted)] hover:text-[var(--foreground)] transition-colors lg:flex",
            className
          )}
          aria-label="Otvori brzu paletu (⌘K)"
        >
          <Search className="h-4 w-4" />
          <span className="whitespace-nowrap">Pretraži ili pokreni akciju</span>
          <span className="ml-auto hidden items-center gap-1 text-xs text-[var(--muted)] md:flex">
            <Command className="h-3.5 w-3.5" />
            K
          </span>
        </button>
      ) : (
        <button
          type="button"
          onClick={handleOpen}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--surface)] text-brand-600 shadow-elevated border border-[var(--border)] md:hidden"
          aria-label="Pretraži ili pokreni akciju"
        >
          <Search className="h-5 w-5" />
        </button>
      )}

      {isOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-start justify-center bg-black/40 px-4 py-12 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          onClick={handleClose}
        >
          <div
            className="w-full max-w-xl rounded-2xl bg-[var(--surface)] shadow-2xl ring-1 ring-black/5"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center gap-3 border-b border-[var(--border)] px-4 py-3">
              <Search className="h-4 w-4 text-[var(--muted)]" />
              <input
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Pretražite module, stranice ili akcije..."
                className="w-full bg-transparent text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none"
              />
              <span className="text-xs text-[var(--muted)]">Esc za izlaz</span>
            </div>

            <div className="max-h-96 overflow-y-auto px-2 py-2">
              {filtered.length === 0 ? (
                <p className="px-3 py-6 text-sm text-[var(--muted)]">
                  Nema rezultata za &ldquo;{query}&rdquo;
                </p>
              ) : (
                <ul className="space-y-1">
                  {filtered.map((entry) => (
                    <li key={entry.id}>
                      <button
                        onClick={() => handleSelect(entry.href)}
                        className="w-full rounded-xl px-3 py-2 text-left transition-colors hover:bg-[var(--surface-secondary)] focus:bg-[var(--surface-secondary)]"
                      >
                        <div className="flex items-center justify-between text-sm font-medium text-[var(--foreground)]">
                          <span>{entry.label}</span>
                          <CornerDownLeft className="h-4 w-4 text-[var(--muted)]" />
                        </div>
                        {entry.description && (
                          <p className="text-xs text-[var(--muted)] mt-1">
                            {entry.description}
                          </p>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
