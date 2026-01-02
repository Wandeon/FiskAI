// src/components/capability/ActionButton.tsx
/**
 * Action Button
 *
 * Renders an action button based on capability resolution.
 * Disabled actions show the reason - never hidden.
 * Executes capability actions via the useCapabilityAction hook.
 *
 * @module components/capability
 * @since Control Center Shells
 * @updated PHASE 2 - Capability-Driven Actions
 */

"use client"

import React from "react"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Loader2 } from "lucide-react"
import { useCapabilityAction } from "@/lib/capabilities/actions/useCapabilityAction"
import { toast } from "@/lib/toast"
import type { ActionButtonProps } from "./types"

export function ActionButton({
  action,
  capabilityId,
  entityId,
  entityType,
  showDiagnostics = false,
  params,
  onSuccess,
  onError,
}: ActionButtonProps) {
  const { execute, isLoading } = useCapabilityAction({
    capabilityId,
    actionId: action.id,
    entityId,
    entityType,
    onSuccess: () => {
      toast.success("Success", `${action.label} completed`)
      onSuccess?.()
    },
    onError: (err) => {
      toast.error("Error", err)
      onError?.(err)
    },
  })

  const handleClick = async () => {
    if (action.enabled && !isLoading) {
      await execute({ id: entityId, ...params })
    }
  }

  const isDisabled = !action.enabled || isLoading

  const button = (
    <Button
      variant={action.primary ? "default" : "outline"}
      disabled={isDisabled}
      onClick={handleClick}
      className="relative"
    >
      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {action.label}
      {showDiagnostics && (
        <span className="absolute -top-2 -right-2 text-[10px] font-mono bg-muted px-1 rounded">
          {capabilityId}
        </span>
      )}
    </Button>
  )

  if (!action.enabled && action.disabledReason) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>{button}</TooltipTrigger>
          <TooltipContent>
            <p>{action.disabledReason}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return button
}
