import type { Metadata } from "next"
import { MarketingFeaturesClient } from "@/components/marketing/MarketingFeaturesClient"

export const metadata: Metadata = {
  title: "FiskAI — Mogućnosti",
  description:
    "Pregled mogućnosti FiskAI platforme (beta): računi, troškovi, AI/OCR i priprema za e-račune.",
}

export default function FeaturesPage() {
  return <MarketingFeaturesClient />
}
