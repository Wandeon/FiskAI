import { Metadata } from "next"
import { MetodologijaPageClient } from "./MetodologijaPageClient"

export const metadata: Metadata = {
  title: "Metodologija | FiskAI",
  description:
    "Kako FiskAI izračunava poreze, doprinose i druge pokazatelje. Transparentne formule i pretpostavke.",
}

export default function MetodologijaPage() {
  return <MetodologijaPageClient />
}
