"use client"

import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { useCapabilities } from "@/hooks/use-capabilities"
import Link from "next/link"
import type { ModuleKey } from "@/lib/modules/definitions"

// Map component module names to actual ModuleKey values
const moduleKeyMap: Record<string, ModuleKey | null> = {
  invoicing: "invoicing",
  eInvoicing: "e-invoicing",
  expenses: "expenses",
  banking: "banking",
  reports: "reports-basic",
  settings: null, // Settings is always available
}

export function FeatureGuard({
  module,
  children,
}: {
  module: "invoicing" | "eInvoicing" | "expenses" | "banking" | "reports" | "settings"
  children: React.ReactNode
}) {
  const capabilities = useCapabilities()
  const router = useRouter()

  // Map to actual module key, or treat as always enabled if null
  const moduleKey = moduleKeyMap[module]
  const enabled = moduleKey === null ? true : capabilities.modules[moduleKey]?.enabled !== false

  useEffect(() => {
    if (!enabled) {
      router.replace("/settings?tab=plan")
    }
  }, [enabled, router])

  if (!enabled) {
    return (
      <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface-secondary)]/60 p-6 text-center">
        <p className="text-sm font-semibold text-[var(--foreground)]">
          Ovaj modul nije uključen u vaš plan.
        </p>
        <p className="text-sm text-[var(--muted)] mt-1">
          Uključite modul u postavkama ili kontaktirajte administratore.
        </p>
        <div className="mt-3 flex justify-center">
          <Link
            href="/settings?tab=plan"
            className="text-sm font-semibold text-brand-600 hover:text-brand-700"
          >
            Upravljaj planom →
          </Link>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
