import { Metadata } from "next"
import { notFound } from "next/navigation"
import { getComparisonBySlug, getAllComparisonSlugs } from "@/lib/knowledge-hub/mdx"
import { ComparisonPageContent } from "@/components/knowledge-hub/comparison/ComparisonPageContent"

interface PageProps {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ [key: string]: string | undefined }>
}

export async function generateStaticParams() {
  const slugs = await getAllComparisonSlugs()
  return slugs.map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const comparison = await getComparisonBySlug(slug)

  if (!comparison) {
    return { title: "Usporedba nije pronađena" }
  }

  return {
    title: `${comparison.frontmatter.title} | FiskAI`,
    description: comparison.frontmatter.description,
  }
}

export default async function ComparisonPage({ params, searchParams }: PageProps) {
  const { slug } = await params
  const resolvedSearchParams = await searchParams
  const comparison = await getComparisonBySlug(slug)

  if (!comparison) {
    notFound()
  }

  return <ComparisonPageContent comparison={comparison} searchParams={resolvedSearchParams} />
}
