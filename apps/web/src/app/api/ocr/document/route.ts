// apps/web/src/app/api/ocr/document/route.ts
import { NextRequest, NextResponse } from "next/server"
import { extractFromDocument, type DocumentOcrResult } from "@/lib/document-ocr"

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"]
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

export async function POST(request: NextRequest): Promise<NextResponse<DocumentOcrResult>> {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File | null

    if (!file) {
      return NextResponse.json(
        { success: false, error: "Datoteka nije priložena" },
        { status: 400 }
      )
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: "Nepodržani format. Koristite JPG, PNG ili PDF." },
        { status: 400 }
      )
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: "Datoteka je prevelika. Maksimalna veličina je 10MB." },
        { status: 400 }
      )
    }

    // PDF support is not yet implemented
    if (file.type === "application/pdf") {
      return NextResponse.json(
        { success: false, error: "PDF podrška dolazi uskoro. Koristite sliku dokumenta." },
        { status: 400 }
      )
    }

    // Convert to base64
    const bytes = await file.arrayBuffer()
    const base64 = Buffer.from(bytes).toString("base64")

    const result = await extractFromDocument(base64)
    return NextResponse.json(result)
  } catch {
    return NextResponse.json(
      { success: false, error: "Greška pri obradi dokumenta" },
      { status: 500 }
    )
  }
}
