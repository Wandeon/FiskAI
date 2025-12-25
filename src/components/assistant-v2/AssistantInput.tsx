"use client"

import React, {
  useState,
  useRef,
  useCallback,
  forwardRef,
  useImperativeHandle,
  type KeyboardEvent,
} from "react"
import { Send } from "lucide-react"
import type { Surface } from "@/lib/assistant/client"
import { cn } from "@/lib/utils"

export interface AssistantInputHandle {
  /** Fill the input with text and focus it (does NOT submit) */
  fill: (text: string) => void
  /** Focus the input */
  focus: () => void
}

interface AssistantInputProps {
  surface: Surface
  onSubmit: (query: string) => void
  disabled?: boolean
  className?: string
}

const PLACEHOLDERS: Record<Surface, string> = {
  MARKETING: "Ask about Croatian tax, VAT, contributions, fiscalization...",
  APP: "Ask about regulations or your business...",
}

export const AssistantInput = forwardRef<AssistantInputHandle, AssistantInputProps>(
  function AssistantInput({ surface, onSubmit, disabled = false, className }, ref) {
    const [value, setValue] = useState("")
    const textareaRef = useRef<HTMLTextAreaElement>(null)

    // Expose imperative methods for parent components
    useImperativeHandle(
      ref,
      () => ({
        fill: (text: string) => {
          setValue(text)
          // Focus after state update
          requestAnimationFrame(() => {
            textareaRef.current?.focus()
          })
        },
        focus: () => {
          textareaRef.current?.focus()
        },
      }),
      []
    )

    const handleSubmit = useCallback(() => {
      const trimmed = value.trim()
      if (!trimmed || disabled) return

      onSubmit(trimmed)
      setValue("")
    }, [value, disabled, onSubmit])

    const handleKeyDown = useCallback(
      (e: KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault()
          handleSubmit()
        }
      },
      [handleSubmit]
    )

    return (
      <div className={cn("relative", className)}>
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={PLACEHOLDERS[surface]}
          disabled={disabled}
          rows={2}
          aria-describedby="assistant-input-hint"
          className={cn(
            "w-full p-4 pr-14 rounded-xl resize-none",
            "input-enhanced",
            "focus:outline-none",
            "disabled:opacity-50 disabled:cursor-not-allowed"
          )}
        />

        <button
          type="button"
          onClick={handleSubmit}
          disabled={disabled || !value.trim()}
          aria-label="Send"
          className={cn(
            "absolute right-3 bottom-3 p-2 rounded-lg",
            "bg-primary text-primary-foreground",
            "hover:bg-primary/90 transition-colors",
            "disabled:opacity-40 disabled:cursor-not-allowed",
            "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          )}
        >
          <Send className="w-5 h-5" />
        </button>

        <p id="assistant-input-hint" className="sr-only">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    )
  }
)
