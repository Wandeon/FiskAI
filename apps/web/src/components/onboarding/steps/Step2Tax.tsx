"use client"

import { useCallback } from "react"
import { motion } from "framer-motion"
import { ChevronRight, ChevronLeft, Info, Banknote, Calculator, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { useOnboardingStore, type OnboardingData } from "@/lib/stores/onboarding-store"

interface StepProps {
  onNext: () => void
  onBack?: () => void
}

const INCOME_RANGES = [
  { value: "under30", label: "Do 30.000 EUR", description: "Bez PDV obveze" },
  { value: "30to60", label: "30.000 - 60.000 EUR", description: "Bez PDV obveze" },
  { value: "60to100", label: "60.000 - 100.000 EUR", description: "Moguć ulazak u PDV" },
  { value: "over100", label: "Preko 100.000 EUR", description: "Razmotrite obrt" },
] as const

export function Step2Tax({ onNext, onBack }: StepProps) {
  const { data, updateData } = useOnboardingStore()
  const isPausal = data.legalForm === "OBRT_PAUSAL"

  const handleToggle = useCallback(
    (field: "isVatPayer" | "acceptsCash" | "employedElsewhere", value: boolean) => {
      updateData({ [field]: value })
      if (field === "isVatPayer" && value && data.oib) updateData({ vatNumber: `HR${data.oib}` })
    },
    [updateData, data.oib]
  )

  const handleIncomeChange = useCallback(
    (value: OnboardingData["expectedIncomeRange"]) => updateData({ expectedIncomeRange: value }),
    [updateData]
  )

  const isFormValid = isPausal ? data.expectedIncomeRange !== "" : true

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-white">Porezni status</h1>
        <p className="mt-2 text-white/60">Postavite porezne parametre za vašu tvrtku</p>
      </div>

      {isPausal ? (
        <div className="space-y-6">
          <InfoBox icon={<Info />} title="Paušalno oporezivanje" color="cyan">
            Kao paušalni obrtnik niste u sustavu PDV-a i plaćate paušalni porez prema razredu prihoda.
          </InfoBox>

          <Section title="Jeste li zaposleni negdje drugdje?">
            <div className="grid grid-cols-2 gap-3">
              <ToggleCard selected={data.employedElsewhere} onClick={() => handleToggle("employedElsewhere", true)} label="Da, zaposlen/a sam" description="Manja osnovica doprinosa" />
              <ToggleCard selected={!data.employedElsewhere} onClick={() => handleToggle("employedElsewhere", false)} label="Ne" description="Puna osnovica doprinosa" />
            </div>
          </Section>

          <Section title="Očekivani godišnji prihod?">
            <div className="space-y-3">
              {INCOME_RANGES.map((range) => (
                <RadioOption key={range.value} selected={data.expectedIncomeRange === range.value} onClick={() => handleIncomeChange(range.value)} label={range.label} description={range.description} />
              ))}
            </div>
          </Section>

          <CashSection data={data} handleToggle={handleToggle} />
        </div>
      ) : (
        <div className="space-y-6">
          <Section title="Jeste li u sustavu PDV-a?">
            <div className="grid grid-cols-2 gap-3">
              <ToggleCard selected={data.isVatPayer} onClick={() => handleToggle("isVatPayer", true)} label="Da, u PDV-u sam" description="Obračunavam i prijavljujem PDV" />
              <ToggleCard selected={!data.isVatPayer} onClick={() => handleToggle("isVatPayer", false)} label="Ne" description="Oslobođen/a PDV-a" />
            </div>
          </Section>

          {data.isVatPayer && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="overflow-hidden">
              <label className="mb-2 block text-sm font-medium text-white">PDV broj (VAT ID)</label>
              <div className="flex h-12 items-center rounded-xl border border-white/20 bg-white/5 px-4">
                <span className="text-cyan-400">HR</span><span className="ml-1 text-white">{data.oib}</span>
              </div>
              <p className="mt-2 text-xs text-white/40">PDV broj se automatski generira iz vašeg OIB-a</p>
            </motion.div>
          )}

          <CashSection data={data} handleToggle={handleToggle} />

          {data.acceptsCash && (
            <InfoBox icon={<AlertCircle />} title="Fiskalizacija računa" color="amber">
              Za gotovinska plaćanja potrebno je fiskalizirati račune prema Zakonu o fiskalizaciji. FiskAI automatski fiskalizira vaše račune.
            </InfoBox>
          )}
        </div>
      )}

      <div className="flex gap-3">
        {onBack && (
          <motion.button type="button" onClick={onBack} className="flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-6 py-4 font-medium text-white hover:bg-white/10" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <ChevronLeft className="h-5 w-5" />Natrag
          </motion.button>
        )}
        <motion.button type="button" onClick={onNext} disabled={!isFormValid} className={cn("flex flex-1 items-center justify-center gap-2 rounded-xl py-4 font-semibold", isFormValid ? "bg-cyan-500 text-white hover:bg-cyan-400" : "cursor-not-allowed bg-white/10 text-white/40")} whileHover={isFormValid ? { scale: 1.02 } : {}} whileTap={isFormValid ? { scale: 0.98 } : {}}>
          Dalje<ChevronRight className="h-5 w-5" />
        </motion.button>
      </div>
    </motion.div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <div><h2 className="mb-4 text-lg font-semibold text-white">{title}</h2>{children}</div>
}

