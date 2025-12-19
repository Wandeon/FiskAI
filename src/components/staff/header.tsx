'use client'

import { Bell, User } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function StaffHeader() {
  return (
    <header className="h-16 border-b border-[var(--border)] bg-[var(--surface)] flex items-center justify-between px-6">
      <h2 className="text-lg font-semibold">Staff Portal</h2>

      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon">
          <Bell className="h-5 w-5" />
        </Button>
        <Button variant="ghost" size="icon">
          <User className="h-5 w-5" />
        </Button>
      </div>
    </header>
  )
}
