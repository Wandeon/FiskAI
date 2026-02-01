"use client"

import { useState, useEffect } from "react"
import { X, Sparkles, ArrowRight } from "lucide-react"
import { cn } from "@/lib/utils"

interface ChangelogEntry {
  version: string
  date: string
  highlights: {
    title: string
    type: "added" | "changed" | "fixed"
  }[]
}

// Current version - update this when releasing new features
const CURRENT_VERSION = "1.2.0"

// Key for localStorage
const DISMISSED_VERSION_KEY = "fiskai_whats_new_dismissed"

// Changelog entries to display
const CHANGELOG_ENTRIES: ChangelogEntry[] = [
  {
    version: "1.2.0",
    date: "2024-12-29",
    highlights: [
      {
        title: "Sustav obavijesti o novostima",
        type: "added",
      },
      {
        title: "Poboljšane performanse i brže učitavanje",
        type: "changed",
      },
    ],
  },
  {
    version: "1.1.0",
    date: "2024-12-15",
    highlights: [
      {
        title: "AI Asistent v2 s boljim prikazom dokaza",
        type: "added",
      },
      {
        title: "Personalizacija postavki asistenta",
        type: "added",
      },
    ],
  },
]

// Color-coded left border styles
const typeStyles = {
  added: "border-l-success text-success-text",
  changed: "border-l-info text-info-text",
  fixed: "border-l-warning text-warning-text",
}

export function WhatsNewModal() {
  const [isOpen, setIsOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    // Check if user has dismissed this version
    const dismissedVersion = localStorage.getItem(DISMISSED_VERSION_KEY)
    if (dismissedVersion !== CURRENT_VERSION) {
      // Show modal after a short delay for better UX
      const timer = setTimeout(() => setIsOpen(true), 1000)
      return () => clearTimeout(timer)
    }
    return undefined
  }, [])

  const handleDismiss = () => {
    localStorage.setItem(DISMISSED_VERSION_KEY, CURRENT_VERSION)
    setIsOpen(false)
  }

  // Don't render on server or if not mounted
  if (!mounted || !isOpen) return null

  return (
    <div className="fixed inset-0 z-modal flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
        onClick={handleDismiss}
        aria-hidden="true"
      />

      {/* Modal - slides up on mobile, centered on desktop */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="whats-new-title"
        className="relative w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl bg-[var(--surface)] shadow-elevated animate-slide-up sm:animate-scale-in overflow-hidden"
      >
        {/* Compact Header */}
        <div className="relative bg-gradient-to-r from-brand-600 to-brand-500 px-4 py-4 text-white">
          <button
            onClick={handleDismiss}
            className="absolute top-3 right-3 rounded-lg p-1.5 text-white/70 hover:bg-white/10 hover:text-white transition-colors"
            aria-label="Zatvori"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2.5">
            <Sparkles className="h-5 w-5" />
            <div>
              <h2 id="whats-new-title" className="text-lg font-semibold">
                Što je novo?
              </h2>
            </div>
          </div>
        </div>

        {/* Compact Content */}
        <div className="max-h-[50vh] overflow-y-auto px-4 py-3">
          {CHANGELOG_ENTRIES.map((entry, entryIndex) => (
            <div
              key={entry.version}
              className={cn(entryIndex > 0 && "mt-4 pt-4 border-t border-[var(--border)]")}
            >
              <div className="flex items-center gap-2 text-xs text-[var(--muted)] mb-2">
                <span className="font-semibold text-[var(--foreground)]">v{entry.version}</span>
                <span className="text-[var(--border)]">•</span>
                <span>
                  {new Date(entry.date).toLocaleDateString("hr-HR", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              </div>
              <div className="space-y-1.5">
                {entry.highlights.map((highlight, index) => (
                  <div
                    key={index}
                    className={cn(
                      "border-l-2 pl-3 py-1 text-sm text-[var(--foreground)]",
                      typeStyles[highlight.type]
                    )}
                  >
                    {highlight.title}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Compact Footer */}
        <div className="flex justify-between items-center border-t border-[var(--border)] px-4 py-3 bg-[var(--surface-secondary)]">
          <a
            href="/postavke/changelog"
            className="text-xs text-[var(--muted)] hover:text-[var(--foreground)] transition-colors flex items-center gap-1"
          >
            Puni changelog
            <ArrowRight className="h-3.5 w-3.5" />
          </a>
          <button
            onClick={handleDismiss}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 transition-colors"
          >
            Shvaćam
          </button>
        </div>
      </div>
    </div>
  )
}
