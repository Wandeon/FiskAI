"use client"

import { ErrorDisplay } from "@/components/errors/error-display"

export default function ComplianceError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <ErrorDisplay
      error={error}
      reset={reset}
      title="Greška na stranici usklađenosti"
      message="Došlo je do greške prilikom učitavanja podataka o usklađenosti. Molimo pokušajte ponovno."
    />
  )
}
