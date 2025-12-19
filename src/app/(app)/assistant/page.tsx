"use client"

import { useEffect } from "react"
import { useAssistant } from "@/components/assistant/AssistantContext"
import { Loader2 } from "lucide-react"

export default function AssistantPage() {
  const { openAssistant } = useAssistant()

  useEffect(() => {
    // Automatically open the popup when visiting this page
    openAssistant()
  }, [openAssistant])

  return (
    <div className="flex flex-col items-center justify-center h-[50vh] text-center space-y-4">
      <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      <p className="text-[var(--muted)]">Otvaranje asistenta...</p>
    </div>
  )
}
