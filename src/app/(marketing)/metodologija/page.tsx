import { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Metodologija | FiskAI",
  description:
    "Kako FiskAI izračunava poreze, doprinose i druge pokazatelje. Transparentne formule i pretpostavke.",
}

export default function MetodologijaPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="mb-8 text-4xl font-bold text-white">Metodologija</h1>

      <div className="prose prose-invert max-w-none">
        <p className="lead">
          Ovdje objašnjavamo kako FiskAI izračunava poreze, doprinose i druge financijske
          pokazatelje. Transparentnost je ključna za povjerenje.
        </p>

        <h2>Kalkulatori doprinosa</h2>
        <p>Kalkulatori koriste službene stope objavljene u Narodnim novinama. Za 2025. godinu:</p>
        <ul>
          <li>MIO I. stup: 15% na bruto</li>
          <li>MIO II. stup: 5% na bruto</li>
          <li>Zdravstveno (HZZO): 16,5% na bruto</li>
        </ul>
        <p>Minimalna osnovica za 2025. iznosi 700,00 EUR mjesečno.</p>

        <h2>Paušalni obrt</h2>
        <p>Izračuni za paušalni obrt temelje se na propisanim stopama:</p>
        <ul>
          <li>Porez na dohodak: 10% na paušalnu osnovicu</li>
          <li>Prirez: ovisi o općini/gradu prebivališta</li>
          <li>Doprinosi: fiksni iznos prema razredu prihoda</li>
        </ul>

        <h2>PDV kalkulator</h2>
        <p>PDV stope u Hrvatskoj (2025.):</p>
        <ul>
          <li>Opća stopa: 25%</li>
          <li>Snižena stopa: 13% (ugostiteljstvo, turizam)</li>
          <li>Najniža stopa: 5% (lijekovi, knjige)</li>
        </ul>

        <h2>Pretpostavke</h2>
        <p>Svi izračuni pretpostavljaju:</p>
        <ul>
          <li>Porezni rezident RH</li>
          <li>Standardni osobni odbitak (560 EUR/mj)</li>
          <li>Bez dodatnih olakšica osim ako su navedene</li>
        </ul>

        <h2>Ažuriranje</h2>
        <p>
          Kalkulatore ažuriramo unutar 7 dana od objave novih propisa u Narodnim novinama. Datum
          posljednjeg ažuriranja prikazan je na svakom alatu.
        </p>

        <div className="mt-8 rounded-lg bg-amber-500/10 p-4 text-amber-200">
          <strong>Napomena:</strong> FiskAI pruža informativne izračune. Za službene potrebe
          konzultirajte ovlaštenog poreznog savjetnika ili računovođu.
        </div>
      </div>

      <div className="mt-8">
        <Link href="/izvori" className="text-blue-400 hover:text-blue-300">
          Pogledaj sve službene izvore →
        </Link>
      </div>
    </div>
  )
}
