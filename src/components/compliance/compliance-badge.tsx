"use client"

import { Shield, CheckCircle } from "lucide-react"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import Link from "next/link"

interface ComplianceBadgeProps {
  variant?: "footer" | "inline" | "card"
  showDetails?: boolean
}

export function ComplianceBadge({ variant = "footer", showDetails = false }: ComplianceBadgeProps) {
  if (variant === "footer") {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Link
            href="/compliance"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <Shield className="h-3.5 w-3.5 text-green-600" />
            <span>Fiskalizacija 2.0 Certificirano</span>
          </Link>
        </TooltipTrigger>
        <TooltipContent>
          <p>Usklađeno s hrvatskim zakonima o fiskalizaciji</p>
          <p className="text-xs text-muted-foreground">Kliknite za više detalja</p>
        </TooltipContent>
      </Tooltip>
    )
  }

  if (variant === "card") {
    return (
      <div className="flex items-center gap-2 p-3 border rounded-lg bg-green-50 border-green-200">
        <CheckCircle className="h-5 w-5 text-green-600" />
        <div>
          <p className="text-sm font-medium text-green-900">Fiskalizacija 2.0 Certificirano</p>
          <p className="text-xs text-green-700">Usklađeno s Poreznom upravom</p>
        </div>
      </div>
    )
  }

  return (
    <span className="inline-flex items-center gap-1 text-xs">
      <Shield className="h-3 w-3 text-green-600" />
      <span>Certificirano</span>
    </span>
  )
}
