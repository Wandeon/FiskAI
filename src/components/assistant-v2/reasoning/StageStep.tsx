// src/components/assistant-v2/reasoning/StageStep.tsx
"use client"

import { cn } from "@/lib/utils"
import { cva, type VariantProps } from "class-variance-authority"
import { Check, Loader2, Circle, AlertCircle } from "lucide-react"
import type { ReasoningStage } from "@/lib/assistant/reasoning"
import { getStageLabel } from "@/lib/assistant/reasoning/client"

const stepVariants = cva("flex items-start gap-3 p-3 rounded-lg transition-all duration-200", {
  variants: {
    state: {
      pending: "opacity-50",
      active: "bg-blue-50 border border-blue-200",
      complete: "opacity-80",
      error: "bg-red-50 border border-red-200",
    },
    expanded: {
      true: "",
      false: "cursor-pointer hover:bg-gray-50",
    },
  },
  defaultVariants: {
    state: "pending",
    expanded: false,
  },
})

const iconVariants = cva("flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center", {
  variants: {
    state: {
      pending: "bg-gray-200 text-gray-400",
      active: "bg-blue-500 text-white",
      complete: "bg-green-500 text-white",
      error: "bg-red-500 text-white",
    },
  },
  defaultVariants: {
    state: "pending",
  },
})

interface StageStepProps extends VariantProps<typeof stepVariants> {
  stage: ReasoningStage
  message?: string | null
  progress?: { current: number; total?: number } | null
  isExpanded?: boolean
  onToggle?: () => void
  children?: React.ReactNode
}

export function StageStep({
  stage,
  state = "pending",
  message,
  progress,
  expanded = false,
  isExpanded = false,
  onToggle,
  children,
}: StageStepProps) {
  const label = getStageLabel(stage)

  return (
    <div
      className={cn(stepVariants({ state, expanded }))}
      onClick={!expanded ? onToggle : undefined}
      role={!expanded ? "button" : undefined}
      tabIndex={!expanded ? 0 : undefined}
    >
      {/* Icon */}
      <div className={cn(iconVariants({ state }))}>
        {state === "pending" && <Circle className="w-3 h-3" />}
        {state === "active" && <Loader2 className="w-4 h-4 animate-spin" />}
        {state === "complete" && <Check className="w-4 h-4" />}
        {state === "error" && <AlertCircle className="w-4 h-4" />}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className="font-medium text-sm text-gray-900">{label}</span>
          {progress && (
            <span className="text-xs text-gray-500">
              {progress.current}
              {progress.total ? `/${progress.total}` : ""}
            </span>
          )}
        </div>

        {/* Message */}
        {message && state === "active" && (
          <p className="text-sm text-gray-600 mt-1 truncate">{message}</p>
        )}

        {/* Expanded content */}
        {isExpanded && children && (
          <div className="mt-3 pt-3 border-t border-gray-100">{children}</div>
        )}
      </div>
    </div>
  )
}
