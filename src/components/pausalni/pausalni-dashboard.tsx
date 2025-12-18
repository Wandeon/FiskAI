"use client"

import { useState } from "react"
import { ObligationTimeline } from "./obligation-timeline"
import { BatchPaymentSlips } from "./batch-payment-slips"
import { Button } from "@/components/ui/button"
import { FileStack, Calendar } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { CROATIAN_MONTHS } from "@/lib/pausalni/constants"

interface Props {
  companyId: string
}

export function PausalniDashboard({ companyId }: Props) {
  const [showBatchModal, setShowBatchModal] = useState(false)
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null)
  const [selectedYear, setSelectedYear] = useState<number | null>(null)

  function handleGenerateSlips(month: number, year: number) {
    setSelectedMonth(month)
    setSelectedYear(year)
    setShowBatchModal(true)
  }

  function getAvailableMonths() {
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth() + 1
    const months: { month: number; year: number; label: string }[] = []

    // Current month
    months.push({
      month: currentMonth,
      year: currentYear,
      label: `${CROATIAN_MONTHS[currentMonth - 1].charAt(0).toUpperCase() + CROATIAN_MONTHS[currentMonth - 1].slice(1)} ${currentYear}`,
    })

    // Previous month
    let prevMonth = currentMonth - 1
    let prevYear = currentYear
    if (prevMonth === 0) {
      prevMonth = 12
      prevYear--
    }
    months.push({
      month: prevMonth,
      year: prevYear,
      label: `${CROATIAN_MONTHS[prevMonth - 1].charAt(0).toUpperCase() + CROATIAN_MONTHS[prevMonth - 1].slice(1)} ${prevYear}`,
    })

    // Next month
    let nextMonth = currentMonth + 1
    let nextYear = currentYear
    if (nextMonth === 13) {
      nextMonth = 1
      nextYear++
    }
    months.push({
      month: nextMonth,
      year: nextYear,
      label: `${CROATIAN_MONTHS[nextMonth - 1].charAt(0).toUpperCase() + CROATIAN_MONTHS[nextMonth - 1].slice(1)} ${nextYear}`,
    })

    return months
  }

  const availableMonths = getAvailableMonths()

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Paušalni Compliance Hub</h1>
          <p className="text-muted-foreground">Sve obveze vašeg paušalnog obrta na jednom mjestu</p>
        </div>
        <div className="flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="default">
                <FileStack className="h-4 w-4 mr-2" />
                Generiraj mjesečne uplatnice
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              {availableMonths.map((period) => (
                <DropdownMenuItem
                  key={`${period.year}-${period.month}`}
                  onClick={() => handleGenerateSlips(period.month, period.year)}
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  {period.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <ObligationTimeline companyId={companyId} />

      {/* Batch Payment Slips Modal */}
      {showBatchModal && selectedMonth !== null && selectedYear !== null && (
        <BatchPaymentSlips
          month={selectedMonth}
          year={selectedYear}
          onClose={() => {
            setShowBatchModal(false)
            setSelectedMonth(null)
            setSelectedYear(null)
          }}
        />
      )}
    </div>
  )
}
