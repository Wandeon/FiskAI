"use client"

import { useState, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Search, Check, ChevronRight, Loader2, Building2, MapPin, UserCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { trpc } from "@/trpc/client"

interface Buyer {
  id: string
  name: string
  oib: string | null
  city: string | null
  address: string | null
}

interface BuyerStepData {
  buyerId: string | null
  issueDate: string
  dueDate: string
  buyerReference: string
}

interface BuyerStepProps {
  companyId: string
  data: BuyerStepData
  onDataChange: (data: Partial<BuyerStepData>) => void
  onNext: () => void
}

export function BuyerStep({ companyId, data, onDataChange, onNext }: BuyerStepProps) {
  const [searchQuery, setSearchQuery] = useState("")

  // Fetch buyers via tRPC
  const { data: buyers, isLoading } = trpc.eInvoice.getBuyers.useQuery({
    companyId,
    search: searchQuery || undefined,
  })

  // Find selected buyer for display
  const selectedBuyer = useMemo(() => {
    if (!data.buyerId || !buyers) return null
    return buyers.find((b: Buyer) => b.id === data.buyerId) || null
  }, [data.buyerId, buyers])

  // Check if form is valid
  const isFormValid = data.buyerId && data.issueDate

  const handleBuyerSelect = (buyerId: string) => {
    onDataChange({ buyerId: data.buyerId === buyerId ? null : buyerId })
  }

  const inputClasses = cn(
    "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white",
    "placeholder:text-white/30",
    "focus:border-cyan-500/50 focus:outline-none focus:ring-2 focus:ring-cyan-500/20",
    "transition-colors"
  )

  const labelClasses = "block text-sm font-medium text-white/70 mb-2"

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="text-center">
        <h1 className="text-2xl font-bold text-white">Odaberite kupca</h1>
        <p className="mt-2 text-white/60">Odaberite kupca i unesite podatke o racunu</p>
      </div>

      {/* Search & Buyer Selection */}
      <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">
          Kupac <span className="text-cyan-400">*</span>
        </h2>

        {/* Search Input */}
        <div className="relative mb-4">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/40" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Pretrazite kupce po nazivu, OIB-u..."
            className={cn(inputClasses, "pl-12")}
          />
        </div>

        {/* Selected Buyer Display */}
        <AnimatePresence>
          {selectedBuyer && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-4 overflow-hidden"
            >
              <div className="flex items-center gap-3 rounded-xl border border-cyan-500/50 bg-cyan-500/10 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-cyan-500/20">
                  <Check className="h-5 w-5 text-cyan-400" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-white">{selectedBuyer.name}</p>
                  <p className="text-sm text-white/60">
                    {selectedBuyer.oib && `OIB: ${selectedBuyer.oib}`}
                    {selectedBuyer.oib && selectedBuyer.city && " | "}
                    {selectedBuyer.city}
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Buyers List */}
        <div className="max-h-64 overflow-y-auto space-y-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-cyan-400" />
              <span className="ml-2 text-white/60">Ucitavanje kupaca...</span>
            </div>
          ) : buyers && buyers.length > 0 ? (
            buyers.map((buyer: Buyer) => {
              const isSelected = data.buyerId === buyer.id
              return (
                <motion.button
                  key={buyer.id}
                  type="button"
                  onClick={() => handleBuyerSelect(buyer.id)}
                  className={cn(
                    "w-full flex items-center gap-4 rounded-xl border p-4 text-left transition-all",
                    isSelected
                      ? "border-cyan-500/50 bg-cyan-500/10"
                      : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10"
                  )}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                >
                  <div
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-full",
                      isSelected ? "bg-cyan-500/20" : "bg-white/10"
                    )}
                  >
                    {isSelected ? (
                      <Check className="h-5 w-5 text-cyan-400" />
                    ) : (
                      <UserCircle className="h-5 w-5 text-white/40" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className={cn(
                        "font-medium truncate",
                        isSelected ? "text-cyan-400" : "text-white"
                      )}
                    >
                      {buyer.name}
                    </p>
                    <div className="flex items-center gap-3 text-sm text-white/60">
                      {buyer.oib && (
                        <span className="flex items-center gap-1">
                          <Building2 className="h-3 w-3" />
                          {buyer.oib}
                        </span>
                      )}
                      {buyer.city && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {buyer.city}
                        </span>
                      )}
                    </div>
                  </div>
                </motion.button>
              )
            })
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <UserCircle className="h-12 w-12 text-white/20 mb-3" />
              <p className="text-white/60">
                {searchQuery ? "Nema rezultata pretrage" : "Nemate kupaca"}
              </p>
              <p className="text-sm text-white/40 mt-1">
                {searchQuery
                  ? "Pokusajte s drugim pojmom"
                  : "Dodajte kupca u Kontakti"}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Invoice Details */}
      <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Podaci o racunu</h2>

        <div className="grid gap-4 sm:grid-cols-2">
          {/* Issue Date */}
          <div>
            <label htmlFor="issueDate" className={labelClasses}>
              Datum izdavanja <span className="text-cyan-400">*</span>
            </label>
            <input
              id="issueDate"
              type="date"
              value={data.issueDate}
              onChange={(e) => onDataChange({ issueDate: e.target.value })}
              className={inputClasses}
            />
          </div>

          {/* Due Date */}
          <div>
            <label htmlFor="dueDate" className={labelClasses}>
              Datum dospijeca
            </label>
            <input
              id="dueDate"
              type="date"
              value={data.dueDate}
              onChange={(e) => onDataChange({ dueDate: e.target.value })}
              min={data.issueDate}
              className={inputClasses}
            />
          </div>
        </div>

        {/* Buyer Reference */}
        <div className="mt-4">
          <label htmlFor="buyerReference" className={labelClasses}>
            Referenca kupca
          </label>
          <input
            id="buyerReference"
            type="text"
            value={data.buyerReference}
            onChange={(e) => onDataChange({ buyerReference: e.target.value })}
            placeholder="Npr. broj narudzbe, ugovor..."
            maxLength={100}
            className={inputClasses}
          />
          <p className="mt-1 text-xs text-white/40">
            Opcionalno - referenca ili broj dokumenta kupca
          </p>
        </div>
      </div>

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

export default BuyerStep
