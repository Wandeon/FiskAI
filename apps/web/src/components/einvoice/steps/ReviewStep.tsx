"use client"

import { motion } from "framer-motion"
import { FileCheck, ChevronLeft, Send } from "lucide-react"
import { cn } from "@/lib/utils"

interface ReviewStepProps {
  onSubmit: () => void
  onBack: () => void
}

export function ReviewStep({ onSubmit, onBack }: ReviewStepProps) {
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

      {/* Placeholder Content */}
      <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-12">
        <div className="flex flex-col items-center justify-center text-center">
          <div className="rounded-full bg-cyan-500/10 p-4 mb-4">
            <FileCheck className="h-8 w-8 text-cyan-400" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">
            Korak u izradi
          </h3>
          <p className="text-white/60 max-w-md">
            Review step - coming next
          </p>
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="flex gap-4">
        <motion.button
          type="button"
          onClick={onBack}
          className={cn(
            "flex flex-1 items-center justify-center gap-2 rounded-xl py-4 font-semibold transition-all",
            "border border-white/10 bg-white/5 text-white hover:bg-white/10"
          )}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <ChevronLeft className="h-5 w-5" />
          Natrag
        </motion.button>
        <motion.button
          type="button"
          onClick={onSubmit}
          className={cn(
            "flex flex-1 items-center justify-center gap-2 rounded-xl py-4 font-semibold transition-all",
            "bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40"
          )}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Send className="h-5 w-5" />
          Posalji racun
        </motion.button>
      </div>
    </motion.div>
  )
}

export default ReviewStep
