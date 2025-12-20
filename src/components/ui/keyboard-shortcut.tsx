"use client"

import { useVisibilityOptional } from "@/lib/visibility/context"
import type { CompetenceLevel } from "@/lib/visibility/rules"
import { formatShortcut, type Shortcut } from "@/lib/shortcuts"

interface KeyboardShortcutProps {
  shortcut: Shortcut
  className?: string
}

export function KeyboardShortcut({ shortcut, className }: KeyboardShortcutProps) {
  const visibility = useVisibilityOptional()

  // Default to "beginner" if visibility context is not available
  const competence = (visibility?.state.competence as CompetenceLevel) || "beginner"

  // Hidden for beginners
  if (competence === "beginner") return null

  // Visible always for pro, on hover for average (handled via CSS)
  const baseClasses = "text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded font-mono"
  const visibilityClass =
    competence === "average" ? "opacity-0 group-hover:opacity-100 transition-opacity" : ""

  return (
    <kbd className={`${baseClasses} ${visibilityClass} ${className || ""}`}>
      {formatShortcut(shortcut.keys)}
    </kbd>
  )
}
