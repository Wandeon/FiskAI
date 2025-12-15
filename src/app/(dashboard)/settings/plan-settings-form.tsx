"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { toast } from "@/lib/toast"
import { updateCompanyPlan } from "@/app/actions/company"
import type { Company } from "@prisma/client"
import type { ModuleKey, LegalForm } from "@/lib/capabilities"

const legalForms = [
  { value: "OBRT_PAUSAL", label: "Obrt (paušal)" },
  { value: "OBRT_REAL", label: "Obrt (realno)" },
  { value: "OBRT_VAT", label: "Obrt (PDV)" },
  { value: "JDOO", label: "j.d.o.o." },
  { value: "DOO", label: "d.o.o." },
] as const

const modules: { key: ModuleKey; label: string }[] = [
  { key: "invoicing", label: "Dokumenti" },
  { key: "eInvoicing", label: "E-Računi" },
  { key: "expenses", label: "Troškovi" },
  { key: "banking", label: "Banka" },
  { key: "reports", label: "Izvještaji" },
  { key: "settings", label: "Postavke" },
]

export function PlanSettingsForm({ company }: { company: Company }) {
  const [legalForm, setLegalForm] = useState<LegalForm>((company.legalForm as LegalForm) || "DOO")
  const [isVatPayer, setIsVatPayer] = useState<boolean>(company.isVatPayer)
  const [entitlements, setEntitlements] = useState<ModuleKey[]>(
    Array.isArray(company.entitlements)
      ? (company.entitlements as ModuleKey[])
      : ["invoicing", "eInvoicing", "expenses", "reports", "settings"]
  )
  const [isPending, startTransition] = useTransition()

  const toggleEntitlement = (key: ModuleKey) => {
    setEntitlements((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]))
  }

  const onSubmit = () => {
    startTransition(async () => {
      const res = await updateCompanyPlan(company.id, {
        legalForm,
        isVatPayer,
        entitlements,
      })
      if (res?.error) {
        toast.error("Greška", res.error)
      } else {
        toast.success("Plan ažuriran")
      }
    })
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
            Pravna forma
          </label>
          <select
            value={legalForm}
            onChange={(e) => setLegalForm(e.target.value as LegalForm)}
            className="w-full rounded-button border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          >
            {legalForms.map((form) => (
              <option key={form.value} value={form.value}>
                {form.label}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Određuje koja polja/obveze se prikazuju.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <input
            id="vatPayer"
            type="checkbox"
            checked={isVatPayer}
            onChange={(e) => setIsVatPayer(e.target.checked)}
            className="h-4 w-4 rounded border-[var(--border)] text-brand-600 focus:ring-brand-500"
          />
          <label htmlFor="vatPayer" className="text-sm font-medium text-[var(--foreground)]">
            PDV obveznik
          </label>
        </div>
      </div>

      <div>
        <p className="text-sm font-semibold text-[var(--foreground)]">Moduli</p>
        <p className="text-xs text-[var(--muted)] mb-2">
          Aktivirajte module dostupne ovom klijentu.
        </p>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          {modules.map((mod) => {
            const checked = entitlements.includes(mod.key)
            return (
              <label
                key={mod.key}
                className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-secondary)]/60 px-3 py-2 text-sm"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleEntitlement(mod.key)}
                  className="h-4 w-4 rounded border-[var(--border)] text-brand-600 focus:ring-brand-500"
                />
                <span className="font-medium text-[var(--foreground)]">{mod.label}</span>
              </label>
            )
          })}
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={onSubmit} disabled={isPending || entitlements.length === 0}>
          {isPending ? "Spremanje..." : "Spremi plan"}
        </Button>
      </div>
    </div>
  )
}
