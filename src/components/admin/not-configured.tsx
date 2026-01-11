// src/components/admin/not-configured.tsx
import { AlertTriangle } from "lucide-react"

interface NotConfiguredProps {
  feature: string
  missingTables: string[]
  actionHint?: string
}

/**
 * Display when a feature's required database tables are not available.
 * Used for graceful degradation when optional features are not deployed.
 */
export function NotConfigured({ feature, missingTables, actionHint }: NotConfiguredProps) {
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-8">
      <AlertTriangle className="mb-4 h-12 w-12 text-[var(--muted)]" />
      <h2 className="mb-2 text-xl font-semibold">Not configured on this environment</h2>
      <p className="mb-4 text-center text-[var(--muted)]">
        The <strong>{feature}</strong> feature requires database tables that are not present.
      </p>

      <div className="mb-4 rounded-lg border border-[var(--border)] bg-[var(--surface-secondary)] p-4">
        <div className="mb-2 text-sm font-medium">Missing tables:</div>
        <ul className="list-inside list-disc space-y-1 font-mono text-sm text-[var(--muted)]">
          {missingTables.map((table) => (
            <li key={table}>{table}</li>
          ))}
        </ul>
      </div>

      {actionHint && (
        <p className="text-sm text-[var(--muted)]">
          <strong>Action:</strong> {actionHint}
        </p>
      )}
    </div>
  )
}
