import { type ComponentProps } from "react"
import { HeroSection } from "@/components/sections/HeroSection"
import { FeatureGrid } from "@/components/sections/FeatureGrid"
import { CTASection } from "@/components/sections/CTASection"

interface MarketingPageTemplateProps {
  /** Hero section props */
  hero: ComponentProps<typeof HeroSection>
  /** Optional feature grid sections (can have multiple) */
  featureSections?: ComponentProps<typeof FeatureGrid>[]
  /** Optional CTA section */
  cta?: ComponentProps<typeof CTASection>
  /** Additional sections to render between features and CTA */
  children?: React.ReactNode
}

/**
 * MarketingPageTemplate: Standard marketing page layout.
 *
 * Portal-scoped to (marketing) route group.
 * Pages become configuration, not layout code.
 */
export function MarketingPageTemplate({
  hero,
  featureSections = [],
  cta,
  children,
}: MarketingPageTemplateProps) {
  return (
    <>
      <HeroSection {...hero} />

      {featureSections.map((section, i) => (
        <FeatureGrid key={i} {...section} />
      ))}

      {children}

      {cta && <CTASection {...cta} />}
    </>
  )
}
