import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { suggestCategory, suggestCategoryByVendor } from '@/lib/ai/categorize'
import { db } from '@/lib/db'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { description, vendor } = body

    // Get company from companyUser relation
    const companyUser = await db.companyUser.findFirst({
      where: { userId: session.user.id, isDefault: true },
      include: { company: true }
    })

    if (!companyUser?.company) {
      return NextResponse.json(
        { error: 'Company not found' },
        { status: 404 }
      )
    }

    const companyId = companyUser.company.id

    const suggestions = []

    // First, try to find category based on vendor history
    if (vendor) {
      const vendorSuggestion = await suggestCategoryByVendor(vendor, companyId)
      if (vendorSuggestion) {
        suggestions.push(vendorSuggestion)
      }
    }

    // Then, add keyword-based suggestions from description
    if (description) {
      const descSuggestions = await suggestCategory(description, companyId)
      suggestions.push(...descSuggestions)
    }

    // Remove duplicates and sort by confidence
    const uniqueSuggestions = suggestions
      .filter(
        (suggestion, index, self) =>
          index === self.findIndex((s) => s.categoryId === suggestion.categoryId)
      )
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 3)

    return NextResponse.json({ suggestions: uniqueSuggestions })
  } catch (error) {
    console.error('Category suggestion error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Suggestion failed' },
      { status: 500 }
    )
  }
}
