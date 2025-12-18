"use client"

import { useState } from "react"
import { Modal, ModalFooter } from "@/components/ui/modal"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Loader2, FileText } from "lucide-react"
import { CROATIAN_MONTHS } from "@/lib/pausalni/constants"

interface Props {
  isOpen: boolean
  onClose: () => void
  onGenerated?: () => void
}

const FORM_TYPES = [
  { value: "PDV", label: "PDV obrazac (mjesečni promet)" },
  { value: "PDV-S", label: "PDV-S obrazac (EU transakcije)" },
  { value: "ZP", label: "ZP obrazac (zbirna prijava)" },
]

export function FormGeneratorDialog({ isOpen, onClose, onGenerated }: Props) {
  const [formType, setFormType] = useState<string>("")
  const [month, setMonth] = useState<string>("")
  const [year, setYear] = useState<string>("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Generate year options (current year and 2 years back)
  const currentYear = new Date().getFullYear()
  const yearOptions = [currentYear, currentYear - 1, currentYear - 2]

  async function handleGenerate() {
    if (!formType || !month || !year) {
      setError("Molimo ispunite sva polja")
      return
    }

    setIsGenerating(true)
    setError(null)

    try {
      const response = await fetch("/api/pausalni/forms", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          formType,
          month: parseInt(month),
          year: parseInt(year),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Generiranje obrasca nije uspjelo")
      }

      // Success - call callback and close
      onGenerated?.()
      handleClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nepoznata greška")
    } finally {
      setIsGenerating(false)
    }
  }

  function handleClose() {
    if (!isGenerating) {
      setFormType("")
      setMonth("")
      setYear("")
      setError(null)
      onClose()
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Generiraj obrazac"
      description="Odaberite vrstu obrasca i razdoblje za generiranje"
      size="md"
    >
      <div className="space-y-4">
        {/* Form Type Selection */}
        <div className="space-y-2">
          <Label htmlFor="formType">Vrsta obrasca</Label>
          <Select value={formType} onValueChange={setFormType} disabled={isGenerating}>
            <SelectTrigger id="formType">
              <SelectValue placeholder="Odaberite vrstu obrasca" />
            </SelectTrigger>
            <SelectContent>
              {FORM_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Period Selection - Month */}
        <div className="space-y-2">
          <Label htmlFor="month">Mjesec</Label>
          <Select value={month} onValueChange={setMonth} disabled={isGenerating}>
            <SelectTrigger id="month">
              <SelectValue placeholder="Odaberite mjesec" />
            </SelectTrigger>
            <SelectContent>
              {CROATIAN_MONTHS.map((monthName, index) => (
                <SelectItem key={index + 1} value={String(index + 1)}>
                  {monthName.charAt(0).toUpperCase() + monthName.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Period Selection - Year */}
        <div className="space-y-2">
          <Label htmlFor="year">Godina</Label>
          <Select value={year} onValueChange={setYear} disabled={isGenerating}>
            <SelectTrigger id="year">
              <SelectValue placeholder="Odaberite godinu" />
            </SelectTrigger>
            <SelectContent>
              {yearOptions.map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Error Message */}
        {error && (
          <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Action Buttons */}
        <ModalFooter>
          <Button variant="outline" onClick={handleClose} disabled={isGenerating}>
            Odustani
          </Button>
          <Button onClick={handleGenerate} disabled={isGenerating || !formType || !month || !year}>
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generiram...
              </>
            ) : (
              <>
                <FileText className="h-4 w-4 mr-2" />
                Generiraj
              </>
            )}
          </Button>
        </ModalFooter>
      </div>
    </Modal>
  )
}
