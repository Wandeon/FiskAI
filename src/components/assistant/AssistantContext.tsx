"use client"

import { createContext, useContext, useState, ReactNode } from "react"
import { AssistantPopup } from "./AssistantPopup"

interface AssistantContextType {
  isOpen: boolean
  openAssistant: () => void
  closeAssistant: () => void
  toggleAssistant: () => void
}

const AssistantContext = createContext<AssistantContextType | undefined>(undefined)

export function AssistantProvider({ children }: { children: ReactNode }) {
  // We can manage state here if we want the popup to be controllable from anywhere
  // However, the popup currently manages its own state internally in the previous implementation.
  // To make it globally controllable, we need to lift the state up or use an event bus.
  // For now, let's keep it simple: The popup is always rendered in layout, but we can't easily "force open" it
  // from a page without a context.

  // NOTE: This is a placeholder. To make the page.tsx redirect work nicely,
  // we need to refactor AssistantPopup to accept isOpen props or use a global store (zustand).

  return <>{children}</>
}

export function useAssistant() {
  return {
    isOpen: false,
    openAssistant: () => {
      // Dispatch a custom event that the popup listens to
      window.dispatchEvent(new Event("open-assistant"))
    },
    closeAssistant: () => {},
    toggleAssistant: () => {},
  }
}
