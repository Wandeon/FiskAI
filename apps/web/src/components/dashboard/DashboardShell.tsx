import { type ReactNode } from "react"
import { DashboardNav } from "./DashboardNav"

interface DashboardShellProps {
  children: ReactNode
  companyName: string
  userName: string
}

export function DashboardShell({
  children,
  companyName,
  userName,
}: DashboardShellProps) {
  return (
    <div className="min-h-screen bg-slate-950 flex">
      {/* Sidebar - hidden on mobile, visible on lg+ */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0">
        <div className="flex flex-col flex-1 bg-white/5 backdrop-blur-xl border-r border-white/10">
          {/* Logo/Brand */}
          <div className="flex items-center gap-2 px-6 py-5 border-b border-white/10">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center">
              <span className="text-white font-bold text-sm">F</span>
            </div>
            <span className="text-white font-semibold text-lg">FiskAI</span>
          </div>

          {/* Company Info */}
          <div className="px-6 py-4 border-b border-white/10">
            <p className="text-xs text-white/50 uppercase tracking-wider mb-1">
              Tvrtka
            </p>
            <p className="text-white font-medium truncate">{companyName}</p>
          </div>

          {/* Navigation */}
          <div className="flex-1 py-4 overflow-y-auto">
            <DashboardNav />
          </div>

          {/* User Info */}
          <div className="px-6 py-4 border-t border-white/10">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-white/10 flex items-center justify-center">
                <span className="text-cyan-400 font-medium text-sm">
                  {userName.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white font-medium truncate">
                  {userName}
                </p>
                <p className="text-xs text-white/50">Korisnik</p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 lg:pl-64">
        <div className="min-h-screen">{children}</div>
      </main>
    </div>
  )
}

export default DashboardShell
