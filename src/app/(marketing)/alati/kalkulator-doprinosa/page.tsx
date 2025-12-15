import { ContributionCalculator } from "@/components/knowledge-hub/calculators/ContributionCalculator"
import Link from "next/link"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Kalkulator doprinosa 2025 | FiskAI",
  description:
    "Izračunajte mjesečne doprinose za MIO I, MIO II i HZZO za paušalne obrtnike u 2025. godini.",
}

export default function ContributionCalculatorPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <nav className="mb-8">
        <Link href="/alati" className="text-blue-600 hover:underline">
          ← Natrag na alate
        </Link>
      </nav>

      <h1 className="text-3xl font-bold mb-4">Kalkulator doprinosa 2025.</h1>
      <p className="text-gray-600 mb-8">
        Mjesečni doprinosi za paušalne obrtnike. Iznosi vrijede za 2025. godinu i temelje se na
        minimalnoj osnovici od 719,20 EUR.
      </p>

      <ContributionCalculator embedded={false} />

      <div className="mt-8 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-semibold mb-2">Povezani vodiči</h3>
        <ul className="space-y-2">
          <li>
            <Link href="/vodic/pausalni-obrt" className="text-blue-600 hover:underline">
              Paušalni obrt - kompletan vodič
            </Link>
          </li>
          <li>
            <Link href="/alati/generator-uplatnica" className="text-blue-600 hover:underline">
              Generator uplatnica za doprinose
            </Link>
          </li>
        </ul>
      </div>
    </div>
  )
}
