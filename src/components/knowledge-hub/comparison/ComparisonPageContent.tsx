// src/components/knowledge-hub/comparison/ComparisonPageContent.tsx
// TODO: Implement in Task 1.7

import { ComparisonContent } from "@/lib/knowledge-hub/mdx"

interface ComparisonPageContentProps {
  comparison: ComparisonContent
  searchParams: { [key: string]: string | undefined }
}

export function ComparisonPageContent({ comparison, searchParams }: ComparisonPageContentProps) {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-4">{comparison.frontmatter.title}</h1>
      <p className="text-gray-600">{comparison.frontmatter.description}</p>
      <div className="mt-8">
        <p className="text-sm text-gray-500">
          This is a placeholder component. Full implementation coming in Task 1.7.
        </p>
      </div>
    </div>
  )
}
