import { Metadata } from "next"
import { auth } from "@/lib/auth"
import { getCurrentCompany } from "@/lib/auth-utils"
import { AssistantContainer } from "@/components/assistant-v2"

export const metadata: Metadata = {
  title: "Asistent | FiskAI",
  description: "AI asistent za regulatorne upite s podacima vaše tvrtke.",
}

export default async function AppAssistantPage() {
  const session = await auth()

  // Get current company for the user (may be null if not set up)
  let companyId: string | undefined
  if (session?.user?.id) {
    try {
      const company = await getCurrentCompany(session.user.id)
      companyId = company?.id
    } catch {
      // User may not have a company yet
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Regulatorni asistent</h1>
        <p className="text-muted-foreground">
          Postavite pitanje. Odgovor će koristiti podatke vaše tvrtke.
        </p>
      </header>

      <AssistantContainer surface="APP" companyId={companyId} />
    </div>
  )
}
