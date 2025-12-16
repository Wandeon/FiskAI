"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"

interface Deadline {
  date: string // YYYY-MM-DD
  title: string
  type: "doprinosi" | "pdv" | "dohodak" | "porez" | "joppd"
  description: string
  applies: string[] // ["pausalni", "obrt-dohodak", "doo"]
}

const DEADLINES_2025: Deadline[] = [
  // Monthly - Contributions (every 15th)
  ...Array.from({ length: 12 }, (_, i) => ({
    date: `2025-${String(i + 1).padStart(2, "0")}-15`,
    title: "Doprinosi",
    type: "doprinosi" as const,
    description: "Rok za uplatu mjesečnih doprinosa MIO i HZZO",
    applies: ["pausalni", "obrt-dohodak"],
  })),
  // Quarterly PDV
  {
    date: "2025-01-20",
    title: "PDV Q4/2024",
    type: "pdv",
    description: "PDV prijava za Q4 2024",
    applies: ["pdv-obveznik"],
  },
  {
    date: "2025-04-20",
    title: "PDV Q1/2025",
    type: "pdv",
    description: "PDV prijava za Q1 2025",
    applies: ["pdv-obveznik"],
  },
  {
    date: "2025-07-20",
    title: "PDV Q2/2025",
    type: "pdv",
    description: "PDV prijava za Q2 2025",
    applies: ["pdv-obveznik"],
  },
  {
    date: "2025-10-20",
    title: "PDV Q3/2025",
    type: "pdv",
    description: "PDV prijava za Q3 2025",
    applies: ["pdv-obveznik"],
  },
  // Annual
  {
    date: "2025-02-28",
    title: "Godišnja prijava",
    type: "dohodak",
    description: "Rok za godišnju prijavu poreza na dohodak",
    applies: ["pausalni", "obrt-dohodak"],
  },
  {
    date: "2025-04-30",
    title: "Prijava poreza na dobit",
    type: "porez",
    description: "Rok za prijavu poreza na dobit",
    applies: ["doo", "jdoo"],
  },
]

const typeColors = {
  doprinosi: "bg-blue-500",
  pdv: "bg-purple-500",
  dohodak: "bg-green-500",
  porez: "bg-amber-500",
  joppd: "bg-red-500",
}

interface DeadlineCalendarProps {
  year: number
}

export function DeadlineCalendar({ year }: DeadlineCalendarProps) {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth())
  const [selectedDeadline, setSelectedDeadline] = useState<Deadline | null>(null)
  const [filter, setFilter] = useState<string>("all")

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

  const getDeadlinesForMonth = (month: number) => {
    return DEADLINES_2025.filter((d) => {
      const deadlineMonth = parseInt(d.date.split("-")[1]) - 1
      const matchesMonth = deadlineMonth === month
      const matchesFilter = filter === "all" || d.applies.includes(filter)
      return matchesMonth && matchesFilter
    })
  }

  const getDaysInMonth = (month: number) => {
    return new Date(year, month + 1, 0).getDate()
  }

  const getFirstDayOfMonth = (month: number) => {
    const day = new Date(year, month, 1).getDay()
    return day === 0 ? 6 : day - 1 // Monday = 0
  }

  const monthDeadlines = getDeadlinesForMonth(selectedMonth)
  const daysInMonth = getDaysInMonth(selectedMonth)
  const firstDay = getFirstDayOfMonth(selectedMonth)

  return (
    <div className="space-y-6">
      {/* Filter */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilter("all")}
          className={cn(
            "px-3 py-1 rounded text-sm",
            filter === "all" ? "bg-gray-900 text-white" : "bg-gray-100"
          )}
        >
          Svi rokovi
        </button>
        <button
          onClick={() => setFilter("pausalni")}
          className={cn(
            "px-3 py-1 rounded text-sm",
            filter === "pausalni" ? "bg-gray-900 text-white" : "bg-gray-100"
          )}
        >
          Paušalni obrt
        </button>
        <button
          onClick={() => setFilter("doo")}
          className={cn(
            "px-3 py-1 rounded text-sm",
            filter === "doo" ? "bg-gray-900 text-white" : "bg-gray-100"
          )}
        >
          D.O.O.
        </button>
      </div>

      {/* Month navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setSelectedMonth((m) => Math.max(0, m - 1))}
          className="p-2 hover:bg-gray-100 rounded"
        >
          ←
        </button>
        <h2 className="text-xl font-semibold">
          {monthNames[selectedMonth]} {year}
        </h2>
        <button
          onClick={() => setSelectedMonth((m) => Math.min(11, m + 1))}
          className="p-2 hover:bg-gray-100 rounded"
        >
          →
        </button>
      </div>

      {/* Calendar grid */}
      <div className="border rounded-lg overflow-hidden">
        {/* Day headers */}
        <div className="grid grid-cols-7 bg-gray-50">
          {["Pon", "Uto", "Sri", "Čet", "Pet", "Sub", "Ned"].map((day) => (
            <div key={day} className="p-2 text-center text-sm font-medium text-gray-500">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar days */}
        <div className="grid grid-cols-7">
          {/* Empty cells for days before month starts */}
          {Array.from({ length: firstDay }, (_, i) => (
            <div key={`empty-${i}`} className="p-2 border-t bg-gray-50" />
          ))}

          {/* Month days */}
          {Array.from({ length: daysInMonth }, (_, i) => {
            const day = i + 1
            const dateStr = `${year}-${String(selectedMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
            const dayDeadlines = monthDeadlines.filter((d) => d.date === dateStr)
            const isToday = new Date().toISOString().split("T")[0] === dateStr

            return (
              <div key={day} className={cn("p-2 border-t min-h-[80px]", isToday && "bg-blue-50")}>
                <span className={cn("text-sm", isToday && "font-bold text-blue-600")}>{day}</span>
                <div className="mt-1 space-y-1">
                  {dayDeadlines.map((deadline, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedDeadline(deadline)}
                      className={cn(
                        "w-full text-left text-xs p-1 rounded text-white truncate",
                        typeColors[deadline.type]
                      )}
                    >
                      {deadline.title}
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Selected deadline details */}
      {selectedDeadline && (
        <div className="bg-white border rounded-lg p-4">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-semibold">{selectedDeadline.title}</h3>
              <p className="text-sm text-gray-500">{selectedDeadline.date}</p>
            </div>
            <button
              onClick={() => setSelectedDeadline(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>
          <p className="mt-2 text-sm">{selectedDeadline.description}</p>
          <div className="mt-2">
            <span className="text-xs text-gray-500">Primjenjuje se na: </span>
            {selectedDeadline.applies.join(", ")}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-sm">
        {Object.entries(typeColors).map(([type, color]) => (
          <div key={type} className="flex items-center gap-2">
            <span className={cn("w-3 h-3 rounded", color)} />
            <span className="capitalize">{type}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
