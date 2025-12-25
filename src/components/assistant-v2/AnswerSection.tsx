"use client"

import React from "react"
import { motion } from "framer-motion"
import {
  AlertCircle,
  HelpCircle,
  Database,
  AlertTriangle,
  MessageCircle,
  Globe,
} from "lucide-react"
import type { AssistantControllerState, Surface, RefusalReason } from "@/lib/assistant/client"
import { cn } from "@/lib/utils"
import type { AssistantVariant } from "./AssistantContainer"

interface AnswerSectionProps {
  state: AssistantControllerState
  surface: Surface
  onSuggestionClick?: (suggestion: string) => void
  className?: string
  variant?: AssistantVariant
}

const REFUSAL_CONFIG: Record<
  RefusalReason,
  { title: string; icon: React.ReactNode; lightBg: string; darkBg: string }
> = {
  NO_CITABLE_RULES: {
    title: "Nema verificiranih pravila",
    icon: <HelpCircle className="w-5 h-5" />,
    lightBg: "bg-muted/30",
    darkBg: "bg-slate-800/40 border-slate-700/50",
  },
  OUT_OF_SCOPE: {
    title: "Izvan našeg opsega",
    icon: <AlertCircle className="w-5 h-5" />,
    lightBg: "bg-muted/30",
    darkBg: "bg-slate-800/40 border-slate-700/50",
  },
  MISSING_CLIENT_DATA: {
    title: "Potrebni dodatni podaci",
    icon: <Database className="w-5 h-5" />,
    lightBg: "bg-blue-50 dark:bg-blue-950/20",
    darkBg: "bg-blue-900/20 border-blue-500/30",
  },
  UNRESOLVED_CONFLICT: {
    title: "Proturječne informacije",
    icon: <AlertTriangle className="w-5 h-5" />,
    lightBg: "bg-amber-50 dark:bg-amber-950/20",
    darkBg: "bg-amber-900/20 border-amber-500/30",
  },
  NEEDS_CLARIFICATION: {
    title: "Molimo pojasnite pitanje",
    icon: <MessageCircle className="w-5 h-5" />,
    lightBg: "bg-blue-50 dark:bg-blue-950/20",
    darkBg: "bg-cyan-900/20 border-cyan-500/30",
  },
  UNSUPPORTED_JURISDICTION: {
    title: "Nepodržana jurisdikcija",
    icon: <Globe className="w-5 h-5" />,
    lightBg: "bg-muted/30",
    darkBg: "bg-purple-900/20 border-purple-500/30",
  },
}

// Scan-line animation component for dark mode
function ScanLineOverlay() {
  return (
    <motion.div
      className="absolute inset-0 pointer-events-none overflow-hidden rounded-xl"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <motion.div
        className="absolute inset-x-0 h-8 bg-gradient-to-b from-cyan-500/5 to-transparent"
        initial={{ y: "-100%" }}
        animate={{ y: "100%" }}
        transition={{ duration: 1.5, ease: "linear" }}
      />
    </motion.div>
  )
}

