import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { prisma } from "@fiskai/db"
import { DashboardShell } from "@/components/dashboard"

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Auth check
  const session = await auth()

  if (!session?.user?.id) {
    redirect("/auth")
  }

  // Company check via CompanyMember
  const companyMember = await prisma.companyMember.findFirst({
    where: { userId: session.user.id },
    include: { company: true },
  })

  // Redirect to onboarding if no company or onboarding not complete
  if (!companyMember?.company || !companyMember.company.onboardingComplete) {
    redirect("/onboarding")
  }

  const companyName = companyMember.company.name
  const userName = session.user.name || session.user.email || "Korisnik"

  return (
    <DashboardShell companyName={companyName} userName={userName}>
      {children}
    </DashboardShell>
  )
}
