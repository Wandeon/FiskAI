"use client"

import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"

interface Stat {
  label: string
  value: string
  tooltip?: string
}

interface QuickStatsBarProps {
  stats: Stat[]
  title: string
}

export function QuickStatsBar({ stats, title }: QuickStatsBarProps) {
  const [isSticky, setIsSticky] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsSticky(window.scrollY > 200)
    }

    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  return (
    <div
      className={cn(
        "transition-all duration-200 z-40",
        isSticky ? "fixed top-0 left-0 right-0 bg-white shadow-md" : "relative bg-gray-50"
      )}
    >
      <div className="max-w-6xl mx-auto px-4 py-3">
        {/* Desktop/Tablet View */}
        <div className="hidden sm:flex items-center justify-between flex-wrap gap-2">
          {isSticky && <span className="font-semibold text-gray-900 mr-4">{title}</span>}
          <div className="flex flex-wrap gap-4 md:gap-6">
            {stats.map((stat, idx) => (
              <div key={idx} className="flex items-center gap-2 text-sm" title={stat.tooltip}>
                <span className="text-gray-500">{stat.label}:</span>
                <span className="font-medium text-gray-900">{stat.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Mobile View - 2x2 Grid */}
        <div className="sm:hidden">
          {isSticky && <div className="font-semibold text-gray-900 mb-3 text-sm">{title}</div>}
          <div className="grid grid-cols-2 gap-3">
            {stats.map((stat, idx) => (
              <div
                key={idx}
                className="flex flex-col gap-1 bg-white sm:bg-transparent p-3 sm:p-0 rounded border sm:border-0 min-h-[44px] justify-center"
                title={stat.tooltip}
              >
                <span className="text-xs text-gray-500">{stat.label}</span>
                <span className="font-medium text-gray-900 text-sm">{stat.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
