import { redirect } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { auth } from "@/lib/auth"
import { prisma } from "@fiskai/db"
import { EInvoiceSettings } from "@/components/settings/EInvoiceSettings"

export const metadata = {
  title: "E-Racun Postavke | FiskAI",
  description: "Konfigurirajte postavke za slanje e-racuna",
}

export default async function EInvoiceSettingsPage() {
  const session = await auth()

  if (!session?.user?.id) {
    redirect("/auth")
  }

  // Get user's company
  const companyMember = await prisma.companyMember.findFirst({
    where: { userId: session.user.id },
    include: { company: true },
  })

  if (!companyMember?.company) {
    redirect("/onboarding")
  }

  const companyId = companyMember.company.id

  return (
    <div className="p-6 lg:p-8">
      <div className="mx-auto max-w-2xl">
        {/* Back Link */}
        <Link
          href="/settings"
          className="mb-6 inline-flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Natrag na postavke
        </Link>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl lg:text-3xl font-bold text-white">
            E-Racun Postavke
          </h1>
          <p className="mt-2 text-white/60">
            Konfigurirajte postavke za slanje e-racuna putem FINA-inog sustava
          </p>
        </div>

        {/* Settings Card */}
        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-6">
          <EInvoiceSettings companyId={companyId} />
        </div>
      </div>
    </div>
  )
}
