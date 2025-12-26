import { MarketingHomeClient } from "@/components/marketing/MarketingHomeClient"
import { getLatestPosts } from "@/lib/news/queries"

export default async function MarketingHomePage() {
  const latestNews = await getLatestPosts(4)

  return <MarketingHomeClient latestNews={latestNews} />
}
