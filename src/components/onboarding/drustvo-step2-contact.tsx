"use client"

import { useState, useEffect, useCallback, useTransition } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Loader2, Mail, CheckCircle2, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { getOnboardingData, saveOnboardingData } from "@/lib/actions/onboarding"
import type { OnboardingData } from "@/lib/actions/onboarding.types"

/**
 * Simple email validation regex
 */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

interface DrushtvoStep2ContactProps {
  /**
   * Called when user clicks "Natrag" to go back
   */
  onBack?: () => void
}

/**
 * DRUSTVO Step 2: Contact Information Collection
 *
 * Collects contact information:
 * - Email (required, with validation)
 * - Phone (optional)
 * - IBAN (optional)
 *
 * D.O.O./J.D.O.O. is always VAT payer, so isVatPayer is hardcoded to true.
 * On success, navigates to /cc (Control Center)
 */
export function DrushtvoStep2Contact({ onBack }: DrushtvoStep2ContactProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // Loading state for initial data fetch
  const [isLoading, setIsLoading] = useState(true)
  const [companyData, setCompanyData] = useState<OnboardingData | null>(null)

  // Form state
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [iban, setIban] = useState("")

  // Validation state
  const [emailValidation, setEmailValidation] = useState<{
    isValid: boolean
    message: string
  } | null>(null)

  // Error state
  const [error, setError] = useState<string | null>(null)

  // Load existing company data
  useEffect(() => {
    async function loadData() {
      try {
        const data = await getOnboardingData()

        if (!data || !data.name || !data.oib || !data.legalForm) {
          // No company data exists, redirect back to step 1
          router.push("/onboarding?step=drustvo-step1")
          return
        }

        setCompanyData(data)

        // Pre-fill form with existing values if any
        if (data.email) setEmail(data.email)
        if (data.phone) setPhone(data.phone)
        if (data.iban) setIban(data.iban)
      } catch {
        setError("Doslo je do greske pri ucitavanju podataka. Molimo pokusajte ponovno.")
      } finally {
        setIsLoading(false)
      }
    }

    void loadData()
  }, [router])

  // Validate email on change
  const handleEmailChange = useCallback((value: string) => {
    setEmail(value)
    setError(null)

    if (value.length === 0) {
      setEmailValidation(null)
    } else if (!EMAIL_REGEX.test(value)) {
      setEmailValidation({
        isValid: false,
        message: "Unesite ispravnu email adresu",
      })
    } else {
      setEmailValidation({
        isValid: true,
        message: "Ispravan format",
      })
    }
  }, [])

  // Check if form is valid
  const isFormValid = email.length > 0 && EMAIL_REGEX.test(email)

  // Handle form submission
  const handleSubmit = useCallback(() => {
    if (!isFormValid || isPending || !companyData) return

    setError(null)
    startTransition(async () => {
      const result = await saveOnboardingData({
        name: companyData.name!,
        oib: companyData.oib!,
        legalForm: companyData.legalForm!,
        competence: companyData.competence || undefined,
        address: companyData.address || undefined,
        postalCode: companyData.postalCode || undefined,
        city: companyData.city || undefined,
        country: companyData.country,
        email,
        phone: phone || undefined,
        iban: iban || undefined,
        isVatPayer: true, // D.O.O. is always VAT payer
      })

      if ("error" in result && result.error) {
        setError(result.error)
        return
      }

      // Success - navigate to Control Center
      router.push("/cc")
    })
  }, [isFormValid, isPending, companyData, email, phone, iban, router])

  // Get legal form display name
  const getLegalFormLabel = (legalForm: string) => {
    switch (legalForm) {
      case "DOO":
        return "D.O.O."
      case "JDOO":
        return "J.D.O.O."
      default:
        return legalForm
    }
  }

  // Render email validation status
  const renderEmailStatus = () => {
    if (!emailValidation) return null

    if (emailValidation.isValid) {
      return (
        <span className="text-body-xs text-success flex items-center gap-1">
          <CheckCircle2 className="h-3 w-3" />
          {emailValidation.message}
        </span>
      )
    }

    return (
      <span className="text-body-xs text-warning flex items-center gap-1">
        {emailValidation.message}
      </span>
    )
  }

  // Loading state while fetching data
  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-interactive" />
      </div>
    )
  }

  // Should not happen, but safety check
  if (!companyData) {
    return null
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Mail className="h-6 w-6 text-interactive" />
          <h2 className="text-xl font-semibold text-foreground">Korak 2: Kontakt podaci</h2>
        </div>
        <p className="text-secondary">Unesite kontakt podatke vase tvrtke</p>
      </div>

      {/* Company Summary Card */}
      <Card className="mb-6 bg-surface-1">
        <div className="p-4">
          <p className="text-body-sm text-muted mb-2">Tvrtka iz koraka 1:</p>
          <p className="text-body-base font-medium text-foreground">{companyData.name}</p>
          <p className="text-body-sm text-secondary">
            OIB: {companyData.oib} | {getLegalFormLabel(companyData.legalForm!)}
          </p>
        </div>
      </Card>

      {/* Error Display */}
      {error && (
        <div className="mb-6 p-4 rounded-lg bg-danger/10 border border-danger">
          <p className="text-body-sm text-danger">{error}</p>
        </div>
      )}

      {/* Form Fields */}
      <div className="space-y-6">
        {/* Email Field */}
        <div>
          <Label htmlFor="email" className="text-body-sm font-medium text-foreground mb-1 block">
            Email *
          </Label>
          <div className="flex items-center gap-3">
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => handleEmailChange(e.target.value)}
              placeholder="tvrtka@email.hr"
              className="max-w-md"
              error={emailValidation && !emailValidation.isValid ? true : undefined}
              aria-describedby="email-status"
              disabled={isPending}
            />
            <div id="email-status">{renderEmailStatus()}</div>
          </div>
          <p className="mt-1 text-body-xs text-muted">Kontakt email tvrtke</p>
        </div>

        {/* Phone Field */}
        <div>
          <Label htmlFor="phone" className="text-body-sm font-medium text-foreground mb-1 block">
            Telefon <span className="text-muted font-normal">(opcionalno)</span>
          </Label>
          <Input
            id="phone"
            type="tel"
            value={phone}
            onChange={(e) => {
              setPhone(e.target.value)
              setError(null)
            }}
            placeholder="+385 1 234 5678"
            className="max-w-md"
            disabled={isPending}
          />
        </div>

        {/* IBAN Field */}
        <div>
          <Label htmlFor="iban" className="text-body-sm font-medium text-foreground mb-1 block">
            IBAN <span className="text-muted font-normal">(opcionalno)</span>
          </Label>
          <Input
            id="iban"
            type="text"
            value={iban}
            onChange={(e) => {
              setIban(e.target.value.toUpperCase())
              setError(null)
            }}
            placeholder="HR1234567890123456789"
            className="max-w-md"
            disabled={isPending}
          />
          <p className="mt-1 text-body-xs text-muted">Poslovni racun tvrtke</p>
        </div>

        {/* VAT Info Box */}
        <div className="p-4 rounded-lg bg-info/10 border border-info/30">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-info mt-0.5 shrink-0" />
            <div>
              <p className="text-body-sm font-medium text-foreground">PDV obveznik</p>
              <p className="text-body-sm text-secondary mt-1">
                {getLegalFormLabel(companyData.legalForm!)} je automatski obveznik PDV-a prema
                hrvatskom zakonu. Ova postavka ce biti automatski ukljucena.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between mt-10">
        {onBack ? (
          <Button type="button" variant="outline" onClick={onBack} disabled={isPending}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Natrag
          </Button>
        ) : (
          <div />
        )}
        <Button
          type="button"
          variant="primary"
          onClick={handleSubmit}
          disabled={!isFormValid || isPending}
        >
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Spremam...
            </>
          ) : (
            <>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Zavrsi postavljanje
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
