import { Metadata } from "next"
import { PaymentSlipGenerator } from "@/components/knowledge-hub/calculators/PaymentSlipGenerator"

export const metadata: Metadata = {
  title: "Generator Uplatnica | FiskAI",
  description: "Generirajte Hub3 uplatnice za plaćanje doprinosa, poreza i prireza.",
}

export default function PaymentSlipsPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Generator Uplatnica</h1>
        <p className="text-lg text-gray-600">
          Generirajte ispravne uplatnice za plaćanje doprinosa i poreza.
        </p>
      </header>

      <PaymentSlipGenerator embedded={false} />

      <section className="mt-12 prose prose-gray max-w-none">
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
            <strong>MIO I. stup:</strong> HR1210010051863000160
          </li>
          <li>
            <strong>MIO II. stup:</strong> HR7610010051700036001
          </li>
          <li>
            <strong>HZZO:</strong> HR6510010051550100001
          </li>
          <li>
            <strong>Porez na dohodak:</strong> HR1210010051863000160
          </li>
        </ul>
      </section>
    </div>
  )
}
