"use client"

import { useState } from "react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { X, ArrowRight, AlertTriangle, CheckCircle, Info } from "lucide-react"
import Link from "next/link"
import type { ContextualTrigger } from "@/lib/tutorials/triggers"

interface ContextualHelpBannerProps {
  triggers: ContextualTrigger[]
  onDismiss?: (triggerId: string) => void
}

const ICONS = {
  success: CheckCircle,
  warning: AlertTriangle,
  info: Info,
}

const VARIANTS = {
  success: "border-green-200 bg-green-50 text-green-900",
  warning: "border-amber-200 bg-amber-50 text-amber-900",
  info: "border-blue-200 bg-blue-50 text-blue-900",
}

export function ContextualHelpBanner({ triggers, onDismiss }: ContextualHelpBannerProps) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())

  const visibleTriggers = triggers.filter((t) => !dismissed.has(t.id))

  if (visibleTriggers.length === 0) return null

  const handleDismiss = (triggerId: string) => {
    setDismissed((prev) => new Set([...prev, triggerId]))
    onDismiss?.(triggerId)
  }

  return (
    <div className="space-y-2">
      {visibleTriggers.map((trigger) => {
        const Icon = ICONS[trigger.type]
        return (
          <Alert key={trigger.id} className={VARIANTS[trigger.type]}>
            <Icon className="h-4 w-4" />
            <AlertTitle className="flex items-center justify-between">
              {trigger.title}
              {trigger.dismissible && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => handleDismiss(trigger.id)}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </AlertTitle>
            <AlertDescription>
              <div className="flex items-center justify-between gap-4">
                <span>{trigger.description}</span>
                {trigger.href && (
                  <Link href={trigger.href}>
                    <Button variant="ghost" size="sm" className="gap-1">
                      Saznaj više
                      <ArrowRight className="h-3 w-3" />
                    </Button>
                  </Link>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )
      })}
    </div>
  )
}
