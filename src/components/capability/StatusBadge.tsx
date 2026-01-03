// src/components/capability/StatusBadge.tsx
/**
 * Status Badge
 *
 * Color-coded badge for entity status display in queue items.
 *
 * @module components/capability
 * @since PHASE 4 - Visual Refinement
 */
"use client"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  // Invoice statuses
  DRAFT: { label: "Nacrt", variant: "secondary" },
  PENDING_FISCALIZATION: { label: "Ceka fiskalizaciju", variant: "outline" },
  FISCALIZED: { label: "Fiskalizirano", variant: "default" },
  SENT: { label: "Poslano", variant: "default" },
  PAID: { label: "Placeno", variant: "default" },
  OVERDUE: { label: "Dospjelo", variant: "destructive" },
  CANCELLED: { label: "Ponisteno", variant: "destructive" },
  // Expense statuses
  PENDING: { label: "Na cekanju", variant: "outline" },
  APPROVED: { label: "Odobreno", variant: "default" },
  REJECTED: { label: "Odbijeno", variant: "destructive" },
  // Bank transaction statuses
  MATCHED: { label: "Uskladeno", variant: "default" },
  UNMATCHED: { label: "Neuskladeno", variant: "outline" },
  IGNORED: { label: "Ignorirano", variant: "secondary" },
}

interface StatusBadgeProps {
  status: string
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] || { label: status, variant: "secondary" as const }

  return (
    <Badge variant={config.variant} className={cn("text-xs", className)}>
      {config.label}
    </Badge>
  )
}
