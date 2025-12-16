"use client"

import { cn } from "@/lib/utils"
import { ReactNode } from "react"

interface ComparisonCellProps {
  type?: "pausalni" | "obrt-dohodak" | "jdoo" | "doo" | "freelancer" | "generic"
  isPositive?: boolean
  isNegative?: boolean
  as?: "td" | "span"
  className?: string
  children: ReactNode
}

const typeColors: Record<string, string> = {
  pausalni: "bg-green-50 border-green-200",
  "obrt-dohodak": "bg-blue-50 border-blue-200",
  jdoo: "bg-purple-50 border-purple-200",
  doo: "bg-indigo-50 border-indigo-200",
  freelancer: "bg-orange-50 border-orange-200",
  generic: "bg-gray-50 border-gray-200",
}

export function ComparisonCell({
  type = "generic",
  isPositive,
  isNegative,
  as = "td",
  className,
  children,
}: ComparisonCellProps) {
  const pill = (
    <span
      className={cn(
        "inline-flex max-w-full items-start gap-1 rounded px-2 py-1 text-sm",
        typeColors[type] || typeColors.generic,
        isPositive && "text-green-700 font-medium",
        isNegative && "text-red-700 font-medium"
      )}
    >
      {isPositive && <span aria-hidden>✓</span>}
      {isNegative && <span aria-hidden>✗</span>}
      <span className="min-w-0 break-words">{children}</span>
    </span>
  )

  if (as === "span") {
    return <span className={cn(className)}>{pill}</span>
  }

  return (
    <td className={cn("p-3 text-center align-top", className)}>
      <div className="flex justify-center">{pill}</div>
    </td>
  )
}
