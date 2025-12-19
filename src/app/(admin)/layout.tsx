import { ReactNode } from "react"
import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { LayoutDashboard, Building2, Users, Newspaper } from "lucide-react"
import Link from "next/link"

// TODO: Create AdminSidebar and AdminHeader components in Phase 6
// import { AdminSidebar } from "@/components/admin/sidebar"
// import { AdminHeader } from "@/components/admin/header"

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await auth()

  if (!session?.user) {
    redirect("/login")
  }

  // TODO: Check systemRole when implemented in Phase 1
  // if (user.systemRole !== 'ADMIN') {
  //   redirect('/')
  // }

  return (
    <div className="flex h-screen bg-[var(--background)]">
      {/* Placeholder sidebar */}
      <aside className="w-64 bg-slate-950 text-white flex flex-col border-r border-slate-800">
        <div className="p-4 border-b border-slate-800">
          <h1 className="text-xl font-bold">FiskAI Admin</h1>
          <p className="text-xs text-slate-400">Platform Management</p>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          <Link
            href="/"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-400 hover:bg-slate-900 hover:text-white"
          >
            <LayoutDashboard className="h-5 w-5" />
            Overview
          </Link>
          <Link
            href="/tenants"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-400 hover:bg-slate-900 hover:text-white"
          >
            <Building2 className="h-5 w-5" />
            Tenants
          </Link>
          <Link
            href="/staff"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-400 hover:bg-slate-900 hover:text-white"
          >
            <Users className="h-5 w-5" />
            Staff
          </Link>
          <Link
            href="/admin/vijesti"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-400 hover:bg-slate-900 hover:text-white"
          >
            <Newspaper className="h-5 w-5" />
            News
          </Link>
        </nav>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Placeholder header */}
        <header className="h-16 border-b border-[var(--border)] bg-[var(--surface)] flex items-center px-6">
          <h2 className="text-lg font-semibold">Admin Portal</h2>
        </header>

        {/* Main content area */}
        <main className="flex-1 overflow-auto p-6">
          <div className="mx-auto w-full max-w-6xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
