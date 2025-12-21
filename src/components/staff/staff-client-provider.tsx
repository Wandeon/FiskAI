"use client"

import { ReactNode } from "react"

interface StaffClientProviderProps {
  children: ReactNode
}

export function StaffClientProvider({ children }: StaffClientProviderProps) {
  return <>{children}</>
}
