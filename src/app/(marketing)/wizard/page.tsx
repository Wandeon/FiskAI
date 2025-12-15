// src/app/(marketing)/wizard/page.tsx
import { WizardContainer } from "@/components/knowledge-hub/wizard/WizardContainer"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Pronađite svoj poslovni oblik | FiskAI",
  description:
    "Interaktivni čarobnjak koji vam pomaže odabrati pravi oblik poslovanja u Hrvatskoj.",
}

export default function WizardPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white py-12 px-4">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">Pronađite idealan oblik poslovanja</h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Odgovorite na nekoliko pitanja i dobit ćete personaliziranu preporuku s detaljnim vodičem
          za vaš oblik poslovanja.
        </p>
      </div>

      <WizardContainer />
    </div>
  )
}
