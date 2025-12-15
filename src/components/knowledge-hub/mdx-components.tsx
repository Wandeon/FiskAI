// src/components/knowledge-hub/mdx-components.tsx
import { PersonalizedSection } from "./guide/PersonalizedSection"
import { FAQ } from "./guide/FAQ"
import { ContributionCalculator } from "./calculators/ContributionCalculator"
import { TaxCalculator } from "./calculators/TaxCalculator"
import { PaymentSlipGenerator } from "./calculators/PaymentSlipGenerator"

export const mdxComponents = {
  PersonalizedSection,
  FAQ,
  ContributionCalculator,
  TaxCalculator,
  PaymentSlipGenerator,
  // Standard HTML overrides
  h1: (props: any) => <h1 className="text-3xl font-bold mb-6" {...props} />,
  h2: (props: any) => <h2 className="text-2xl font-semibold mt-8 mb-4" {...props} />,
  h3: (props: any) => <h3 className="text-xl font-medium mt-6 mb-3" {...props} />,
  table: (props: any) => (
    <div className="overflow-x-auto my-4">
      <table className="min-w-full border-collapse" {...props} />
    </div>
  ),
  th: (props: any) => (
    <th className="border border-gray-300 bg-gray-50 px-4 py-2 text-left font-medium" {...props} />
  ),
  td: (props: any) => <td className="border border-gray-300 px-4 py-2" {...props} />,
}
