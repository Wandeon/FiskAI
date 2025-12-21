"use client"

import { ErrorDisplay } from "@/components/errors/error-display"

export default function DashboardError({
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
      title="Greška na kontrolnoj ploči"
      message="Došlo je do greške prilikom učitavanja kontrolne ploče. Molimo pokušajte ponovno."
    />
  )
}
