import Link from "next/link"
import { ArrowRight, CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface NextStep {
  label: string
  description?: string
  href: string
  completed?: boolean
}

interface NextStepsProps {
  title?: string
  steps: NextStep[]
  className?: string
}

export function NextSteps({ title = "Sljedeći koraci", steps, className }: NextStepsProps) {
  const incompleteSteps = steps.filter((s) => !s.completed)

  if (incompleteSteps.length === 0) {
    return null
  }

  return (
    <div
      className={cn(
        "rounded-lg border border-[var(--border)] bg-[var(--surface-secondary)] p-4",
        className
      )}
    >
      <h4 className="text-sm font-semibold text-[var(--foreground)] mb-3">{title}</h4>
      <div className="space-y-2">
        {steps.map((step, index) => (
          <Link
            key={index}
            href={step.href}
            className={cn(
              "flex items-center gap-3 rounded-md p-2 text-sm transition-colors",
              step.completed
                ? "text-[var(--muted)] line-through"
                : "text-[var(--foreground)] hover:bg-[var(--surface)]"
            )}
          >
            {step.completed ? (
              <CheckCircle2 className="h-4 w-4 text-success-500 flex-shrink-0" />
            ) : (
              <ArrowRight className="h-4 w-4 text-brand-500 flex-shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <div className="font-medium">{step.label}</div>
              {step.description && !step.completed && (
                <div className="text-xs text-[var(--muted)] truncate">{step.description}</div>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
