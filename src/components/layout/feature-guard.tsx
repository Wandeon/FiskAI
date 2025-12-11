'use client'

import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { useCapabilities } from "@/hooks/use-capabilities"
import Link from "next/link"

export function FeatureGuard({
  module,
  children,
}: {
  module: "invoicing" | "eInvoicing" | "expenses" | "banking" | "reports" | "settings"
  children: React.ReactNode
}) {
  const capabilities = useCapabilities()
  const router = useRouter()
  const enabled = capabilities.modules[module]?.enabled !== false

  useEffect(() => {
    if (!enabled) {
      router.replace("/settings?tab=plan")
    }
  }, [enabled, router])

  if (!enabled) {
    return (
      <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface-secondary)]/60 p-6 text-center">
        <p className="text-sm font-semibold text-[var(--foreground)]">Ovaj modul nije uključen u vaš plan.</p>
        <p className="text-sm text-[var(--muted)] mt-1">Uključite modul u postavkama ili kontaktirajte administratore.</p>
        <div className="mt-3 flex justify-center">
          <Link href="/settings?tab=plan" className="text-sm font-semibold text-brand-600 hover:text-brand-700">
            Upravljaj planom →
          </Link>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