function InfoBox({ icon, title, color, children }: { icon: React.ReactNode; title: string; color: "cyan" | "amber"; children: React.ReactNode }) {
  const colors = { cyan: "border-cyan-400/30 bg-cyan-400/10 text-cyan-400", amber: "border-amber-400/30 bg-amber-400/10 text-amber-400" }
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={cn("flex items-start gap-3 rounded-xl border p-4", colors[color])}>
      <div className="mt-0.5 h-5 w-5 flex-shrink-0">{icon}</div>
      <div><p className="font-medium">{title}</p><p className="mt-1 text-sm text-white/70">{children}</p></div>
    </motion.div>
  )
}

function CashSection({ data, handleToggle }: { data: OnboardingData; handleToggle: (f: "acceptsCash", v: boolean) => void }) {
  return (
    <Section title="Primate li gotovinska plaćanja?">
      <div className="grid grid-cols-2 gap-3">
        <ToggleCard selected={data.acceptsCash} onClick={() => handleToggle("acceptsCash", true)} label="Da" description="Trebat će vam fiskalizacija" icon={<Banknote className="h-5 w-5" />} />
        <ToggleCard selected={!data.acceptsCash} onClick={() => handleToggle("acceptsCash", false)} label="Ne, samo računi" description="Bez fiskalizacije" icon={<Calculator className="h-5 w-5" />} />
      </div>
    </Section>
  )
}

function ToggleCard({ selected, onClick, label, description, icon }: { selected: boolean; onClick: () => void; label: string; description: string; icon?: React.ReactNode }) {
  return (
    <motion.button type="button" onClick={onClick} className={cn("flex flex-col items-center rounded-xl border-2 p-4 text-center bg-white/5 backdrop-blur-sm", selected ? "border-cyan-400 bg-cyan-400/10" : "border-white/20 hover:border-white/40")} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
      {icon && <div className={cn("mb-2 rounded-lg p-2", selected ? "bg-cyan-400/20 text-cyan-400" : "bg-white/10 text-white/60")}>{icon}</div>}
      <span className={cn("font-medium", selected ? "text-cyan-400" : "text-white")}>{label}</span>
      <span className="mt-1 text-xs text-white/50">{description}</span>
    </motion.button>
  )
}

function RadioOption({ selected, onClick, label, description }: { selected: boolean; onClick: () => void; label: string; description: string }) {
  return (
    <motion.button type="button" onClick={onClick} className={cn("flex w-full items-center justify-between rounded-xl border-2 p-4 text-left bg-white/5 backdrop-blur-sm", selected ? "border-cyan-400 bg-cyan-400/10" : "border-white/20 hover:border-white/40")} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
      <div><span className={cn("font-medium", selected ? "text-cyan-400" : "text-white")}>{label}</span><p className="mt-0.5 text-sm text-white/50">{description}</p></div>
      <div className={cn("h-5 w-5 rounded-full border-2", selected ? "border-cyan-400 bg-cyan-400" : "border-white/40")} />
    </motion.button>
  )
}

export default Step2Tax
