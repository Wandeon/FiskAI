import { Shield, Percent, Package } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Capabilities } from "@/lib/capabilities"

interface PlanBadgeProps {
  capabilities: Capabilities
  className?: string
}

export function PlanBadge({ capabilities, className }: PlanBadgeProps) {
  const moduleCount = capabilities.entitlements.length

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-secondary)] px-3 py-1 text-xs font-semibold text-[var(--foreground)]",
        className
      )}
    >
      <Shield className="h-4 w-4 text-brand-600" />
      <span>{capabilities.legalForm}</span>
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold",
          capabilities.isVatPayer ? "bg-blue-50 text-blue-700" : "bg-gray-100 text-gray-600"
        )}
      >
        <Percent className="h-3 w-3" />
        {capabilities.isVatPayer ? "PDV" : "Bez PDV"}
      </span>
      <span className="inline-flex items-center gap-1 text-[var(--muted)]">
        <Package className="h-3 w-3" />
        {moduleCount} modula
      </span>
    </div>
  )
}
