// src/app/(marketing)/vodic/[slug]/page.tsx
import { notFound } from "next/navigation"
import { MDXRemote } from "next-mdx-remote/rsc"
import { getGuideBySlug, getGuideSlugs } from "@/lib/knowledge-hub/mdx"
import { mdxComponents } from "@/components/knowledge-hub/mdx-components"
import type { Metadata } from "next"

interface Props {
  params: Promise<{ slug: string }>
}

// Temporarily disabled static generation due to MDX/React compatibility issue
// TODO: Re-enable once MDX rendering is fixed
// export async function generateStaticParams() {
//   const slugs = getGuideSlugs()
//   return slugs.map((slug) => ({ slug }))
// }

export const dynamicParams = true
export const dynamic = "force-dynamic"

function getBaseUrl() {
  const env = process.env.NEXT_PUBLIC_APP_URL
  if (env) return env.replace(/\/+$/, "")
  return "http://localhost:3000"
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const guide = getGuideBySlug(slug)

  if (!guide) return { title: "Vodič nije pronađen" }

  const baseUrl = getBaseUrl()
  const pageUrl = `${baseUrl}/vodic/${slug}`
  const ogImage = `${baseUrl}/og-knowledge-hub.png`

  return {
    title: `${guide.frontmatter.title} | FiskAI`,
    description: guide.frontmatter.description,
    keywords: guide.frontmatter.keywords,
    authors: [{ name: "FiskAI" }],
    alternates: {
      canonical: pageUrl,
    },
    openGraph: {
      title: guide.frontmatter.title,
      description: guide.frontmatter.description,
      type: "article",
      url: pageUrl,
      siteName: "FiskAI",
      locale: "hr_HR",
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: guide.frontmatter.title,
        },
      ],
      ...(guide.frontmatter.lastUpdated && {
        modifiedTime: new Date(guide.frontmatter.lastUpdated).toISOString(),
      }),
    },
    twitter: {
      card: "summary_large_image",
      title: guide.frontmatter.title,
      description: guide.frontmatter.description,
      images: [ogImage],
    },
  }
}

export default async function GuidePage({ params }: Props) {
  const { slug } = await params
  const guide = getGuideBySlug(slug)

  if (!guide) {
    notFound()
  }

  const baseUrl = getBaseUrl()
  const pageUrl = `${baseUrl}/vodic/${slug}`

  // Structured data for SEO
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: guide.frontmatter.title,
    description: guide.frontmatter.description,
    url: pageUrl,
    author: {
      "@type": "Organization",
      name: "FiskAI",
      url: baseUrl,
    },
    publisher: {
      "@type": "Organization",
      name: "FiskAI",
      url: baseUrl,
      logo: {
        "@type": "ImageObject",
        url: `${baseUrl}/logo.png`,
      },
    },
    ...(guide.frontmatter.lastUpdated && {
      dateModified: new Date(guide.frontmatter.lastUpdated).toISOString(),
      datePublished: new Date(guide.frontmatter.lastUpdated).toISOString(),
    }),
    ...(guide.frontmatter.keywords && {
      keywords: Array.isArray(guide.frontmatter.keywords)
        ? guide.frontmatter.keywords.join(", ")
        : guide.frontmatter.keywords,
    }),
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <article className="prose prose-lg max-w-none">
          <MDXRemote source={guide.content} components={mdxComponents} />
        </article>
      </div>
    </>
  )
}
