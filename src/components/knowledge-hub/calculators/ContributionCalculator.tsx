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
        <div className="flex justify-between items-center py-2 border-b border-[var(--border)]">
          <div>
            <p className="font-medium">MIO I. stup (mirovinsko)</p>
            <p className="text-sm text-[var(--muted)]">15% od osnovice</p>
          </div>
          <p className="font-mono font-bold">{formatEUR(breakdown.mioI)}</p>
        </div>
        <div className="flex justify-between items-center py-2 border-b border-[var(--border)]">
          <div>
            <p className="font-medium">MIO II. stup (kapitalizirano)</p>
            <p className="text-sm text-[var(--muted)]">5% od osnovice</p>
          </div>
          <p className="font-mono font-bold">{formatEUR(breakdown.mioII)}</p>
        </div>
        <div className="flex justify-between items-center py-2 border-b border-[var(--border)]">
          <div>
            <p className="font-medium">HZZO (zdravstveno)</p>
            <p className="text-sm text-[var(--muted)]">16,5% od osnovice</p>
          </div>
          <p className="font-mono font-bold">{formatEUR(breakdown.hzzo)}</p>
        </div>
        <div className="flex justify-between items-center py-2 bg-[var(--surface-secondary)] px-3 rounded-lg border border-[var(--border)]">
          <p className="font-bold">Ukupno mjesečno</p>
          <p className="font-mono font-bold text-lg">{formatEUR(breakdown.total)}</p>
        </div>
      </div>
      <p className="text-sm text-[var(--muted)]">
        Osnovica za izračun: {formatEUR(breakdown.base)} (minimalna osnovica 2025.)
      </p>

      <details className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
        <summary className="cursor-pointer text-sm font-semibold">
          IBAN-ovi za uplatu (HUB3)
        </summary>
        <div className="mt-3 space-y-2 text-sm">
          <div className="flex items-start justify-between gap-3">
            <span className="text-[var(--muted)]">MIO I. stup (državni proračun)</span>
            <span className="font-mono">{PAYMENT_IBANS.STATE_BUDGET}</span>
          </div>
          <div className="flex items-start justify-between gap-3">
            <span className="text-[var(--muted)]">MIO II. stup</span>
            <span className="font-mono">{PAYMENT_IBANS.MIO_II}</span>
          </div>
          <div className="flex items-start justify-between gap-3">
            <span className="text-[var(--muted)]">HZZO</span>
            <span className="font-mono">{PAYMENT_IBANS.HZZO}</span>
          </div>
          <p className="pt-2 text-xs text-[var(--muted)]">Model: {PAYMENT_MODEL}</p>
        </div>
      </details>
    </div>
  )

  if (embedded) {
    return <div className="my-6">{content}</div>
  }

  return (
    <Card className="card">
      <CardHeader>
        <CardTitle>Kalkulator doprinosa 2025.</CardTitle>
      </CardHeader>
      <CardContent>{content}</CardContent>
    </Card>
  )
}
