"use client"

import { ReactNode } from "react"

interface ComparisonRowProps {
  label: string
  tooltip?: string
  children: ReactNode
}

export function ComparisonRow({ label, tooltip, children }: ComparisonRowProps) {
  return (
    <tr className="border-b hover:bg-gray-50">
      <td className="sticky left-0 z-20 bg-gray-50 p-3 font-medium text-gray-700 shadow-[2px_0_4px_rgba(0,0,0,0.06)]">
        {label}
        {tooltip && (
          <span className="ml-1 text-gray-400 cursor-help text-xs" title={tooltip}>
            ?
          </span>
        )}
      </td>
      {children}
    </tr>
  )
}
