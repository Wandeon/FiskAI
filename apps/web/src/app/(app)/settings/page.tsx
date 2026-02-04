import Link from "next/link"
import { FileText, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

export const metadata = {
  title: "Postavke | FiskAI",
  description: "Upravljajte postavkama aplikacije",
}

interface SettingsLinkProps {
  href: string
  icon: React.ElementType
  title: string
  description: string
}

function SettingsLink({ href, icon: Icon, title, description }: SettingsLinkProps) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-4 rounded-xl border border-white/10 bg-white/5 p-4",
        "transition-all hover:border-white/20 hover:bg-white/10"
      )}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-500/20">
        <Icon className="h-6 w-6 text-cyan-400" />
      </div>
      <div className="flex-1">
        <p className="font-medium text-white">{title}</p>
        <p className="text-sm text-white/60">{description}</p>
      </div>
      <ChevronRight className="h-5 w-5 text-white/40" />
    </Link>
  )
}

export default function SettingsPage() {
  return (
    <div className="p-6 lg:p-8">
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl lg:text-3xl font-bold text-white">Postavke</h1>
          <p className="mt-2 text-white/60">Upravljajte postavkama aplikacije</p>
        </div>

        {/* Settings Links */}
        <div className="space-y-4">
          <SettingsLink
            href="/settings/einvoice"
            icon={FileText}
            title="E-Racun"
            description="Konfigurirajte postavke za slanje e-racuna"
          />
        </div>
      </div>
    </div>
  )
}
