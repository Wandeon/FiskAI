import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Postavljanje paušalnog obrta | FiskAI",
  description: "Postavite svoj paušalni obrt u 3 jednostavna koraka",
}

interface PausalniOnboardingLayoutProps {
  children: React.ReactNode
}

/**
 * Layout for paušalni obrt onboarding flow.
 * Parent (onboarding) layout already provides header/footer,
 * this layout just adds paušalni-specific metadata.
 */
export default function PausalniOnboardingLayout({ children }: PausalniOnboardingLayoutProps) {
  return <>{children}</>
}
