"use client"

import React, { useState } from "react"
import { motion } from "framer-motion"
import type { CitationBlock, ControllerStatus } from "@/lib/assistant/client"
import { SourceCard } from "./SourceCard"
import { SupportingSources } from "./SupportingSources"
import { cn } from "@/lib/utils"
import type { AssistantVariant } from "./AssistantContainer"

interface EvidencePanelProps {
  citations: CitationBlock | undefined
  status: ControllerStatus
  className?: string
  variant?: AssistantVariant
}

// Scan-line animation for loading state
function ScanLineOverlay() {
  return (
    <motion.div
      className="absolute inset-0 pointer-events-none overflow-hidden rounded-xl"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <motion.div
        className="absolute inset-x-0 h-6 bg-gradient-to-b from-cyan-500/5 to-transparent"
        initial={{ y: "-100%" }}
        animate={{ y: "100%" }}
        transition={{ duration: 1.8, ease: "linear", repeat: Infinity }}
      />
    </motion.div>
  )
}

export function EvidencePanel({
  citations,
  status,
  className,
  variant = "light",
}: EvidencePanelProps) {
  const [supportingExpanded, setSupportingExpanded] = useState(false)

  const isLoading = status === "LOADING"
  const isEmpty = !citations && status !== "LOADING"
  const isDark = variant === "dark"

  const baseCardClass = isDark
    ? "bg-slate-800/40 backdrop-blur-md border border-slate-700/50 rounded-xl"
    : "border rounded-lg"

  return (
    <section id="assistant-sources" aria-label="Sources" className={cn(baseCardClass, className)}>
      <header className={cn("p-4 border-b", isDark ? "border-slate-700/50" : "border-border")}>
        <h3 className={cn("font-medium", isDark ? "text-white" : "text-foreground")}>Sources</h3>
      </header>

      <div className="p-4 relative">
        {/* Loading skeleton with scan-line */}
        {isLoading && (
          <div data-testid="evidence-skeleton" className="space-y-4 relative">
            {isDark && <ScanLineOverlay />}
            <div
              className={cn(
                "h-4 rounded w-3/4",
                isDark ? "bg-slate-700/50 animate-pulse" : "bg-muted animate-pulse"
              )}
            />
            <div
              className={cn(
                "h-3 rounded w-1/2",
                isDark ? "bg-slate-700/50 animate-pulse" : "bg-muted animate-pulse"
              )}
            />
            <div
              className={cn(
                "h-16 rounded",
                isDark ? "bg-slate-700/50 animate-pulse" : "bg-muted animate-pulse"
              )}
            />
            <div
              className={cn(
                "h-3 rounded w-1/3",
                isDark ? "bg-slate-700/50 animate-pulse" : "bg-muted animate-pulse"
              )}
            />
            {isDark && (
              <motion.span
                className="text-cyan-400/70 text-xs"
                animate={{ opacity: [1, 0.5, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                Učitavam izvore...
              </motion.span>
            )}
          </div>
        )}

        {/* Empty state */}
        {isEmpty && (
          <p className={cn("text-sm", isDark ? "text-slate-400" : "text-muted-foreground")}>
            Sources will appear here
          </p>
        )}

        {/* Citations content */}
        {citations && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="space-y-4"
          >
            {/* Primary source - expanded */}
            <SourceCard source={citations.primary} variant="expanded" theme={variant} />

            {/* Supporting sources - collapsed */}
            {citations.supporting.length > 0 && (
              <SupportingSources
                sources={citations.supporting}
                isExpanded={supportingExpanded}
                onToggle={() => setSupportingExpanded(!supportingExpanded)}
                theme={variant}
              />
            )}
          </motion.div>
        )}
      </div>
    </section>
  )
}
