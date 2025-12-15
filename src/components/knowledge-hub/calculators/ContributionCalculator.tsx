// src/components/knowledge-hub/calculators/ContributionCalculator.tsx
"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { calculateContributions, formatEUR } from "@/lib/knowledge-hub/calculations"
import { PAYMENT_IBANS, PAYMENT_MODEL } from "@/lib/knowledge-hub/constants"

interface Props {
  embedded?: boolean
}

export function ContributionCalculator({ embedded = true }: Props) {
  const breakdown = calculateContributions()

  const content = (
    <div className="space-y-4">
      <div className="grid gap-3">
        <div className="flex justify-between items-center py-2 border-b">
          <div>
            <p className="font-medium">MIO I. stup (mirovinsko)</p>
            <p className="text-sm text-gray-500">15% od osnovice</p>
          </div>
          <p className="font-mono font-bold">{formatEUR(breakdown.mioI)}</p>
        </div>
        <div className="flex justify-between items-center py-2 border-b">
          <div>
            <p className="font-medium">MIO II. stup (kapitalizirano)</p>
            <p className="text-sm text-gray-500">5% od osnovice</p>
          </div>
          <p className="font-mono font-bold">{formatEUR(breakdown.mioII)}</p>
        </div>
        <div className="flex justify-between items-center py-2 border-b">
          <div>
            <p className="font-medium">HZZO (zdravstveno)</p>
            <p className="text-sm text-gray-500">16,5% od osnovice</p>
          </div>
          <p className="font-mono font-bold">{formatEUR(breakdown.hzzo)}</p>
        </div>
        <div className="flex justify-between items-center py-2 bg-gray-50 px-3 rounded-lg">
          <p className="font-bold">Ukupno mjesečno</p>
          <p className="font-mono font-bold text-lg">{formatEUR(breakdown.total)}</p>
        </div>
      </div>
      <p className="text-sm text-gray-500">
        Osnovica za izračun: {formatEUR(breakdown.base)} (minimalna osnovica 2025.)
      </p>
    </div>
  )

  if (embedded) {
    return <div className="my-6">{content}</div>
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Kalkulator doprinosa 2025.</CardTitle>
      </CardHeader>
      <CardContent>{content}</CardContent>
    </Card>
  )
}
