import { drizzleDb } from "@/lib/db/drizzle"
import { newsPosts, newsCategories } from "@/lib/db/schema"
import { eq, desc, and, lte } from "drizzle-orm"

export async function getLatestPosts(limit = 4) {
  const posts = await drizzleDb
    .select({
      slug: newsPosts.slug,
      title: newsPosts.title,
      excerpt: newsPosts.excerpt,
      categoryName: newsCategories.nameHr,
      publishedAt: newsPosts.publishedAt,
    })
    .from(newsPosts)
    .leftJoin(newsCategories, eq(newsPosts.categoryId, newsCategories.id))
    .where(
      and(
        eq(newsPosts.status, "published"),
        eq(newsPosts.type, "individual"),
        lte(newsPosts.publishedAt, new Date())
      )
    )
    .orderBy(desc(newsPosts.publishedAt))
    .limit(limit)

  return posts
}
