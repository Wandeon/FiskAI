interface JsonLdProps {
  schemas: object[]
}

export function JsonLd({ schemas }: JsonLdProps) {
  if (!schemas.length) return null

  const jsonLd = schemas.length === 1 ? schemas[0] : schemas

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  )
}
