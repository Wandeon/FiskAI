"use client"

import { ErrorDisplay } from "@/components/errors/error-display"

export default function AppError({
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
      title="Greška u aplikaciji"
      message="Došlo je do greške prilikom učitavanja aplikacije. Molimo pokušajte ponovno."
    />
  )
}
