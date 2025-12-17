"use client"

import { useState } from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { JsonLd } from "@/components/seo/JsonLd"
import { generateFAQSchema } from "@/lib/schema"
import type { FAQItem } from "@/lib/knowledge-hub/types"

interface FAQProps {
  items: FAQItem[]
  className?: string
}

export function FAQ({ items, className }: FAQProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  if (!items.length) return null

  return (
    <>
      <JsonLd schemas={[generateFAQSchema(items)]} />
      <div className={cn("my-8", className)}>
        <h2 className="mb-4 text-xl font-bold text-[var(--foreground)]">
          Često postavljana pitanja
        </h2>
        <div className="divide-y divide-[var(--border)] rounded-xl border border-[var(--border)]">
          {items.map((item, index) => (
            <div key={index}>
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="flex w-full items-center justify-between px-5 py-4 text-left font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--surface-secondary)]"
              >
                <span>{item.q}</span>
                <ChevronDown
                  className={cn(
                    "h-5 w-5 text-[var(--muted)] transition-transform",
                    openIndex === index && "rotate-180"
                  )}
                />
              </button>
              {openIndex === index && <div className="px-5 pb-4 text-[var(--muted)]">{item.a}</div>}
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
