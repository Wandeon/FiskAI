import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"

export const metadata: Metadata = {
  title: "Postavljanje tvrtke | FiskAI",
  description: "Postavite svoju tvrtku u nekoliko jednostavnih koraka",
}

interface OnboardingGroupLayoutProps {
  children: React.ReactNode
}

/**
 * Minimal layout for all onboarding flows.
 * This route group is separate from (app) to avoid the dashboard sidebar.
 * Provides a focused, distraction-free experience for new user setup.
 */
export default async function OnboardingGroupLayout({ children }: OnboardingGroupLayoutProps) {
  // Still require authentication - onboarding is for logged-in users without a company
  const session = await auth()
  if (!session?.user) {
    redirect("/auth")
  }

  return (
    <div className="min-h-screen bg-surface">
      {/* Minimal header */}
      <header className="border-b border-border bg-surface px-4 py-4">
        <div className="mx-auto max-w-2xl">
          <span className="text-heading-sm font-semibold text-foreground">FiskAI</span>
          <span className="text-body-sm text-muted ml-2">Postavljanje</span>
        </div>
      </header>

      {/* Main content */}
      <main className="px-4 py-8 md:py-12">{children}</main>

      {/* Minimal footer */}
      <footer className="border-t border-border bg-surface px-4 py-4 mt-auto">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-body-xs text-muted">
            Vaši podaci se automatski spremaju tijekom unosa
          </p>
        </div>
      </footer>
    </div>
  )
}
