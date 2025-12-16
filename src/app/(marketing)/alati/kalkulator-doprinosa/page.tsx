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
    <div className="mx-auto max-w-4xl px-4 py-14 md:px-6">
      <nav className="mb-6 text-sm text-[var(--muted)]">
        <Link href="/baza-znanja" className="hover:text-[var(--foreground)]">
          Baza znanja
        </Link>{" "}
        <span className="text-[var(--muted)]">/</span>{" "}
        <Link href="/alati" className="hover:text-[var(--foreground)]">
          Alati
        </Link>{" "}
        <span className="text-[var(--muted)]">/</span>{" "}
        <span className="text-[var(--foreground)]">Doprinosi</span>
      </nav>

      <h1 className="text-display text-4xl font-semibold">Kalkulator doprinosa 2025.</h1>
      <p className="mt-4 text-[var(--muted)]">
        Mjesečni doprinosi za paušalne obrtnike. Iznosi vrijede za 2025. godinu i temelje se na
        minimalnoj osnovici od 719,20 EUR.
      </p>

      <div className="mt-8">
        <ContributionCalculator embedded={false} />
      </div>

      <div className="mt-10 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
        <h2 className="text-lg font-semibold">Povezani vodiči</h2>
        <ul className="mt-4 space-y-2 text-sm">
          <li>
            <Link
              href="/vodic/pausalni-obrt"
              className="font-semibold text-blue-700 hover:underline"
            >
              Paušalni obrt - kompletan vodič
            </Link>
          </li>
          <li>
            <Link href="/alati/uplatnice" className="font-semibold text-blue-700 hover:underline">
              Generator uplatnica za doprinose
            </Link>
          </li>
        </ul>
      </div>
    </div>
  )
}
