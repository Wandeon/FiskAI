import fs from "fs"
import path from "path"
import matter from "gray-matter"
import { GuideFrontmatter, BusinessType } from "./types"

const CONTENT_DIR = path.join(process.cwd(), "content")

export interface GuideContent {
  frontmatter: GuideFrontmatter
  content: string
  slug: string
}

export interface ComparisonContent {
  frontmatter: GuideFrontmatter
  content: string
  slug: string
}

/**
 * Get all guide slugs for static generation
 */
export function getGuideSlugs(): string[] {
  const guidesDir = path.join(CONTENT_DIR, "vodici")
  if (!fs.existsSync(guidesDir)) return []

  return fs
    .readdirSync(guidesDir)
    .filter((file) => file.endsWith(".mdx"))
    .map((file) => file.replace(/\.mdx$/, ""))
}

/**
 * Get guide content by slug
 */
export function getGuideBySlug(slug: string): GuideContent | null {
  const filePath = path.join(CONTENT_DIR, "vodici", `${slug}.mdx`)

  if (!fs.existsSync(filePath)) return null

  const fileContent = fs.readFileSync(filePath, "utf-8")
  const { data, content } = matter(fileContent)

  return {
    frontmatter: data as GuideFrontmatter,
    content,
    slug,
  }
}

/**
 * Get all guides with frontmatter (for listing)
 */
export function getAllGuides(): GuideContent[] {
  const slugs = getGuideSlugs()
  return slugs.map(getGuideBySlug).filter((guide): guide is GuideContent => guide !== null)
}

/**
 * Get all comparison slugs for static generation
 * TODO: Implement in Task 1.2
 */
export async function getAllComparisonSlugs(): Promise<string[]> {
  return []
}

/**
 * Get comparison content by slug
 * TODO: Implement in Task 1.2
 */
export async function getComparisonBySlug(slug: string): Promise<ComparisonContent | null> {
  return null
}
