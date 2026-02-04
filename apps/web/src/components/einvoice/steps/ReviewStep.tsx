"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { ChevronLeft, Send, Save, Loader2, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { trpc } from "@/trpc/client"
import { InvoicePreview } from "../InvoicePreview"
import type { EInvoiceLineInput } from "@fiskai/shared"

interface ReviewStepData {
  buyerId: string
  issueDate: string
  dueDate: string
  buyerReference: string
  lines: EInvoiceLineInput[]
  notes: string
}

interface ReviewStepProps {
  companyId: string
  data: ReviewStepData
  onDataChange: (updates: Partial<ReviewStepData>) => void
  onBack: () => void
}

export function ReviewStep({ companyId, data, onDataChange, onBack }: ReviewStepProps) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  // Fetch company info (seller)
  const { data: company, isLoading: isLoadingCompany } = trpc.eInvoice.getCompanyInfo.useQuery({
    companyId,
  })

  // Fetch buyer info
  const { data: buyer, isLoading: isLoadingBuyer } = trpc.eInvoice.getBuyerById.useQuery(
    {
      companyId,
      contactId: data.buyerId,
    },
    {
      enabled: !!data.buyerId,
    }
  )

  // Mutations
  const createDraft = trpc.eInvoice.createDraft.useMutation()
  const sendInvoice = trpc.eInvoice.send.useMutation()

  const isLoading = isLoadingCompany || isLoadingBuyer
  const isSaving = createDraft.isPending
  const isSending = createDraft.isPending || sendInvoice.isPending

  // Get default business premises and payment device
  const defaultPremises = company?.businessPremises?.[0]
  const defaultDevice = defaultPremises?.paymentDevices?.[0]

  const canSubmit = !isLoading && buyer && company && defaultPremises && defaultDevice

  const handleSaveDraft = async () => {
    if (!canSubmit) return

    setError(null)
    try {
      const invoice = await createDraft.mutateAsync({
        companyId,
        businessPremisesId: defaultPremises.id,
        paymentDeviceId: defaultDevice.id,
        contactId: data.buyerId,
        issueDate: new Date(data.issueDate),
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
        buyerReference: data.buyerReference || undefined,
        notes: data.notes || undefined,
        lines: data.lines,
      })

      router.push(`/invoices/${invoice.id}`)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Greska pri spremanju nacrta"
      setError(message)
    }
  }

  const handleSend = async () => {
    if (!canSubmit) return

    setError(null)
    try {
      // First create the draft
      const invoice = await createDraft.mutateAsync({
        companyId,
        businessPremisesId: defaultPremises.id,
        paymentDeviceId: defaultDevice.id,
        contactId: data.buyerId,
        issueDate: new Date(data.issueDate),
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
        buyerReference: data.buyerReference || undefined,
        notes: data.notes || undefined,
        lines: data.lines,
      })

      // Then send it
      await sendInvoice.mutateAsync({ id: invoice.id })

      router.push("/invoices")
    } catch (err) {
      const message = err instanceof Error ? err.message : "Greska pri slanju racuna"
      setError(message)
    }
  }

  const inputClasses = cn(
    "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white",
    "placeholder:text-white/30",
    "focus:border-cyan-500/50 focus:outline-none focus:ring-2 focus:ring-cyan-500/20",
    "transition-colors resize-none"
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
        <h1 className="text-2xl font-bold text-white">Pregled racuna</h1>
        <p className="mt-2 text-white/60">Pregledajte i posaljite racun</p>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-12">
          <div className="flex flex-col items-center justify-center text-center">
            <Loader2 className="h-8 w-8 animate-spin text-cyan-400 mb-4" />
            <p className="text-white/60">Ucitavanje podataka...</p>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="flex items-center gap-3 rounded-xl bg-red-500/10 border border-red-500/20 p-4 text-red-400">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {/* Missing Configuration Warning */}
      {!isLoading && (!defaultPremises || !defaultDevice) && (
        <div className="flex items-start gap-3 rounded-xl bg-amber-500/10 border border-amber-500/20 p-4 text-amber-400">
          <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Nedostaje konfiguracija</p>
            <p className="text-sm mt-1 text-amber-400/80">
              {!defaultPremises
                ? "Morate dodati poslovni prostor prije kreiranja racuna."
                : "Morate dodati naplatni uredaj prije kreiranja racuna."}
            </p>
          </div>
        </div>
      )}

      {/* Invoice Preview */}
      {!isLoading && company && buyer && (
        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-6">
          <InvoicePreview
            seller={{
              name: company.name,
              oib: company.oib,
              address: company.address,
              city: company.city,
              zipCode: company.zipCode,
            }}
            buyer={{
              name: buyer.name,
              oib: buyer.oib,
              address: buyer.address,
              city: buyer.city,
              zipCode: buyer.zipCode,
            }}
            lines={data.lines}
            issueDate={data.issueDate}
            dueDate={data.dueDate || undefined}
            buyerReference={data.buyerReference || undefined}
            notes={data.notes || undefined}
          />
        </div>
      )}

      {/* Notes Field */}
      <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-6">
        <label htmlFor="notes" className={labelClasses}>
          Napomene
        </label>
        <textarea
          id="notes"
          value={data.notes}
          onChange={(e) => onDataChange({ notes: e.target.value })}
          placeholder="Dodatne napomene za racun (opcionalno)..."
          maxLength={500}
          rows={3}
          className={inputClasses}
        />
        <p className="mt-2 text-xs text-white/40 text-right">
          {data.notes.length}/500
        </p>
      </div>

      {/* Navigation Buttons */}
      <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
        <motion.button
          type="button"
          onClick={onBack}
          disabled={isSaving || isSending}
          className={cn(
            "flex items-center justify-center gap-2 rounded-xl py-4 font-semibold transition-all",
            "border border-white/10 bg-white/5 text-white hover:bg-white/10",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            "sm:flex-1"
          )}
          whileHover={{ scale: isSaving || isSending ? 1 : 1.02 }}
          whileTap={{ scale: isSaving || isSending ? 1 : 0.98 }}
        >
          <ChevronLeft className="h-5 w-5" />
          Natrag
        </motion.button>

        <motion.button
          type="button"
          onClick={handleSaveDraft}
          disabled={!canSubmit || isSaving || isSending}
          className={cn(
            "flex items-center justify-center gap-2 rounded-xl py-4 font-semibold transition-all",
            "border border-white/10 bg-white/10 text-white hover:bg-white/20",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            "sm:flex-1"
          )}
          whileHover={{ scale: !canSubmit || isSaving || isSending ? 1 : 1.02 }}
          whileTap={{ scale: !canSubmit || isSaving || isSending ? 1 : 0.98 }}
        >
          {isSaving && !sendInvoice.isPending ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Save className="h-5 w-5" />
          )}
          Spremi nacrt
        </motion.button>

        <motion.button
          type="button"
          onClick={handleSend}
          disabled={!canSubmit || isSaving || isSending}
          className={cn(
            "flex items-center justify-center gap-2 rounded-xl py-4 font-semibold transition-all",
            "bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40",
            "disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none",
            "sm:flex-1"
          )}
          whileHover={{ scale: !canSubmit || isSaving || isSending ? 1 : 1.02 }}
          whileTap={{ scale: !canSubmit || isSaving || isSending ? 1 : 0.98 }}
        >
          {isSending ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Send className="h-5 w-5" />
          )}
          Posalji e-racun
        </motion.button>
      </div>
    </motion.div>
  )
}

export default ReviewStep