export function AnswerSection({
  state,
  surface,
  onSuggestionClick,
  className,
  variant = "light",
}: AnswerSectionProps) {
  const { status, activeAnswer, error } = state
  const isDark = variant === "dark"

  const baseCardClass = isDark
    ? "bg-slate-800/40 backdrop-blur-md border border-slate-700/50 rounded-xl"
    : "border rounded-lg"

  // Empty state
  if (status === "IDLE" && !activeAnswer) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn("p-6", baseCardClass, className)}
      >
        <p className={isDark ? "text-slate-400" : "text-muted-foreground"}>
          Verificirani odgovor će se pojaviti ovdje
        </p>
        <p className={cn("text-sm mt-2", isDark ? "text-slate-500" : "text-muted-foreground")}>
          Svaki odgovor uključuje verificirane citate iz službenih izvora
        </p>
      </motion.div>
    )
  }

  // Loading skeleton with scan-line effect
  if (status === "LOADING") {
    return (
      <div
        data-testid="answer-skeleton"
        className={cn("relative p-6 space-y-4", baseCardClass, className)}
      >
        {isDark && <ScanLineOverlay />}
        <div
          className={cn(
            "h-6 rounded w-3/4",
            isDark ? "bg-slate-700/50 animate-pulse" : "bg-muted animate-pulse"
          )}
        />
        <div className="space-y-2">
          <div
            className={cn(
              "h-4 rounded",
              isDark ? "bg-slate-700/50 animate-pulse" : "bg-muted animate-pulse"
            )}
          />
          <div
            className={cn(
              "h-4 rounded w-5/6",
              isDark ? "bg-slate-700/50 animate-pulse" : "bg-muted animate-pulse"
            )}
          />
        </div>
        {isDark && (
          <motion.span
            className="text-cyan-400/70 text-sm"
            animate={{ opacity: [1, 0.5, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            Pretražujem izvore...
          </motion.span>
        )}
      </div>
    )
  }

  // Error state
  if (status === "ERROR" && error) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          "p-6",
          isDark
            ? "bg-red-950/30 border border-red-500/40 backdrop-blur-md rounded-xl"
            : "border border-destructive/50 rounded-lg bg-destructive/5",
          className
        )}
      >
        <h2 className={cn("font-medium", isDark ? "text-red-400" : "text-destructive")}>
          Nešto je pošlo krivo
        </h2>
        <p className={cn("text-sm mt-1", isDark ? "text-slate-400" : "text-muted-foreground")}>
          {error.message}
        </p>
        {error.type !== "CLIENT_ERROR" && (
          <button
            className={cn(
              "mt-3 text-sm hover:underline",
              isDark ? "text-cyan-400" : "text-primary"
            )}
          >
            Pokušaj ponovo
          </button>
        )}
      </motion.div>
    )
  }

  // No answer yet (streaming started but no content)
  if (!activeAnswer) {
    return (
      <div data-testid="answer-skeleton" className={cn("relative p-6", baseCardClass, className)}>
        {isDark && <ScanLineOverlay />}
        <div
          className={cn(
            "h-6 rounded w-3/4",
            isDark ? "bg-slate-700/50 animate-pulse" : "bg-muted animate-pulse"
          )}
        />
      </div>
    )
  }

  // Refusal card
  if (activeAnswer.kind === "REFUSAL") {
    const reason = activeAnswer.refusalReason || "NO_CITABLE_RULES"
    const config = REFUSAL_CONFIG[reason] || REFUSAL_CONFIG.NO_CITABLE_RULES
    const relatedTopics = activeAnswer.refusal?.relatedTopics || []

    return (
      <motion.article
        initial={{ opacity: 0, y: 20, clipPath: "inset(0 0 100% 0)" }}
        animate={{ opacity: 1, y: 0, clipPath: "inset(0 0 0% 0)" }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className={cn(
          "p-6",
          isDark
            ? `backdrop-blur-md rounded-xl border ${config.darkBg}`
            : `rounded-lg ${config.lightBg}`,
          className
        )}
      >
        <div className="flex items-start gap-3">
          <span
            className={cn(
              "mt-0.5 flex-shrink-0",
              isDark ? "text-slate-400" : "text-muted-foreground"
            )}
          >
            {config.icon}
          </span>
          <div className="flex-1 min-w-0">
            <h2
              tabIndex={-1}
              className={cn("font-semibold", isDark ? "text-white" : "text-foreground")}
            >
              {activeAnswer.headline || config.title}
            </h2>
            <p className={cn("text-sm mt-2", isDark ? "text-slate-300" : "text-muted-foreground")}>
              {activeAnswer.refusal?.message}
            </p>
          </div>
        </div>

        {/* Redirect options (OUT_OF_SCOPE) */}
        {activeAnswer.refusal?.redirectOptions &&
          activeAnswer.refusal.redirectOptions.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {activeAnswer.refusal.redirectOptions.map((option, i) => (
                <a
                  key={i}
                  href={option.href}
                  className={cn(
                    "text-sm px-3 py-1.5 rounded-md transition-colors",
                    isDark
                      ? "bg-slate-800/60 border border-slate-600/50 text-slate-200 hover:bg-slate-700/60"
                      : "bg-background border hover:bg-muted"
                  )}
                >
                  {option.label}
                </a>
              ))}
            </div>
          )}

        {/* Related topics / clarifications */}
        {relatedTopics.length > 0 && (
          <div className="mt-4">
            <h3
              className={cn(
                "text-xs font-medium uppercase mb-2",
                isDark ? "text-slate-500" : "text-muted-foreground"
              )}
            >
              {reason === "NEEDS_CLARIFICATION" ? "Probajte jedno od ovih" : "Povezane teme"}
            </h3>
            <div className="flex flex-wrap gap-2">
              {relatedTopics.map((topic, i) => (
                <motion.button
                  key={i}
                  type="button"
                  onClick={() => onSuggestionClick?.(topic)}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={cn(
                    "text-sm px-3 py-1.5 rounded-full transition-all",
                    isDark
                      ? [
                          "bg-slate-800/30 border border-cyan-500/20",
                          "text-cyan-200 hover:bg-cyan-500/10 hover:border-cyan-400/40",
                          "hover:shadow-[0_0_10px_rgba(6,182,212,0.15)]",
                        ]
                      : "bg-background border hover:bg-muted"
                  )}
                >
                  {topic}
                </motion.button>
              ))}
            </div>
          </div>
        )}
      </motion.article>
    )
  }

  // Answer card with scan-line reveal
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, clipPath: "inset(0 0 100% 0)" }}
      animate={{ opacity: 1, y: 0, clipPath: "inset(0 0 0% 0)" }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className={cn("p-6", baseCardClass, className)}
    >
      <h2
        tabIndex={-1}
        className={cn("text-xl font-semibold", isDark ? "text-white" : "text-foreground")}
      >
        {activeAnswer.headline}
      </h2>
      <p className={cn("mt-2", isDark ? "text-slate-300" : "text-muted-foreground")}>
        {activeAnswer.directAnswer}
      </p>

      {activeAnswer.keyDetails && activeAnswer.keyDetails.length > 0 && (
        <ul className="mt-4 space-y-1">
          {activeAnswer.keyDetails.map((detail, i) => (
            <motion.li
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + i * 0.1 }}
              className={cn(
                "text-sm flex items-start gap-2",
                isDark ? "text-slate-300" : "text-foreground"
              )}
            >
              <span className={isDark ? "text-cyan-400" : "text-primary"}>•</span>
              {detail}
            </motion.li>
          ))}
        </ul>
      )}

      {activeAnswer.nextStep && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className={cn("mt-4 text-sm font-medium", isDark ? "text-cyan-400" : "text-primary")}
        >
          Sljedeći korak: {activeAnswer.nextStep}
        </motion.p>
      )}

      <div className="flex gap-2 mt-4">
        {activeAnswer.why && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={cn(
              "text-sm px-3 py-1.5 rounded transition-all",
              isDark
                ? "border border-slate-600/50 text-slate-300 hover:bg-slate-700/50 hover:border-slate-500/50"
                : "border hover:bg-muted"
            )}
          >
            Zašto?
          </motion.button>
        )}
        {activeAnswer.howToApply && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={cn(
              "text-sm px-3 py-1.5 rounded transition-all",
              isDark
                ? "border border-slate-600/50 text-slate-300 hover:bg-slate-700/50 hover:border-slate-500/50"
                : "border hover:bg-muted"
            )}
          >
            Kako primijeniti
          </motion.button>
        )}
      </div>
    </motion.div>
  )
}
