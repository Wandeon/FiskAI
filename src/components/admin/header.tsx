"use client"

import { useState, useRef, useEffect } from "react"
import { Bell, Building2, AlertTriangle, LogOut, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { logout } from "@/lib/actions/auth"

interface AdminHeaderProps {
  totalTenants?: number
  alertsCount?: number
}

export function AdminHeader({ totalTenants, alertsCount }: AdminHeaderProps) {
  return (
    <header className="h-16 border-b border-[var(--border)] bg-[var(--surface)] flex items-center justify-between px-6">
      <div className="flex items-center gap-6">
        <h2 className="text-lg font-semibold">Admin Portal</h2>

        {/* Quick Stats */}
        <div className="hidden md:flex items-center gap-4 text-sm">
          {totalTenants !== undefined && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-info-bg rounded-lg">
              <Building2 className="h-4 w-4 text-info-icon" />
              <span className="font-medium text-info-text">{totalTenants}</span>
              <span className="text-info-text">Tenants</span>
            </div>
          )}

          {alertsCount !== undefined && alertsCount > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-danger-bg rounded-lg">
              <AlertTriangle className="h-4 w-4 text-danger-icon" />
              <span className="font-medium text-danger-text">{alertsCount}</span>
              <span className="text-danger-text">Alerts</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {alertsCount !== undefined && alertsCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {alertsCount > 9 ? "9+" : alertsCount}
            </Badge>
          )}
        </Button>
        <AdminUserMenu />
      </div>
    </header>
  )
}

function AdminUserMenu() {
  const [isOpen, setIsOpen] = useState(false)
  const [isPending, setIsPending] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleLogout = async () => {
    setIsPending(true)
    await logout()
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-lg p-1.5 hover:bg-[var(--surface-secondary)] transition-colors"
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-sm font-medium text-brand-700">
          A
        </div>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-[var(--muted)] hidden sm:block transition-transform",
            isOpen && "rotate-180"
          )}
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-48 rounded-lg border border-[var(--border)] bg-[var(--surface)] shadow-lg z-50">
          <div className="p-1">
            <button
              onClick={() => void handleLogout()}
              disabled={isPending}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-danger-text hover:bg-danger-bg transition-colors disabled:opacity-50"
            >
              <LogOut className="h-4 w-4" />
              {isPending ? "Logging out..." : "Logout"}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
