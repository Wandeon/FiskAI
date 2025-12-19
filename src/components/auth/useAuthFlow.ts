"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { signIn } from "next-auth/react"
import { AuthStep, AuthFlowState, UserInfo } from "./types"

const initialState: AuthFlowState = {
  step: "identify",
  email: "",
  name: "",
  isNewUser: false,
  hasPasskey: false,
  error: null,
  isLoading: false,
}

export function useAuthFlow() {
  const [state, setState] = useState<AuthFlowState>(initialState)
  const router = useRouter()

  const setStep = useCallback((step: AuthStep) => {
    setState((s) => ({ ...s, step, error: null }))
  }, [])

  const setError = useCallback((error: string | null) => {
    setState((s) => ({ ...s, error, isLoading: false }))
  }, [])

  const setLoading = useCallback((isLoading: boolean) => {
    setState((s) => ({ ...s, isLoading }))
  }, [])

  const checkEmail = useCallback(async (email: string) => {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch("/api/auth/check-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })

      const data: UserInfo = await res.json()

      if (!res.ok) {
        setError(data.error || "Greška pri provjeri emaila")
        return
      }

      setState((s) => ({
        ...s,
        email,
        isNewUser: !data.exists,
        hasPasskey: data.hasPasskey || false,
        name: data.name || "",
        step: data.exists ? "authenticate" : "register",
        isLoading: false,
        error: null,
      }))
    } catch (error) {
      setError("Greška pri povezivanju")
    }
  }, [setLoading, setError])

  const sendVerificationCode = useCallback(async (
    type: "EMAIL_VERIFY" | "LOGIN_VERIFY" | "PASSWORD_RESET",
    userId?: string
  ) => {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch("/api/auth/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: state.email,
          type,
          userId,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || "Greška pri slanju koda")
        return
      }

      setState((s) => ({ ...s, step: "verify", isLoading: false }))
    } catch (error) {
      setError("Greška pri slanju koda")
    }
  }, [state.email, setLoading, setError])

  const authenticate = useCallback(async (password: string) => {
    setLoading(true)
    setError(null)

    try {
      const result = await signIn("credentials", {
        email: state.email,
        password,
        redirect: false,
      })

      if (result?.error) {
        if (result.error === "email_not_verified") {
          // Send OTP and go to verify step
          await sendVerificationCode("LOGIN_VERIFY")
          return
        }
        setError("Neispravna lozinka")
        return
      }

      // Success - redirect based on role
      setState((s) => ({ ...s, step: "success", isLoading: false }))
      setTimeout(() => router.push("/dashboard"), 1500)
    } catch (error) {
      setError("Greška pri prijavi")
    }
  }, [state.email, router, setLoading, setError, sendVerificationCode])

  const register = useCallback(async (name: string, password: string) => {
    setLoading(true)
    setError(null)

    try {
      // Create user
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: state.email,
          name,
          password,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Greška pri registraciji")
        return
      }

      // Send verification code
      await sendVerificationCode("EMAIL_VERIFY", data.userId)
    } catch (error) {
      setError("Greška pri registraciji")
    }
  }, [state.email, setLoading, setError, sendVerificationCode])

  const verifyCode = useCallback(async (code: string, type: "EMAIL_VERIFY" | "LOGIN_VERIFY" = "EMAIL_VERIFY") => {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch("/api/auth/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: state.email,
          code,
          type,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Neispravan kod")
        return false
      }

      // Sign in the user
      if (type === "EMAIL_VERIFY") {
        await signIn("credentials", {
          email: state.email,
          redirect: false,
        })
      }

      setState((s) => ({ ...s, step: "success", isLoading: false }))
      setTimeout(() => router.push("/dashboard"), 1500)
      return true
    } catch (error) {
      setError("Greška pri verifikaciji")
      return false
    }
  }, [state.email, router, setLoading, setError])

  const goBack = useCallback(() => {
    if (state.step === "authenticate" || state.step === "register") {
      setState(initialState)
    } else if (state.step === "verify") {
      setState((s) => ({
        ...s,
        step: s.isNewUser ? "register" : "authenticate",
        error: null,
      }))
    }
  }, [state.step])

  return {
    ...state,
    setStep,
    setError,
    checkEmail,
    authenticate,
    register,
    verifyCode,
    sendVerificationCode,
    goBack,
  }
}
