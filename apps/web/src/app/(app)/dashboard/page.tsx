import { auth } from "@/lib/auth"
import { prisma } from "@fiskai/db"
import { SignOutButton } from "./sign-out-button"

const LEGAL_FORM_LABELS: Record<string, string> = {
  OBRT_PAUSAL: "Pausalni obrt",
  OBRT_REAL: "Obrt",
  DOO: "d.o.o.",
  JDOO: "j.d.o.o.",
}

export default async function DashboardPage() {
  const session = await auth()

  // Session and company already validated in layout
  const companyMember = await prisma.companyMember.findFirst({
    where: { userId: session!.user!.id },
    include: { company: true },
  })

  const company = companyMember!.company

  return (
    <div className="p-8">
      <div className="max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            Dobrodosli, {session!.user!.name?.split(" ")[0] || "korisnice"}!
          </h1>
          <p className="text-white/60">
            Kontrolna ploca za {company.name}
          </p>
        </div>

        {/* Company Info Card */}
        <div className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 rounded-xl border border-cyan-500/20 p-6 mb-8">
          <h2 className="text-lg font-semibold text-white mb-4">Podaci o tvrtki</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <h3 className="text-sm font-medium text-white/50 mb-1">Naziv</h3>
              <p className="text-white">{company.name}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-white/50 mb-1">OIB</h3>
              <p className="text-white font-mono">{company.oib}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-white/50 mb-1">Pravni oblik</h3>
              <p className="text-white">{LEGAL_FORM_LABELS[company.legalForm] || company.legalForm}</p>
            </div>
            {company.address && (
              <div className="sm:col-span-2 lg:col-span-3">
                <h3 className="text-sm font-medium text-white/50 mb-1">Adresa</h3>
                <p className="text-white">
                  {company.address}
                  {company.zipCode && company.city && `, ${company.zipCode} ${company.city}`}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* User Info */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-8">
          <div className="bg-white/5 rounded-xl border border-white/10 p-6">
            <h3 className="text-sm font-medium text-white/50 mb-1">Email</h3>
            <p className="text-white">{session!.user!.email}</p>
          </div>
          <div className="bg-white/5 rounded-xl border border-white/10 p-6">
            <h3 className="text-sm font-medium text-white/50 mb-1">Uloga</h3>
            <p className="text-white">
              {companyMember!.role === "OWNER"
                ? "Vlasnik"
                : companyMember!.role === "ADMIN"
                  ? "Administrator"
                  : "Clan"}
            </p>
          </div>
          <div className="bg-white/5 rounded-xl border border-white/10 p-6">
            <h3 className="text-sm font-medium text-white/50 mb-1">Status</h3>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Aktivan
            </span>
          </div>
        </div>

        <div className="bg-white/5 rounded-xl border border-white/10 p-6 mb-8">
          <h2 className="text-lg font-semibold text-white mb-4">Sljedeci koraci</h2>
          <ul className="space-y-2 text-white/70">
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
              Konfigurirajte poslovne prostore
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
              Dodajte naplatne uredaje
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
              Kreirajte prvi racun
            </li>
          </ul>
        </div>

        <div className="pt-6 border-t border-white/10">
          <SignOutButton />
        </div>
      </div>
    </div>
  )
}
