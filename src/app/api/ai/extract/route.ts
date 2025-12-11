import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { extractFromImage } from '@/lib/ai/ocr'
import { extractReceipt } from '@/lib/ai/extract'
import { withApiLogging } from '@/lib/api-logging'
import { logger } from '@/lib/logger'
import { updateContext } from '@/lib/context'

export const POST = withApiLogging(async (req: NextRequest) => {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  updateContext({ userId: session.user?.id ?? undefined })

  try {
    const body = await req.json()
    const { image, text } = body

    if (image) {
      const base64Image = image.replace(/^data:image\/\w+;base64,/, '')
      const result = await extractFromImage(base64Image)
      return NextResponse.json(result)
    }

    if (text) {
      const result = await extractReceipt(text)
      return NextResponse.json(result)
    }

    return NextResponse.json({ error: 'No input provided' }, { status: 400 })
  } catch (error) {
    logger.error({ error }, 'AI extraction error')
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Extraction failed' },
      { status: 500 }
    )
  }
})
