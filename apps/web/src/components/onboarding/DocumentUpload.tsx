"use client"

import { useCallback, useRef, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { FileText, Upload, X, Loader2, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"

export interface ExtractedData {
  oib?: string
  name?: string
  address?: string
  city?: string
  postalCode?: string
  foundingDate?: string
  documentType: "obrtnica" | "sudsko_rjesenje" | "unknown"
}

interface DocumentUploadProps {
  onExtracted: (data: ExtractedData) => void
  onError?: (error: string) => void
  className?: string
}

type UploadState = "idle" | "dragging" | "processing" | "success"

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"]
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const PROCESSING_MSGS = ["Ucitavam dokument...", "Analiziram sadrzaj...", "Podaci prepoznati!"]

export function DocumentUpload({ onExtracted, onError, className }: DocumentUploadProps) {
  const [state, setState] = useState<UploadState>("idle")
  const [step, setStep] = useState(0)
  const [file, setFile] = useState<File | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const validateFile = (f: File): string | null => {
    if (!ACCEPTED_TYPES.includes(f.type)) return "Nepodrzani format. Koristite JPG, PNG ili WebP."
    if (f.size > MAX_FILE_SIZE) return "Datoteka je prevelika. Maksimalna velicina je 10MB."
    return null
  }

  const processFile = useCallback(async (f: File) => {
    setState("processing")
    setStep(0)
    setFile(f)

    const interval = setInterval(() => setStep((p) => Math.min(p + 1, PROCESSING_MSGS.length - 1)), 800)

    try {
      const formData = new FormData()
      formData.append("file", f)
      const res = await fetch("/api/ocr/document", { method: "POST", body: formData })
      const result = await res.json()
      clearInterval(interval)

      if (result.success && result.data) {
        setStep(PROCESSING_MSGS.length - 1)
        setState("success")
        onExtracted(result.data)
      } else {
        setState("idle")
        setFile(null)
        onError?.(result.error || "Greska pri obradi dokumenta")
      }
    } catch {
      clearInterval(interval)
      setState("idle")
      setFile(null)
      onError?.("Greska pri komunikaciji sa serverom")
    }
  }, [onExtracted, onError])

  const handleFile = useCallback((f: File | undefined) => {
    if (!f) return
    const err = validateFile(f)
    if (err) { onError?.(err); return }
    processFile(f)
  }, [processFile, onError])

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (state === "idle") setState("dragging")
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (state === "dragging") setState("idle")
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setState("idle")
    handleFile(e.dataTransfer.files[0])
  }

  const handleClear = () => {
    setState("idle")
    setFile(null)
    setStep(0)
    if (inputRef.current) inputRef.current.value = ""
  }

  const isDragging = state === "dragging"
  const isIdle = state === "idle" || isDragging

  return (
    <div className={cn("w-full", className)}>
      <div className="mb-4 text-center">
        <div className="mb-2 inline-flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-cyan-400" />
          <span className="text-sm font-medium text-cyan-400">AI prepoznavanje</span>
        </div>
        <h3 className="text-lg font-semibold text-white">Ucitaj Obrtnicu ili Sudsko rjesenje</h3>
        <p className="mt-1 text-sm text-white/60">Automatski cemo prepoznati vase podatke</p>
      </div>

      <motion.div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => state === "idle" && inputRef.current?.click()}
        className={cn(
          "relative cursor-pointer overflow-hidden rounded-2xl border-2 border-dashed transition-colors",
          state === "idle" && "border-white/20 hover:border-cyan-500/50",
          isDragging && "border-cyan-500 bg-cyan-500/10",
          state === "processing" && "cursor-default border-cyan-500/50",
          state === "success" && "cursor-default border-emerald-500/50"
        )}
      >
        <div className="absolute inset-0 bg-white/5 backdrop-blur-sm" />

        <div className="relative z-10 flex min-h-[200px] flex-col items-center justify-center p-8">
          <AnimatePresence mode="wait">
            {isIdle && (
              <motion.div
                key="idle"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex flex-col items-center"
              >
                <motion.div
                  className={cn("mb-4 rounded-2xl p-4 transition-colors", isDragging ? "bg-cyan-500/20" : "bg-white/10")}
                  animate={{ scale: isDragging ? 1.1 : 1 }}
                >
                  <Upload className={cn("h-8 w-8 transition-colors", isDragging ? "text-cyan-400" : "text-white/60")} />
                </motion.div>
                <p className="text-center text-sm text-white/80">Povuci ovdje ili odaberi datoteku</p>
                <p className="mt-1 text-xs text-white/40">JPG, PNG, WebP (max 10MB)</p>
              </motion.div>
            )}

            {state === "processing" && (
              <motion.div
                key="processing"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex flex-col items-center"
              >
                <motion.div
                  className="mb-4 rounded-2xl bg-cyan-500/20 p-4"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                >
                  <Loader2 className="h-8 w-8 text-cyan-400" />
                </motion.div>
                <AnimatePresence mode="wait">
                  <motion.p
                    key={step}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className="text-center text-sm font-medium text-cyan-400"
                  >
                    {PROCESSING_MSGS[step]}
                  </motion.p>
                </AnimatePresence>
                {file && <p className="mt-2 text-xs text-white/40">{file.name}</p>}
              </motion.div>
            )}

            {state === "success" && file && (
              <motion.div
                key="success"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex w-full flex-col items-center"
              >
                <div className="mb-4 rounded-2xl bg-emerald-500/20 p-4">
                  <FileText className="h-8 w-8 text-emerald-400" />
                </div>
                <p className="text-center text-sm font-medium text-emerald-400">Podaci uspjesno prepoznati!</p>
                <p className="mt-1 max-w-full truncate text-xs text-white/60">{file.name}</p>
                <motion.button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); handleClear() }}
                  className="mt-4 inline-flex items-center gap-1 rounded-lg bg-white/10 px-3 py-1.5 text-xs text-white/80 transition-colors hover:bg-white/20"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <X className="h-3 w-3" />
                  Ukloni
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {isDragging && (
          <motion.div
            className="pointer-events-none absolute inset-0 bg-gradient-to-t from-cyan-500/20 to-transparent"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
        )}
      </motion.div>

      <input
        ref={inputRef}
        type="file"
        accept=".jpg,.jpeg,.png,.webp"
        onChange={(e) => handleFile(e.target.files?.[0])}
        className="hidden"
        aria-label="Odaberi dokument"
      />
    </div>
  )
}

export default DocumentUpload
