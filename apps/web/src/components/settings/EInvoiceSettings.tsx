"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Loader2,
  AlertCircle,
  CheckCircle,
  Eye,
  EyeOff,
  Wifi,
  WifiOff,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { trpc } from "@/trpc/client"

interface EInvoiceSettingsProps {
  companyId: string
}

const PROVIDER_OPTIONS = [
  { value: "e-poslovanje", label: "e-Poslovanje" },
  { value: "mock", label: "Mock (za testiranje)" },
] as const

export function EInvoiceSettings({ companyId }: EInvoiceSettingsProps) {
  const [enabled, setEnabled] = useState(false)
  const [provider, setProvider] = useState<string>("e-poslovanje")
  const [apiKey, setApiKey] = useState("")
  const [showApiKey, setShowApiKey] = useState(false)
  const [hasExistingKey, setHasExistingKey] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [testResult, setTestResult] = useState<{
    success: boolean
    message: string
  } | null>(null)

  // Fetch current settings
  const { data: settings, isLoading } = trpc.eInvoice.getSettings.useQuery({
    companyId,
  })

  // Update settings mutation
  const updateSettings = trpc.eInvoice.updateSettings.useMutation({
    onSuccess: (data) => {
      setIsSaving(false)
      setSaveSuccess(true)
      setHasExistingKey(data.hasApiKey)
      setApiKey("") // Clear API key field after save
      setTimeout(() => setSaveSuccess(false), 3000)
    },
    onError: (err) => {
      setIsSaving(false)
      setError(err.message || "Greska pri spremanju postavki")
    },
  })

  // Test connection mutation
  const testConnection = trpc.eInvoice.testConnection.useMutation({
    onSuccess: (data) => {
      setIsTesting(false)
      setTestResult(data)
    },
    onError: (err) => {
      setIsTesting(false)
      setTestResult({
        success: false,
        message: err.message || "Greska pri testiranju veze",
      })
    },
  })

  // Initialize form with fetched settings
  useEffect(() => {
    if (settings) {
      setEnabled(settings.enabled)
      setProvider(settings.provider || "e-poslovanje")
      setHasExistingKey(settings.hasApiKey)
    }
  }, [settings])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSaveSuccess(false)
    setIsSaving(true)

    updateSettings.mutate({
      companyId,
      enabled,
      provider,
      apiKey: apiKey || undefined, // Only send if changed
    })
  }

  const handleTestConnection = () => {
    setTestResult(null)
    setIsTesting(true)
    testConnection.mutate({ companyId })
  }

  const inputClasses = cn(
    "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white",
    "placeholder:text-white/30",
    "focus:border-cyan-500/50 focus:outline-none focus:ring-2 focus:ring-cyan-500/20",
    "transition-colors"
  )

  const selectClasses = cn(
    "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white",
    "focus:border-cyan-500/50 focus:outline-none focus:ring-2 focus:ring-cyan-500/20",
    "transition-colors appearance-none cursor-pointer",
    "[&>option]:bg-slate-900 [&>option]:text-white"
  )

  const labelClasses = "block text-sm font-medium text-white/70 mb-2"

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
        <span className="ml-3 text-white/60">Ucitavanje postavki...</span>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Error Display */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4"
          >
            <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-400" />
            <p className="text-sm text-red-400">{error}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Success Message */}
      <AnimatePresence>
        {saveSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-3 rounded-xl border border-green-500/30 bg-green-500/10 p-4"
          >
            <CheckCircle className="h-5 w-5 flex-shrink-0 text-green-400" />
            <p className="text-sm text-green-400">Postavke uspjesno spremljene</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Enable/Disable Toggle */}
      <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-4">
        <div>
          <p className="font-medium text-white">Omoguci e-racune</p>
          <p className="text-sm text-white/50">
            Omogucite slanje e-racuna putem FINA-inog sustava
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          onClick={() => setEnabled(!enabled)}
          className={cn(
            "relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:ring-offset-2 focus:ring-offset-slate-900",
            enabled ? "bg-cyan-500" : "bg-white/20"
          )}
        >
          <span
            className={cn(
              "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
              enabled ? "translate-x-5" : "translate-x-0"
            )}
          />
        </button>
      </div>

      {/* Provider Selection */}
      <div>
        <label htmlFor="provider" className={labelClasses}>
          Davatelj usluge
        </label>
        <select
          id="provider"
          value={provider}
          onChange={(e) => setProvider(e.target.value)}
          className={selectClasses}
          disabled={!enabled}
        >
          {PROVIDER_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-white/40">
          Odaberite davatelja usluge za slanje e-racuna
        </p>
      </div>

      {/* API Key Input */}
      <div>
        <label htmlFor="apiKey" className={labelClasses}>
          API kljuc
          {hasExistingKey && (
            <span className="ml-2 text-xs text-green-400">(konfiguriran)</span>
          )}
        </label>
        <div className="relative">
          <input
            id="apiKey"
            type={showApiKey ? "text" : "password"}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={hasExistingKey ? "Unesite novi kljuc za promjenu" : "Unesite API kljuc"}
            className={cn(inputClasses, "pr-12")}
            disabled={!enabled}
          />
          <button
            type="button"
            onClick={() => setShowApiKey(!showApiKey)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/60 transition-colors"
            disabled={!enabled}
          >
            {showApiKey ? (
              <EyeOff className="h-5 w-5" />
            ) : (
              <Eye className="h-5 w-5" />
            )}
          </button>
        </div>
        <p className="mt-1 text-xs text-white/40">
          API kljuc za autentifikaciju s davateljem usluge
        </p>
      </div>

      {/* Test Connection */}
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={handleTestConnection}
          disabled={!enabled || !hasExistingKey || isTesting}
          className={cn(
            "flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all",
            enabled && hasExistingKey && !isTesting
              ? "bg-white/10 text-white hover:bg-white/20"
              : "cursor-not-allowed bg-white/5 text-white/40"
          )}
        >
          {isTesting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Testiranje...
            </>
          ) : (
            <>
              <Wifi className="h-4 w-4" />
              Test veze
            </>
          )}
        </button>

        {/* Test Result */}
        <AnimatePresence>
          {testResult && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className={cn(
                "flex items-center gap-2 text-sm",
                testResult.success ? "text-green-400" : "text-red-400"
              )}
            >
              {testResult.success ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <WifiOff className="h-4 w-4" />
              )}
              <span>{testResult.success ? "Povezano" : "Nije povezano"}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Test Result Message */}
      <AnimatePresence>
        {testResult && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className={cn(
              "overflow-hidden rounded-xl border p-4",
              testResult.success
                ? "border-green-500/30 bg-green-500/10"
                : "border-red-500/30 bg-red-500/10"
            )}
          >
            <p
              className={cn(
                "text-sm",
                testResult.success ? "text-green-400" : "text-red-400"
              )}
            >
              {testResult.message}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Submit Button */}
      <div className="pt-4">
        <button
          type="submit"
          disabled={isSaving}
          className={cn(
            "flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3 font-semibold transition-all",
            isSaving
              ? "cursor-not-allowed bg-white/10 text-white/40"
              : "bg-cyan-500 text-white hover:bg-cyan-400"
          )}
        >
          {isSaving ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Spremanje...
            </>
          ) : (
            "Spremi"
          )}
        </button>
      </div>
    </form>
  )
}

export default EInvoiceSettings
