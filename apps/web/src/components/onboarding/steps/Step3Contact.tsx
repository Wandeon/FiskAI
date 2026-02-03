"use client"

import { useCallback, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  ChevronRight,
  ChevronLeft,
  Mail,
  Phone,
  CreditCard,
  Building,
  Info,
  Check,
  AlertCircle,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useOnboardingStore } from "@/lib/stores/onboarding-store"
import { validateCroatianIban, formatIban } from "@fiskai/shared"

interface StepProps {
  onNext: () => void
  onBack?: () => void
}

export function Step3Contact({ onNext, onBack }: StepProps) {
  const { data, updateData } = useOnboardingStore()
  const [ibanTouched, setIbanTouched] = useState(false)

  const handleInputChange = useCallback(
    (
      field: "email" | "phone" | "iban" | "premisesName" | "premisesCode",
      value: string
    ) => {
      if (field === "iban") {
        const cleaned = value.replace(/\s/g, "").toUpperCase()
        updateData({ [field]: cleaned })
      } else if (field === "premisesCode") {
        updateData({ [field]: value.replace(/[^a-zA-Z0-9]/g, "") })
      } else {
        updateData({ [field]: value })
      }
    },
    [updateData]
  )

  const isEmailValid = !data.email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)
  const isIbanValid = !data.iban || validateCroatianIban(data.iban)
  const isPremisesValid =
    data.premisesName.trim().length > 0 && data.premisesCode.trim().length > 0

  const isFormValid = isEmailValid && isIbanValid && isPremisesValid

  const inputClasses = cn(
    "w-full h-12 px-4 rounded-xl border bg-white/10 backdrop-blur-sm",
    "text-white placeholder:text-white/40",
    "focus:outline-none focus:ring-2 focus:ring-cyan-400/50 focus:border-cyan-400",
    "border-white/20"
  )

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-8"
    >
      {/* Header */}
      <div className="text-center">
        <h1 className="text-2xl font-bold text-white">Kontakt i plaćanje</h1>
        <p className="mt-2 text-white/60">
          Podaci za komunikaciju s kupcima i primanje uplata
        </p>
      </div>

      {/* Contact Section */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-white">Kontakt podaci</h2>

        {/* Email */}
        <div>
          <label className="mb-2 flex items-center gap-2 text-sm font-medium text-white">
            <Mail className="h-4 w-4 text-cyan-400" />
            Email adresa
          </label>
          <input
            type="email"
            value={data.email}
            onChange={(e) => handleInputChange("email", e.target.value)}
            placeholder="vasa.tvrtka@email.hr"
            className={cn(inputClasses, !isEmailValid && data.email && "border-red-400")}
          />
          {!isEmailValid && data.email && (
            <p className="mt-1 text-sm text-red-400">Neispravan email format</p>
          )}
          <p className="mt-1 text-xs text-white/40">
            Ova adresa će se prikazivati na računima
          </p>
        </div>

        {/* Phone */}
        <div>
          <label className="mb-2 flex items-center gap-2 text-sm font-medium text-white">
            <Phone className="h-4 w-4 text-white/60" />
            Telefon
            <span className="text-xs text-white/40">(opcionalno)</span>
          </label>
          <input
            type="tel"
            value={data.phone}
            onChange={(e) => handleInputChange("phone", e.target.value)}
            placeholder="+385 91 234 5678"
            className={inputClasses}
          />
        </div>
      </div>

      {/* Banking Section */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-white">Bankovni podaci</h2>

        {/* IBAN */}
        <div>
          <label className="mb-2 flex items-center gap-2 text-sm font-medium text-white">
            <CreditCard className="h-4 w-4 text-cyan-400" />
            IBAN
          </label>
          <div className="relative">
            <input
              type="text"
              value={data.iban ? formatIban(data.iban) : ""}
              onChange={(e) => handleInputChange("iban", e.target.value)}
              onBlur={() => setIbanTouched(true)}
              placeholder="HR12 3456 7890 1234 5678 9"
              className={cn(
                inputClasses,
                "pr-12",
                ibanTouched && !isIbanValid && data.iban && "border-red-400",
                ibanTouched && isIbanValid && data.iban && "border-green-400"
              )}
            />
            <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2">
              <AnimatePresence mode="wait">
                {ibanTouched && data.iban && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                  >
                    {isIbanValid ? (
                      <Check className="h-5 w-5 text-green-400" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-red-400" />
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
          {ibanTouched && !isIbanValid && data.iban && (
            <p className="mt-1 text-sm text-red-400">
              Neispravan IBAN format (HR + 19 znamenki)
            </p>
          )}
          <p className="mt-1 text-xs text-white/40">
            Na ovaj račun kupci mogu uplatiti
          </p>
        </div>
      </div>

      {/* Business Premises Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Building className="h-5 w-5 text-cyan-400" />
          <h2 className="text-lg font-semibold text-white">Poslovni prostor</h2>
        </div>

        {/* Info box */}
        <div className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/5 p-4">
          <Info className="mt-0.5 h-5 w-5 flex-shrink-0 text-cyan-400" />
          <p className="text-sm text-white/70">
            Oznaka poslovnog prostora koristi se za fiskalizaciju računa. Svaki poslovni
            prostor ima jedinstvenu oznaku.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Premises Name */}
          <div className="col-span-2 sm:col-span-1">
            <label className="mb-2 block text-sm font-medium text-white">
              Naziv poslovnice <span className="text-cyan-400">*</span>
            </label>
            <input
              type="text"
              value={data.premisesName}
              onChange={(e) => handleInputChange("premisesName", e.target.value)}
              placeholder="Glavna poslovnica"
              className={cn(
                inputClasses,
                !data.premisesName.trim() && "border-red-400/50"
              )}
            />
          </div>

          {/* Premises Code */}
          <div className="col-span-2 sm:col-span-1">
            <label className="mb-2 block text-sm font-medium text-white">
              Oznaka <span className="text-cyan-400">*</span>
            </label>
            <input
              type="text"
              value={data.premisesCode}
              onChange={(e) => handleInputChange("premisesCode", e.target.value)}
              placeholder="1"
              maxLength={10}
              className={cn(
                inputClasses,
                !data.premisesCode.trim() && "border-red-400/50"
              )}
            />
          </div>
        </div>

        <p className="text-xs text-white/40">
          Primjer: Ako imate jedan ured, koristite oznaku "1"
        </p>
      </div>

      {/* Navigation */}
      <div className="flex gap-3">
        {onBack && (
          <motion.button
            type="button"
            onClick={onBack}
            className="flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-6 py-4 font-medium text-white transition-all hover:bg-white/10"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <ChevronLeft className="h-5 w-5" />
            Natrag
          </motion.button>
        )}
        <motion.button
          type="button"
          onClick={onNext}
          disabled={!isFormValid}
          className={cn(
            "flex flex-1 items-center justify-center gap-2 rounded-xl py-4 font-semibold transition-all",
            isFormValid
              ? "bg-cyan-500 text-white hover:bg-cyan-400"
              : "cursor-not-allowed bg-white/10 text-white/40"
          )}
          whileHover={isFormValid ? { scale: 1.02 } : {}}
          whileTap={isFormValid ? { scale: 0.98 } : {}}
        >
          Dalje
          <ChevronRight className="h-5 w-5" />
        </motion.button>
      </div>
    </motion.div>
  )
}

export default Step3Contact
