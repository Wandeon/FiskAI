// src/components/knowledge-hub/guide/PersonalizedSection.tsx
"use client"

import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { calculatePausalMonthlyCosts, formatEUR } from "@/lib/knowledge-hub/calculations"
import { getPausalTaxBracket } from "@/lib/knowledge-hub/constants"

export function PersonalizedSection() {
  const searchParams = useSearchParams()

  const prihod = searchParams.get("prihod")
  const gotovina = searchParams.get("gotovina")
  const zaposlenje = searchParams.get("zaposlenje")

  if (!prihod) return null

  const annualRevenue = parseInt(prihod, 10)
  const costs = calculatePausalMonthlyCosts(annualRevenue)
  const bracket = getPausalTaxBracket(annualRevenue)

  return (
    <Card className="mb-8 border-blue-200 bg-blue-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="text-2xl">🎯</span>
          Vaš personalizirani pregled
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-600 mb-4">Na temelju vaših odgovora iz čarobnjaka:</p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="bg-white p-4 rounded-lg">
            <p className="text-sm text-gray-500">Očekivani godišnji prihod</p>
            <p className="text-xl font-bold">{formatEUR(annualRevenue)}</p>
          </div>
          <div className="bg-white p-4 rounded-lg">
            <p className="text-sm text-gray-500">Kvartalni porez</p>
            <p className="text-xl font-bold">{formatEUR(bracket.quarterlyTax)}</p>
          </div>
          <div className="bg-white p-4 rounded-lg">
            <p className="text-sm text-gray-500">Mjesečni doprinosi</p>
            <p className="text-xl font-bold">{formatEUR(costs.contributions)}</p>
          </div>
          <div className="bg-white p-4 rounded-lg">
            <p className="text-sm text-gray-500">Fiskalizacija</p>
            <p className="text-xl font-bold">{gotovina === "da" ? "Potrebna" : "Nije potrebna"}</p>
          </div>
        </div>
        {zaposlenje === "da" && (
          <p className="mt-4 text-sm bg-yellow-50 p-3 rounded border border-yellow-200">
            💡 <strong>Napomena:</strong> Uz zaposlenje kod drugog poslodavca, i dalje plaćate pune
            doprinose za obrt.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
