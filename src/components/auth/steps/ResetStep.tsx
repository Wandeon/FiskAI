"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { OTPInput } from "../OTPInput"

interface ResetStepProps {
  email: string
  onSubmit: (code: string, newPassword: string) => Promise<boolean>
  onVerify: (code: string) => Promise<boolean>
  onResend: () => Promise<void>
  onBack: () => void
  isLoading: boolean
  error: string | null
}

export function ResetStep({ email, onSubmit, onResend, onBack, isLoading, error }: ResetStepProps) {
  const [step, setStep] = useState<"code" | "password">("code")
  const [code, setCode] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [localError, setLocalError] = useState<string | null>(null)
  const [otpError, setOtpError] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  const [resending, setResending] = useState(false)

  // Cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [resendCooldown])

  // Show OTP error animation
  useEffect(() => {
    if (error && step === "code") {
      setOtpError(true)
      setTimeout(() => setOtpError(false), 300)
    }
  }, [error, step])

  const handleCodeComplete = (enteredCode: string) => {
    setCode(enteredCode)
    setStep("password")
  }

  const handleResend = async () => {
    if (resendCooldown > 0 || resending) return

    setResending(true)
    await onResend()
    setResending(false)
    setResendCooldown(60)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLocalError(null)

    if (password.length < 8) {
      setLocalError("Lozinka mora imati najmanje 8 znakova")
      return
    }

    if (password !== confirmPassword) {
      setLocalError("Lozinke se ne podudaraju")
      return
    }

    const success = await onSubmit(code, password)
    if (!success) {
      // If code was wrong, go back to code step
      if (error?.includes("kod")) {
        setStep("code")
        setCode("")
      }
    }
  }

  const displayError = localError || error

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-6"
    >
      <div className="text-center">
        <h1 className="text-2xl font-bold text-white">Resetirajte lozinku</h1>
        <p className="mt-2 text-white/70">
          {step === "code" ? "Unesite kod koji smo vam poslali na" : "Unesite novu lozinku"}
        </p>
        {step === "code" && (
          <motion.button
            type="button"
            onClick={onBack}
            className="mt-1 inline-flex items-center gap-1 text-cyan-400 hover:text-cyan-300 font-medium"
          >
            {email}
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
              />
            </svg>
          </motion.button>
        )}
      </div>

      {step === "code" ? (
        <>
          <OTPInput
            length={6}
            onComplete={handleCodeComplete}
            error={otpError}
            disabled={isLoading}
            autoFocus
          />

          <div className="text-center">
            <p className="text-sm text-white/50">
              Niste primili kod?{" "}
              {resendCooldown > 0 ? (
                <span className="text-white/40">Pošalji ponovno za {resendCooldown}s</span>
              ) : (
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resending}
                  className="text-cyan-400 hover:text-cyan-300 font-medium disabled:opacity-50"
                >
                  {resending ? "Šaljem..." : "Pošalji ponovno"}
                </button>
              )}
            </p>
          </div>
        </>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-white/80 mb-1.5">
              Nova lozinka
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Najmanje 8 znakova"
              className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-white placeholder:text-white/40 focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400/50 backdrop-blur-sm"
              disabled={isLoading}
              autoFocus
            />
          </div>

          <div>
            <label
              htmlFor="confirmPassword"
              className="block text-sm font-medium text-white/80 mb-1.5"
            >
              Potvrdite lozinku
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Ponovite lozinku"
              className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-white placeholder:text-white/40 focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400/50 backdrop-blur-sm"
              disabled={isLoading}
            />
          </div>

          <motion.button
            type="submit"
            disabled={isLoading || !password || !confirmPassword}
            className="w-full rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-600 py-3 font-semibold text-white shadow-lg shadow-cyan-500/25 transition-all hover:shadow-cyan-500/40 disabled:opacity-50 disabled:cursor-not-allowed"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {isLoading ? (
              <motion.div
                className="mx-auto h-5 w-5 border-2 border-white/30 border-t-white rounded-full"
                animate={{ rotate: 360 }}
                transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
              />
            ) : (
              "Spremi novu lozinku"
            )}
          </motion.button>

          <button
            type="button"
            onClick={() => {
              setStep("code")
              setCode("")
            }}
            className="w-full text-center text-sm text-white/60 hover:text-white/80"
          >
            Unesite drugi kod
          </button>
        </form>
      )}

      {displayError && (
        <motion.p
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center text-sm text-red-400"
        >
          {displayError}
        </motion.p>
      )}

      <button
        type="button"
        onClick={onBack}
        className="w-full text-center text-sm text-white/60 hover:text-white/80"
      >
        Natrag na prijavu
      </button>
    </motion.div>
  )
}
