// src/lib/shortcuts/index.ts
// Keyboard shortcut definitions and formatting utilities

export interface Shortcut {
  id: string
  keys: string[] // e.g., ["cmd", "n"] or ["ctrl", "n"]
  action: string
  description: string
  href?: string
}

export const GLOBAL_SHORTCUTS: Shortcut[] = [
  {
    id: "new-invoice",
    keys: ["cmd", "n"],
    action: "newInvoice",
    description: "Novi račun",
    href: "/invoices/new",
  },
  {
    id: "new-contact",
    keys: ["cmd", "shift", "c"],
    action: "newContact",
    description: "Novi kontakt",
    href: "/contacts/new",
  },
  {
    id: "new-product",
    keys: ["cmd", "shift", "p"],
    action: "newProduct",
    description: "Novi proizvod",
    href: "/products/new",
  },
  {
    id: "dashboard",
    keys: ["cmd", "d"],
    action: "dashboard",
    description: "Dashboard",
    href: "/dashboard",
  },
  { id: "search", keys: ["cmd", "k"], action: "search", description: "Pretraga" },
]

export function formatShortcut(keys: string[]): string {
  return keys
    .map((key) => {
      if (key === "cmd") return "⌘"
      if (key === "ctrl") return "Ctrl"
      if (key === "shift") return "⇧"
      if (key === "alt") return "⌥"
      return key.toUpperCase()
    })
    .join("")
}
