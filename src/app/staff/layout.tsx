import { ReactNode } from "react"
import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { Header } from "@/components/layout/header"
import { DashboardBackground } from "@/components/layout/DashboardBackground"

export default async function StaffLayout({ children }: { children: ReactNode }) {
  const session = await auth()

  if (!session?.user) {
    redirect("/login")
  }

  // Require STAFF or ADMIN role (admins can access staff area)
  if (session.user.systemRole !== "STAFF" && session.user.systemRole !== "ADMIN") {
    redirect("/dashboard")
  }

  return (
    <div className="flex min-h-screen flex-col relative">
      <DashboardBackground />
      <Header />
      <main className="flex-1 p-4 md:p-6">
        <div className="mx-auto w-full max-w-7xl">{children}</div>
      </main>
    </div>
  )
}
