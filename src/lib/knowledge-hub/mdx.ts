import fs from "fs"
import { promises as fsPromises } from "fs"
import path from "path"
import matter from "gray-matter"
import { GuideFrontmatter, ComparisonFrontmatter, BusinessType } from "./types"

const CONTENT_DIR = path.join(process.cwd(), "content")
const COMPARISONS_PATH = path.join(process.cwd(), "content", "usporedbe")

export interface GuideContent {
  frontmatter: GuideFrontmatter
  content: string
  slug: string
}

export interface ComparisonContent {
  frontmatter: ComparisonFrontmatter
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
 */
export async function getAllComparisonSlugs(): Promise<string[]> {
  try {
    const files = await fsPromises.readdir(COMPARISONS_PATH)
    return files.filter((file) => file.endsWith(".mdx")).map((file) => file.replace(/\.mdx$/, ""))
  } catch {
    return []
  }
}

/**
 * Get comparison content by slug
 */
export async function getComparisonBySlug(slug: string): Promise<ComparisonContent | null> {
  try {
    const filePath = path.join(COMPARISONS_PATH, `${slug}.mdx`)
    const fileContent = await fsPromises.readFile(filePath, "utf-8")
    const { data, content } = matter(fileContent)

    return {
      slug,
      frontmatter: data as ComparisonFrontmatter,
      content,
    }
  } catch {
    return null
  }
}

/**
 * Get all comparisons with frontmatter (for listing)
 */
export async function getAllComparisons(): Promise<ComparisonContent[]> {
  const slugs = await getAllComparisonSlugs()
  const comparisons = await Promise.all(slugs.map((slug) => getComparisonBySlug(slug)))
  return comparisons.filter((c): c is ComparisonContent => c !== null)
}
