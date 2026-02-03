"use client"

import { useState, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ChevronLeft, Building2, Receipt, Mail, Edit2, Check, Loader2, Sparkles, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { useOnboardingStore, type LegalForm } from "@/lib/stores/onboarding-store"
import { createCompany } from "@/app/onboarding/actions"
import { formatIban } from "@fiskai/shared"

interface StepProps { onNext: () => void; onBack?: () => void }

const LEGAL_LABELS: Record<LegalForm, string> = { OBRT_PAUSAL: "Paušalni obrt", OBRT_REAL: "Obrt", DOO: "d.o.o.", JDOO: "j.d.o.o." }
const INCOME_LABELS: Record<string, string> = { under30: "Do 30.000 EUR", "30to60": "30.000 - 60.000 EUR", "60to100": "60.000 - 100.000 EUR", over100: "Preko 100.000 EUR", "": "-" }

type CreateState = "idle" | "creating" | "success" | "error"

export function Step4Review({ onBack }: StepProps) {
  const { data, setStep, setComplete } = useOnboardingStore()
  const [state, setState] = useState<CreateState>("idle")
  const [error, setError] = useState<string | null>(null)

  const handleEdit = useCallback((step: number) => setStep(step), [setStep])

  const handleCreate = useCallback(async () => {
    setState("creating")
    setError(null)
    try {
      const result = await createCompany({
        legalForm: data.legalForm, oib: data.oib, name: data.name, address: data.address,
        city: data.city, zipCode: data.zipCode, isVatPayer: data.isVatPayer,
        vatNumber: data.vatNumber || undefined, acceptsCash: data.acceptsCash,
        email: data.email || undefined, phone: data.phone || undefined, iban: data.iban || "",
        premisesName: data.premisesName, premisesCode: data.premisesCode, dataSource: data.dataSource,
        employedElsewhere: data.employedElsewhere, expectedIncomeRange: data.expectedIncomeRange,
      })
      if (result.success) {
        setState("success")
        setComplete()
        setTimeout(() => { window.location.href = "/dashboard" }, 2000)
      } else {
        setState("error")
        setError(result.error || "Greška pri stvaranju tvrtke")
      }
    } catch {
      setState("error")
      setError("Neočekivana greška. Pokušajte ponovno.")
    }
  }, [data, setComplete])

  const isPausal = data.legalForm === "OBRT_PAUSAL"

  if (state === "success") {
    return (
      <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
        <div className="text-center"><h1 className="text-2xl font-bold text-white">Pregled i potvrda</h1></div>
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center py-12">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 200, damping: 15 }} className="mb-6 rounded-full bg-green-500/20 p-6">
            <Check className="h-12 w-12 text-green-400" />
          </motion.div>
          <h2 className="text-xl font-bold text-white">Tvrtka uspješno kreirana!</h2>
          <p className="mt-2 text-white/60">Preusmjeravamo vas na dashboard...</p>
          <div className="mt-6 flex items-center gap-2 text-cyan-400"><Sparkles className="h-5 w-5" /><span className="font-medium">Dobrodošli u FiskAI</span></div>
        </motion.div>
      </motion.div>
    )
  }

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-white">Pregled i potvrda</h1>
        <p className="mt-2 text-white/60">Provjerite podatke prije kreiranja tvrtke</p>
      </div>

      <AnimatePresence mode="wait">
        <motion.div className="space-y-4">
          <Section icon={<Building2 className="h-5 w-5" />} title="Tvrtka" onEdit={() => handleEdit(1)}>
            <Item label="Naziv" value={data.name} />
            <Item label="OIB" value={data.oib} />
            <Item label="Pravni oblik" value={LEGAL_LABELS[data.legalForm]} />
            <Item label="Adresa" value={`${data.address}, ${data.zipCode} ${data.city}`} />
          </Section>

          <Section icon={<Receipt className="h-5 w-5" />} title="Porezni status" onEdit={() => handleEdit(2)}>
            {isPausal ? (
              <>
                <Item label="Oporezivanje" value="Paušalno" />
                <Item label="Zaposlen drugdje" value={data.employedElsewhere ? "Da" : "Ne"} />
                <Item label="Očekivani prihod" value={INCOME_LABELS[data.expectedIncomeRange] || "-"} />
              </>
            ) : (
              <>
                <Item label="PDV obveznik" value={data.isVatPayer ? "Da" : "Ne"} />
                {data.isVatPayer && <Item label="PDV broj" value={`HR${data.oib}`} />}
              </>
            )}
            <Item label="Gotovinska plaćanja" value={data.acceptsCash ? "Da (fiskalizacija)" : "Ne"} />
          </Section>

          <Section icon={<Mail className="h-5 w-5" />} title="Kontakt" onEdit={() => handleEdit(3)}>
            <Item label="Email" value={data.email || "-"} />
            <Item label="Telefon" value={data.phone || "-"} />
            <Item label="IBAN" value={data.iban ? formatIban(data.iban) : "-"} />
          </Section>

          <Section icon={<Building2 className="h-5 w-5" />} title="Poslovni prostor" onEdit={() => handleEdit(3)}>
            <Item label="Naziv" value={data.premisesName} />
            <Item label="Oznaka" value={data.premisesCode} />
          </Section>

          {state === "error" && error && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-start gap-3 rounded-xl border border-red-400/30 bg-red-400/10 p-4">
              <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-400" />
              <div><p className="font-medium text-red-400">Greška</p><p className="mt-1 text-sm text-white/70">{error}</p></div>
            </motion.div>
          )}

          <div className="flex gap-3 pt-4">
            {onBack && (
              <motion.button type="button" onClick={onBack} disabled={state === "creating"} className="flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-6 py-4 font-medium text-white hover:bg-white/10 disabled:opacity-50" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <ChevronLeft className="h-5 w-5" />Natrag
              </motion.button>
            )}
            <motion.button type="button" onClick={handleCreate} disabled={state === "creating"} className={cn("flex flex-1 items-center justify-center gap-2 rounded-xl py-4 font-semibold text-white", state === "creating" ? "cursor-wait bg-cyan-500/50" : "bg-cyan-500 hover:bg-cyan-400")} whileHover={state !== "creating" ? { scale: 1.02 } : {}} whileTap={state !== "creating" ? { scale: 0.98 } : {}}>
              {state === "creating" ? <><Loader2 className="h-5 w-5 animate-spin" />Stvaram tvrtku...</> : <><Sparkles className="h-5 w-5" />Kreiraj tvrtku</>}
            </motion.button>
          </div>
        </motion.div>
      </AnimatePresence>
    </motion.div>
  )
}

function Section({ icon, title, onEdit, children }: { icon: React.ReactNode; title: string; onEdit: () => void; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2"><div className="text-cyan-400">{icon}</div><h3 className="font-semibold text-white">{title}</h3></div>
        <button type="button" onClick={onEdit} className="flex items-center gap-1 text-sm text-cyan-400 hover:text-cyan-300"><Edit2 className="h-4 w-4" />Uredi</button>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  )
}

function Item({ label, value }: { label: string; value: string }) {
  return <div className="flex items-center justify-between"><span className="text-sm text-white/60">{label}</span><span className="text-sm font-medium text-white">{value}</span></div>
}

export default Step4Review
