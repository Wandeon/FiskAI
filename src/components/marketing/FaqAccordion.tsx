"use client"

import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

export type FaqItem = {
  question: string
  answer: React.ReactNode
}

export function FaqAccordion({ items, className }: { items: FaqItem[]; className?: string }) {
  return (
    <div className={cn("space-y-3", className)}>
      {items.map((item) => (
        <details
          key={item.question}
          className="group rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 transition-colors open:bg-[var(--surface-secondary)]"
        >
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
            <span className="text-sm font-semibold">{item.question}</span>
            <ChevronDown className="h-4 w-4 text-[var(--muted)] transition-transform group-open:rotate-180" />
          </summary>
          <div className="mt-3 text-sm text-[var(--muted)] group-open:animate-in group-open:fade-in group-open:slide-in-from-top-1">
            {item.answer}
          </div>
        </details>
      ))}
    </div>
  )
}
