"use client"

import { useState, useMemo } from "react"
import { cn } from "@/lib/utils"

const PDV_THRESHOLD = 60000

export function PDVThresholdCalculator() {
  const [currentRevenue, setCurrentRevenue] = useState(35000)
  const [monthlyAverage, setMonthlyAverage] = useState(4000)
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1)

  const analysis = useMemo(() => {
    const remainingMonths = 12 - currentMonth
    const projectedYearEnd = currentRevenue + monthlyAverage * remainingMonths
    const percentageOfThreshold = (currentRevenue / PDV_THRESHOLD) * 100
    const willCrossThreshold = projectedYearEnd > PDV_THRESHOLD

    let monthToCross: number | null = null
    if (willCrossThreshold) {
      const revenueNeeded = PDV_THRESHOLD - currentRevenue
      const monthsToThreshold = Math.ceil(revenueNeeded / monthlyAverage)
      monthToCross = Math.min(currentMonth + monthsToThreshold, 12)
    }

    return {
      projectedYearEnd,
      percentageOfThreshold: Math.min(percentageOfThreshold, 100),
      willCrossThreshold,
      monthToCross,
      safeMonthlyRevenue:
        remainingMonths > 0 ? (PDV_THRESHOLD - currentRevenue) / remainingMonths : 0,
    }
  }, [currentRevenue, monthlyAverage, currentMonth])

  const monthNames = [
    "Siječanj",
    "Veljača",
    "Ožujak",
    "Travanj",
    "Svibanj",
    "Lipanj",
    "Srpanj",
    "Kolovoz",
    "Rujan",
    "Listopad",
    "Studeni",
    "Prosinac",
  ]

  return (
    <div className="bg-white border rounded-lg p-6 space-y-6">
      {/* Inputs */}
      <div className="grid md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Trenutni prihod (YTD)
          </label>
          <input
            type="number"
            value={currentRevenue}
            onChange={(e) => setCurrentRevenue(Number(e.target.value))}
            className="w-full border rounded px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Prosječni mjesečni prihod
          </label>
          <input
            type="number"
            value={monthlyAverage}
            onChange={(e) => setMonthlyAverage(Number(e.target.value))}
            className="w-full border rounded px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Trenutni mjesec</label>
          <select
            value={currentMonth}
            onChange={(e) => setCurrentMonth(Number(e.target.value))}
            className="w-full border rounded px-3 py-2"
          >
            {monthNames.map((name, idx) => (
              <option key={idx} value={idx + 1}>
                {name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Progress Bar */}
      <div>
        <div className="flex justify-between text-sm mb-1">
          <span>Napredak prema pragu</span>
          <span>{analysis.percentageOfThreshold.toFixed(1)}%</span>
        </div>
        <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={cn(
              "h-full transition-all duration-500",
              analysis.percentageOfThreshold > 90
                ? "bg-red-500"
                : analysis.percentageOfThreshold > 70
                  ? "bg-amber-500"
                  : "bg-green-500"
            )}
            style={{ width: `${analysis.percentageOfThreshold}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>0 EUR</span>
          <span>60.000 EUR</span>
        </div>
      </div>

      {/* Results */}
      <div
        className={cn(
          "p-4 rounded-lg",
          analysis.willCrossThreshold
            ? "bg-amber-50 border border-amber-200"
            : "bg-green-50 border border-green-200"
        )}
      >
        {analysis.willCrossThreshold ? (
          <>
            <h3 className="font-semibold text-amber-800 mb-2">Prelazite prag!</h3>
            <p className="text-sm text-amber-700">
              Projekcija do kraja godine:{" "}
              <strong>{analysis.projectedYearEnd.toLocaleString("hr-HR")} EUR</strong>
              {analysis.monthToCross && (
                <span className="block mt-1">
                  Očekivani prelazak praga: <strong>{monthNames[analysis.monthToCross - 1]}</strong>
                </span>
              )}
            </p>
          </>
        ) : (
          <>
            <h3 className="font-semibold text-green-800 mb-2">Ispod praga</h3>
            <p className="text-sm text-green-700">
              Projekcija do kraja godine:{" "}
              <strong>{analysis.projectedYearEnd.toLocaleString("hr-HR")} EUR</strong>
              {analysis.safeMonthlyRevenue > 0 && (
                <span className="block mt-1">
                  Sigurni ste ako održite prosječni prihod ispod{" "}
                  <strong>
                    {Math.floor(analysis.safeMonthlyRevenue).toLocaleString("hr-HR")} EUR/mj
                  </strong>
                </span>
              )}
            </p>
          </>
        )}
      </div>
    </div>
  )
}
