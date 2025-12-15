"use client"

import { cn } from "@/lib/utils"

interface ComparisonColumn {
  id: string
  name: string
  highlighted?: boolean
}

interface ComparisonRow {
  label: string
  tooltip?: string
  values: Record<string, string | React.ReactNode>
}

interface ComparisonTableProps {
  columns: ComparisonColumn[]
  rows: ComparisonRow[]
  highlightedColumn?: string // from URL params
}

export function ComparisonTable({ columns, rows, highlightedColumn }: ComparisonTableProps) {
  return (
    <div className="overflow-x-auto">
      {/* Desktop Table */}
      <table className="hidden md:table w-full border-collapse">
        <thead>
          <tr>
            <th className="p-3 text-left bg-gray-50 border-b font-medium">Usporedba</th>
            {columns.map((col) => (
              <th
                key={col.id}
                className={cn(
                  "p-3 text-center border-b font-medium",
                  col.highlighted || col.id === highlightedColumn
                    ? "bg-blue-50 text-blue-900"
                    : "bg-gray-50"
                )}
              >
                {col.name}
                {(col.highlighted || col.id === highlightedColumn) && (
                  <span className="block text-xs text-blue-600 font-normal">Preporučeno</span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr key={idx} className="border-b hover:bg-gray-50">
              <td className="p-3 font-medium text-gray-700">
                {row.label}
                {row.tooltip && (
                  <span className="ml-1 text-gray-400 cursor-help" title={row.tooltip}>
                    ⓘ
                  </span>
                )}
              </td>
              {columns.map((col) => (
                <td
                  key={col.id}
                  className={cn(
                    "p-3 text-center",
                    (col.highlighted || col.id === highlightedColumn) && "bg-blue-50/50"
                  )}
                >
                  {row.values[col.id]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-4">
        {columns.map((col) => (
          <div
            key={col.id}
            className={cn(
              "border rounded-lg p-4",
              col.highlighted || col.id === highlightedColumn
                ? "border-blue-500 bg-blue-50"
                : "border-gray-200"
            )}
          >
            <h3 className="font-semibold text-lg mb-3">
              {col.name}
              {(col.highlighted || col.id === highlightedColumn) && (
                <span className="ml-2 text-sm text-blue-600">Preporučeno</span>
              )}
            </h3>
            <dl className="space-y-2">
              {rows.map((row, idx) => (
                <div key={idx} className="flex justify-between">
                  <dt className="text-gray-600">{row.label}</dt>
                  <dd className="font-medium">{row.values[col.id]}</dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>
    </div>
  )
}
