// src/app/(marketing)/wizard/page.tsx
import { WizardContainer } from "@/components/knowledge-hub/wizard/WizardContainer"
import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Pronađite svoj poslovni oblik | FiskAI",
  description:
    "Interaktivni čarobnjak koji vam pomaže odabrati pravi oblik poslovanja u Hrvatskoj.",
}

export default function WizardPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-14 md:px-6">
      <nav className="mb-6 text-sm text-[var(--muted)]">
        <Link href="/baza-znanja" className="hover:text-[var(--foreground)]">
          Baza znanja
        </Link>{" "}
        <span className="text-[var(--muted)]">/</span>{" "}
        <span className="text-[var(--foreground)]">Čarobnjak</span>
      </nav>

      <header className="text-center">
        <h1 className="text-display text-4xl font-semibold md:text-5xl">
          Pronađite idealan oblik poslovanja
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-[var(--muted)]">
          Odgovorite na nekoliko pitanja i dobit ćete personaliziranu preporuku s detaljnim vodičem
          za vaš oblik poslovanja.
        </p>
      </header>

      <div className="mt-10">
        <WizardContainer />
      </div>
    </div>
  )
}
