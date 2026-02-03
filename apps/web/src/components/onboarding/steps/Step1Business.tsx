"use client"

import { useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Building2, Store, Briefcase, FileText, ChevronRight, Info } from "lucide-react"
import { cn } from "@/lib/utils"
import { useOnboardingStore, type LegalForm, type DataSource } from "@/lib/stores/onboarding-store"
import { OibInput, type OibLookupData } from "../OibInput"
import { DocumentUpload, type ExtractedData } from "../DocumentUpload"

interface StepProps {
  onNext: () => void
  onBack?: () => void
}

interface LegalFormOption {
  value: LegalForm
  name: string
  description: string
  icon: React.ReactNode
}

const LEGAL_FORMS: LegalFormOption[] = [
  {
    value: "OBRT_PAUSAL",
    name: "Paušalni obrt",
    description: "Jednostavno oporezivanje do 300.000 kn",
    icon: <Store className="h-6 w-6" />,
  },
  {
    value: "OBRT_REAL",
    name: "Obrt",
    description: "Stvarni prihod i rashod",
    icon: <Briefcase className="h-6 w-6" />,
  },
  {
    value: "DOO",
    name: "d.o.o.",
    description: "Društvo s ograničenom odgovornošću",
    icon: <Building2 className="h-6 w-6" />,
  },
  {
    value: "JDOO",
    name: "j.d.o.o.",
    description: "Jednostavno društvo s ograničenom odgovornošću",
    icon: <FileText className="h-6 w-6" />,
  },
]

export function Step1Business({ onNext }: StepProps) {
  const { data, updateData } = useOnboardingStore()

  const handleLegalFormSelect = useCallback(
    (form: LegalForm) => {
      updateData({ legalForm: form })
    },
    [updateData]
  )

  const handleOibChange = useCallback(
    (oib: string) => {
      updateData({ oib })
    },
    [updateData]
  )

  const handleOibLookup = useCallback(
    (lookupData: OibLookupData) => {
      const source: DataSource =
        lookupData.source === "vies" ? "VIES" : "SUDSKI_REGISTAR"
      updateData({
        name: lookupData.name || data.name,
        address: lookupData.address || data.address,
        city: lookupData.city || data.city,
        zipCode: lookupData.postalCode || data.zipCode,
        dataSource: source,
      })
    },
    [updateData, data]
  )

  const handleDocumentExtracted = useCallback(
    (extracted: ExtractedData) => {
      const source: DataSource =
        extracted.documentType === "obrtnica" ? "OCR_OBRTNICA" : "OCR_SUDSKO"
      updateData({
        oib: extracted.oib || data.oib,
        name: extracted.name || data.name,
        address: extracted.address || data.address,
        city: extracted.city || data.city,
        zipCode: extracted.postalCode || data.zipCode,
        dataSource: source,
      })
    },
    [updateData, data]
  )

  const handleInputChange = useCallback(
    (field: "name" | "address" | "city" | "zipCode", value: string) => {
      updateData({ [field]: value, dataSource: "MANUAL" })
    },
    [updateData]
  )

  const isFormValid =
    data.oib.length === 11 &&
    data.name.trim().length >= 2 &&
    data.address.trim().length >= 3 &&
    data.city.trim().length >= 2 &&
    /^\d{5}$/.test(data.zipCode)

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
        <h1 className="text-2xl font-bold text-white">Vaša tvrtka</h1>
        <p className="mt-2 text-white/60">Unesite osnovne podatke o tvrtki</p>
      </div>

      {/* Document Upload Section */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <DocumentUpload onExtracted={handleDocumentExtracted} />
      </div>

      {/* Legal Form Selector */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-white">Pravni oblik</h2>
        <div className="grid grid-cols-2 gap-3">
          {LEGAL_FORMS.map((form) => (
            <motion.button
              key={form.value}
              type="button"
              onClick={() => handleLegalFormSelect(form.value)}
              className={cn(
                "relative flex flex-col items-center rounded-xl border-2 p-4 text-center transition-all",
                "bg-white/5 backdrop-blur-sm",
                data.legalForm === form.value
                  ? "border-cyan-400 bg-cyan-400/10"
                  : "border-white/20 hover:border-white/40"
              )}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div
                className={cn(
                  "mb-2 rounded-lg p-2",
                  data.legalForm === form.value
                    ? "bg-cyan-400/20 text-cyan-400"
                    : "bg-white/10 text-white/60"
                )}
              >
                {form.icon}
              </div>
              <span
                className={cn(
                  "font-medium",
                  data.legalForm === form.value ? "text-cyan-400" : "text-white"
                )}
              >
                {form.name}
              </span>
              <span className="mt-1 text-xs text-white/50">{form.description}</span>
            </motion.button>
          ))}
        </div>
      </div>

      {/* OIB Input */}
      <div>
        <label className="mb-2 block text-sm font-medium text-white">
          OIB <span className="text-cyan-400">*</span>
        </label>
        <OibInput
          value={data.oib}
          onChange={handleOibChange}
          onLookupSuccess={handleOibLookup}
        />
        <p className="mt-2 flex items-center gap-1 text-xs text-white/40">
          <Info className="h-3 w-3" />
          OIB će se automatski provjeriti i dohvatiti podatke
        </p>
      </div>

      {/* Business Details */}
      <AnimatePresence mode="wait">
        {data.oib.length === 11 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-4 overflow-hidden"
          >
            <div>
              <label className="mb-2 block text-sm font-medium text-white">
                Naziv tvrtke <span className="text-cyan-400">*</span>
              </label>
              <input
                type="text"
                value={data.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                placeholder="Naziv tvrtke ili obrta"
                className={inputClasses}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-white">
                Adresa <span className="text-cyan-400">*</span>
              </label>
              <input
                type="text"
                value={data.address}
                onChange={(e) => handleInputChange("address", e.target.value)}
                placeholder="Ulica i kućni broj"
                className={inputClasses}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-white">
                  Grad <span className="text-cyan-400">*</span>
                </label>
                <input
                  type="text"
                  value={data.city}
                  onChange={(e) => handleInputChange("city", e.target.value)}
                  placeholder="Grad"
                  className={inputClasses}
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-white">
                  Poštanski broj <span className="text-cyan-400">*</span>
                </label>
                <input
                  type="text"
                  value={data.zipCode}
                  onChange={(e) =>
                    handleInputChange(
                      "zipCode",
                      e.target.value.replace(/\D/g, "").slice(0, 5)
                    )
                  }
                  placeholder="10000"
                  inputMode="numeric"
                  className={inputClasses}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Next Button */}
      <motion.button
        type="button"
        onClick={onNext}
        disabled={!isFormValid}
        className={cn(
          "flex w-full items-center justify-center gap-2 rounded-xl py-4 font-semibold transition-all",
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
    </motion.div>
  )
}

export default Step1Business
