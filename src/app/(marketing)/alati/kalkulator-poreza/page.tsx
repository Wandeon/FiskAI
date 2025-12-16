import { TaxCalculator } from "@/components/knowledge-hub/calculators/TaxCalculator"
import Link from "next/link"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Kalkulator paušalnog poreza 2025 | FiskAI",
  description:
    "Izračunajte kvartalni i godišnji paušalni porez na temelju očekivanog prihoda. Svi porezni razredi za 2025.",
}

export default function TaxCalculatorPage() {
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
        <span className="text-[var(--foreground)]">Paušalni porez</span>
      </nav>

      <h1 className="text-display text-4xl font-semibold">Kalkulator paušalnog poreza 2025.</h1>
      <p className="mt-4 text-[var(--muted)]">
        Unesite očekivani godišnji prihod i izračunajte ukupne godišnje troškove uključujući porez,
        doprinose i HOK članarinu.
      </p>

      <div className="mt-8">
        <TaxCalculator embedded={false} />
      </div>

      <div className="mt-10 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
        <h2 className="text-lg font-semibold">Povezani sadržaj</h2>
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
            <Link
              href="/usporedba/pocinjem-solo"
              className="font-semibold text-blue-700 hover:underline"
            >
              Usporedba: počinjem solo (paušal vs obrt vs j.d.o.o.)
            </Link>
          </li>
        </ul>
      </div>
    </div>
  )
}
