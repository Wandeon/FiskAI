import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { MarketingHomeClient } from "@/components/marketing/MarketingHomeClient"
import { getLatestPosts } from "@/lib/news/queries"

export default async function MarketingHomePage() {
  const session = await auth()
  if (session?.user) {
    redirect("/dashboard")
  }

  const latestNews = await getLatestPosts(4)

  return <MarketingHomeClient latestNews={latestNews} />
}
