import { cn } from "@/lib/utils"

type CalloutType = "warning" | "info" | "tip"

interface PDVCalloutProps {
  type: CalloutType
  threshold?: number
  context?: "eu-services" | "voluntary" | "general"
  children: React.ReactNode
}

const calloutStyles: Record<CalloutType, { bg: string; border: string; icon: string }> = {
  warning: {
    bg: "bg-amber-50",
    border: "border-amber-200",
    icon: "⚠️",
  },
  info: {
    bg: "bg-blue-50",
    border: "border-blue-200",
    icon: "💡",
  },
  tip: {
    bg: "bg-green-50",
    border: "border-green-200",
    icon: "💰",
  },
}

export function PDVCallout({ type, threshold, context, children }: PDVCalloutProps) {
  const styles = calloutStyles[type]

  return (
    <aside className={cn("my-4 p-4 border rounded-lg", styles.bg, styles.border)} role="note">
      <div className="flex gap-3">
        <span className="text-xl flex-shrink-0" aria-hidden="true">
          {styles.icon}
        </span>
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
