import Link from "next/link"
import { Sparkles, UserPlus } from "lucide-react"
import { cn } from "@/lib/utils"

interface OnboardingProgressPillProps {
  completed: number
  total: number
  className?: string
}

export function OnboardingProgressPill({
  completed,
  total,
  className,
}: OnboardingProgressPillProps) {
  const percent = Math.round((completed / total) * 100)

  // Determine variant based on progress
  const isComplete = percent === 100
  const isStarted = percent > 0

  if (isComplete) return null

  return (
    <div
      className={cn(
        "hidden items-center gap-3 rounded-full border border-[var(--border)] bg-[var(--surface)]/80 backdrop-blur-md px-3 py-1.5 text-sm shadow-sm lg:flex transition-all hover:border-brand-300 hover:shadow-md",
        className
      )}
    >
      <div className="relative flex h-8 w-8 items-center justify-center rounded-full bg-brand-50 text-brand-600">
        <Sparkles className="h-4 w-4" />
        {/* Progress ring SVG could go here */}
        <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 36 36">
          <path
            className="text-brand-100"
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
          />
          <path
            className="text-brand-500 transition-all duration-1000 ease-out"
            strokeDasharray={`${percent}, 100`}
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
          />
        </svg>
      </div>

      <div className="flex flex-col">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-[var(--foreground)]">
            Postavljanje računa
          </span>
          <span className="text-[10px] font-medium text-[var(--muted)]">{percent}%</span>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <Link
            href="/onboarding"
            className="font-medium text-brand-600 hover:text-brand-700 hover:underline"
          >
            Nastavi
          </Link>
          <span className="text-[var(--border)]">|</span>
          <Link
            href="mailto:?subject=Pozivnica&body=Pridruži se"
            className="flex items-center gap-1 text-[var(--muted)] hover:text-[var(--foreground)]"
          >
            <UserPlus className="h-3 w-3" />
            <span>Pozovi</span>
          </Link>
        </div>
      </div>
    </div>
  )
}
