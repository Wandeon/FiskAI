import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@fiskai/db"
import { OnboardingWizard } from "@/components/onboarding"

export default async function OnboardingPage() {
  // Check authentication
  const session = await auth()

  if (!session?.user?.id) {
    redirect("/auth")
  }

  // Check if user already has a company with completed onboarding
  const existingCompany = await prisma.companyMember.findFirst({
    where: { userId: session.user.id },
    include: { company: true },
  })

  if (existingCompany?.company?.onboardingComplete) {
    redirect("/dashboard")
  }

  return (
    <div className="w-full max-w-3xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">
          Dobrodosli u FiskAI
        </h1>
        <p className="text-white/60">
          Postavimo vasu tvrtku u nekoliko jednostavnih koraka
        </p>
      </div>

      <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-6 sm:p-8">
        <OnboardingWizard />
      </div>
    </div>
  )
}
