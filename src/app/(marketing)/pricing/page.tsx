import type { Metadata } from "next"
import { MarketingPricingClient } from "@/components/marketing/MarketingPricingClient"

export const metadata: Metadata = {
  title: "FiskAI — Cijene i paketi",
  description:
    "Transparentne cijene za paušalni obrt, VAT obrt/d.o.o. i knjigovođe. Besplatna proba, bez ugovorne obveze.",
}

export default function PricingPage() {
  return <MarketingPricingClient />
}
