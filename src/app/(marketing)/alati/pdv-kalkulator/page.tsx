import { Metadata } from "next"
import Link from "next/link"
import { PDVThresholdCalculator } from "@/components/knowledge-hub/calculators/PDVThresholdCalculator"

export const metadata: Metadata = {
  title: "PDV Kalkulator - Kada prelazim prag? | FiskAI",
  description:
    "Izračunajte koliko ste blizu PDV praga od 60.000€ i što se mijenja kada ga prijeđete.",
}

export default function PDVCalculatorPage() {
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
        <span className="text-[var(--foreground)]">PDV prag</span>
      </nav>

      <header>
        <h1 className="text-display text-4xl font-semibold">PDV kalkulator (60.000€)</h1>
        <p className="mt-4 text-[var(--muted)]">
          Provjerite koliko ste blizu praga i kad postajete PDV obveznik. Kalkulator koristi
          trenutni prihod (YTD), mjesečni prosjek i preostale mjesece do kraja godine.
        </p>
      </header>

      <div className="mt-8">
        <PDVThresholdCalculator />
      </div>

      <section className="mt-12 prose prose-slate max-w-none">
        <h2>Što je PDV prag?</h2>
        <p>
          Od 2025. godine, PDV prag u Hrvatskoj iznosi <strong>60.000 EUR</strong> godišnje. Kada
          vaš prihod prijeđe ovaj iznos, automatski postajete PDV obveznik od prvog dana sljedećeg
          mjeseca.
        </p>

        <h2>Što se mijenja kada postanete PDV obveznik?</h2>
        <ul>
          <li>Morate obračunavati 25% PDV na sve račune</li>
          <li>Možete odbijati ulazni PDV (troškovi)</li>
          <li>Obvezne mjesečne ili kvartalne PDV prijave</li>
          <li>Novi IBAN-ovi za uplate poreza</li>
        </ul>

        <h2>Povezane stranice</h2>
        <ul>
          <li>
            <Link href="/usporedba/preko-praga">Što kada prijeđem prag?</Link>
          </li>
          <li>
            <Link href="/vodic/pausalni-obrt#pdv">PDV za paušalne obrtnike</Link>
          </li>
        </ul>
      </section>
    </div>
  )
}
