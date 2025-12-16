import { cn } from "@/lib/utils"
import type { LucideIcon } from "lucide-react"
import { AlertTriangle, Lightbulb, PiggyBank } from "lucide-react"

type CalloutType = "warning" | "info" | "tip"

interface PDVCalloutProps {
  type: CalloutType
  threshold?: number
  context?: "eu-services" | "voluntary" | "general"
  children: React.ReactNode
}

const calloutStyles: Record<CalloutType, { bg: string; border: string; icon: LucideIcon }> = {
  warning: {
    bg: "bg-amber-50",
    border: "border-amber-200",
    icon: AlertTriangle,
  },
  info: {
    bg: "bg-blue-50",
    border: "border-blue-200",
    icon: Lightbulb,
  },
  tip: {
    bg: "bg-green-50",
    border: "border-green-200",
    icon: PiggyBank,
  },
}

export function PDVCallout({ type, threshold, children }: PDVCalloutProps) {
  const styles = calloutStyles[type]
  const Icon = styles.icon

  return (
    <aside className={cn("my-4 p-4 border rounded-lg", styles.bg, styles.border)} role="note">
      <div className="flex gap-3">
        <div
          className={cn(
            "flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border bg-white/70",
            styles.border
          )}
          aria-hidden="true"
        >
          <Icon className="h-5 w-5 text-gray-700" />
        </div>
        <div className="text-sm">
          {threshold && (
            <strong className="block mb-1">
              PDV prag: {threshold.toLocaleString("hr-HR")} EUR
            </strong>
          )}
          {children}
        </div>
      </div>
    </aside>
  )
}
