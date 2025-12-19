import { ReactNode } from "react"
import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { Card } from "@/components/ui/card"

// TODO: Create StaffSidebar and StaffHeader components in Phase 5
// import { StaffSidebar } from "@/components/staff/sidebar"
// import { StaffHeader } from "@/components/staff/header"
// import { StaffClientProvider } from "@/contexts/staff-client-context"

export default async function StaffLayout({ children }: { children: ReactNode }) {
  const session = await auth()

  if (!session?.user) {
    redirect("/login")
  }

  // TODO: Check systemRole when implemented in Phase 1
  // if (user.systemRole !== 'STAFF' && user.systemRole !== 'ADMIN') {
  //   redirect('/')
  // }

  return (
    <div className="flex h-screen bg-[var(--background)]">
      {/* Placeholder sidebar */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col border-r border-slate-700">
        <div className="p-4 border-b border-slate-700">
          <h1 className="text-xl font-bold">FiskAI Staff</h1>
          <p className="text-xs text-slate-400">Staff Portal (Coming Soon)</p>
        </div>
        <nav className="flex-1 p-4">
          <p className="text-sm text-slate-400">Navigation will be implemented in Phase 5</p>
        </nav>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Placeholder header */}
        <header className="h-16 border-b border-[var(--border)] bg-[var(--surface)] flex items-center px-6">
          <h2 className="text-lg font-semibold">Staff Portal</h2>
        </header>

        {/* Main content area */}
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
