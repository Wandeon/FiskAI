import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { MarketingHomeClient } from "@/components/marketing/MarketingHomeClient"

export default async function MarketingHomePage() {
  const session = await auth()
  if (session?.user) {
    redirect("/dashboard")
  }

  return <MarketingHomeClient />
}
