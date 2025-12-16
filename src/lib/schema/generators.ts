import type { FAQItem, Source } from "@/lib/knowledge-hub/types"

interface BreadcrumbItem {
  name: string
  url: string
}

interface HowToStep {
  name: string
  text: string
  image?: string
}

export function generateBreadcrumbSchema(items: BreadcrumbItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  }
}

export function generateFAQSchema(items: FAQItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.a,
      },
    })),
  }
}

export function generateHowToSchema(
  title: string,
  description: string,
  steps: HowToStep[],
  totalTime?: string
) {
  return {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: title,
    description,
    ...(totalTime && { totalTime }),
    step: steps.map((step, index) => ({
      "@type": "HowToStep",
      position: index + 1,
      name: step.name,
      text: step.text,
      ...(step.image && { image: step.image }),
    })),
  }
}

export function generateArticleSchema(
  title: string,
  description: string,
  datePublished: string,
  dateModified: string,
  url: string
) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    description,
    datePublished,
    dateModified,
    url,
    publisher: {
      "@type": "Organization",
      name: "FiskAI",
      url: "https://fisk.ai",
    },
  }
}

export function generateDefinedTermSchema(term: string, definition: string, url: string) {
  return {
    "@context": "https://schema.org",
    "@type": "DefinedTerm",
    name: term,
    description: definition,
    url,
  }
}

export function generateWebApplicationSchema(name: string, description: string, url: string) {
  return {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name,
    description,
    url,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Any",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "EUR",
    },
  }
}
