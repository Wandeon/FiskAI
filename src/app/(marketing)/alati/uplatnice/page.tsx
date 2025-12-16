import { Metadata } from "next"
import Link from "next/link"
import { PaymentSlipGenerator } from "@/components/knowledge-hub/calculators/PaymentSlipGenerator"
import { PAYMENT_IBANS, PAYMENT_MODEL } from "@/lib/knowledge-hub/constants"

export const metadata: Metadata = {
  title: "Generator Uplatnica | FiskAI",
  description: "Generirajte Hub3 uplatnice za plaćanje doprinosa, poreza i prireza.",
}

export default function PaymentSlipsPage() {
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
        <span className="text-[var(--foreground)]">Uplatnice</span>
      </nav>

      <header>
        <h1 className="text-display text-4xl font-semibold">Generator uplatnica (HUB3)</h1>
        <p className="mt-4 text-[var(--muted)]">
          Odaberite vrstu uplate, unesite OIB i generirajte barkod (PDF417) koji možete skenirati u
          mobilnom bankarstvu.
        </p>
      </header>

      <div className="mt-8">
        <PaymentSlipGenerator embedded={false} />
      </div>

      <section className="mt-12 prose prose-slate max-w-none">
        <h2>Kako koristiti?</h2>
        <ol>
          <li>Odaberite vrstu uplate (MIO, HZZO, porez...)</li>
          <li>Unesite svoj OIB</li>
          <li>Unesite iznos za uplatu</li>
          <li>Skenirajte generirani barkod mobilnim bankarstvom</li>
        </ol>

        <h2>IBAN-ovi za uplate</h2>
        <ul>
          <li>
            <strong>Državni proračun (MIO I / porezi):</strong> {PAYMENT_IBANS.STATE_BUDGET}
          </li>
          <li>
            <strong>MIO II. stup:</strong> {PAYMENT_IBANS.MIO_II}
          </li>
          <li>
            <strong>HZZO:</strong> {PAYMENT_IBANS.HZZO}
          </li>
          <li>
            <strong>HOK:</strong> {PAYMENT_IBANS.HOK}
          </li>
        </ul>
        <p>
          <strong>Model:</strong> {PAYMENT_MODEL}
        </p>
      </section>
    </div>
  )
}
