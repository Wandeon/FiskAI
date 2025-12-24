// src/lib/regulatory-truth/utils/binary-parser.ts
// Parses binary files (PDF, DOCX, DOC, XLSX) to extract text content

import pdf from "pdf-parse"
import mammoth from "mammoth"
import * as XLSX from "xlsx"

export type BinaryContentType = "pdf" | "docx" | "doc" | "xlsx" | "xls" | "unknown"

/**
 * Detect content type from URL or content-type header
 */
export function detectBinaryType(url: string, contentType?: string): BinaryContentType {
  const lowerUrl = url.toLowerCase()

  // Check URL extension first
  if (lowerUrl.endsWith(".pdf")) return "pdf"
  if (lowerUrl.endsWith(".docx")) return "docx"
  if (lowerUrl.endsWith(".doc")) return "doc"
  if (lowerUrl.endsWith(".xlsx")) return "xlsx"
  if (lowerUrl.endsWith(".xls")) return "xls"

  // Check content-type header
  if (contentType) {
    const lowerCt = contentType.toLowerCase()
    if (lowerCt.includes("application/pdf")) return "pdf"
    if (lowerCt.includes("application/vnd.openxmlformats-officedocument.wordprocessingml"))
      return "docx"
    if (lowerCt.includes("application/msword")) return "doc"
    if (lowerCt.includes("application/vnd.openxmlformats-officedocument.spreadsheetml"))
      return "xlsx"
    if (lowerCt.includes("application/vnd.ms-excel")) return "xls"
  }

  return "unknown"
}

/**
 * Check if URL points to a binary file
 */
export function isBinaryUrl(url: string): boolean {
  const type = detectBinaryType(url)
  return type !== "unknown"
}

/**
 * Parse binary content and extract text
 */
export async function parseBinaryContent(
  buffer: Buffer,
  type: BinaryContentType
): Promise<{ text: string; metadata?: Record<string, unknown> }> {
  switch (type) {
    case "pdf":
      return parsePdf(buffer)
    case "docx":
      return parseDocx(buffer)
    case "doc":
      // Old DOC format - mammoth can sometimes handle it
      return parseDocx(buffer)
    case "xlsx":
    case "xls":
      return parseExcel(buffer)
    default:
      return { text: "", metadata: { skipped: true, reason: "Unknown binary type" } }
  }
}

/**
 * Parse PDF and extract text
 */
async function parsePdf(
  buffer: Buffer
): Promise<{ text: string; metadata?: Record<string, unknown> }> {
  try {
    const data = await pdf(buffer)
    return {
      text: data.text,
      metadata: {
        pages: data.numpages,
        info: data.info,
      },
    }
  } catch (error) {
    console.error("[binary-parser] PDF parse error:", error)
    return { text: "", metadata: { error: String(error) } }
  }
}

/**
 * Parse DOCX/DOC and extract text
 */
async function parseDocx(
  buffer: Buffer
): Promise<{ text: string; metadata?: Record<string, unknown> }> {
  try {
    const result = await mammoth.extractRawText({ buffer })
    return {
      text: result.value,
      metadata: {
        messages: result.messages,
      },
    }
  } catch (error) {
    console.error("[binary-parser] DOCX parse error:", error)
    return { text: "", metadata: { error: String(error) } }
  }
}

/**
 * Parse Excel (XLS/XLSX) and extract text
 */
async function parseExcel(
  buffer: Buffer
): Promise<{ text: string; metadata?: Record<string, unknown> }> {
  try {
    const workbook = XLSX.read(buffer, { type: "buffer" })
    const sheets: string[] = []
    const sheetData: Record<string, string[][]> = {}

    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName]
      // Convert to array of arrays
      const data = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, defval: "" })
      sheetData[sheetName] = data as string[][]

      // Convert to readable text
      const lines: string[] = [`=== Sheet: ${sheetName} ===`]
      for (const row of data as string[][]) {
        const rowText = row.filter((cell) => cell !== "").join(" | ")
        if (rowText.trim()) {
          lines.push(rowText)
        }
      }
      sheets.push(lines.join("\n"))
    }

    return {
      text: sheets.join("\n\n"),
      metadata: {
        sheetNames: workbook.SheetNames,
        sheetCount: workbook.SheetNames.length,
      },
    }
  } catch (error) {
    console.error("[binary-parser] Excel parse error:", error)
    return { text: "", metadata: { error: String(error) } }
  }
}

/**
 * Fetch and parse a binary URL
 */
export async function fetchAndParseBinary(
  url: string,
  fetchFn: (url: string) => Promise<Response>
): Promise<{
  success: boolean
  text: string
  contentType: BinaryContentType
  metadata?: Record<string, unknown>
  error?: string
}> {
  try {
    const response = await fetchFn(url)
    if (!response.ok) {
      return {
        success: false,
        text: "",
        contentType: "unknown",
        error: `HTTP ${response.status}: ${response.statusText}`,
      }
    }

    const contentTypeHeader = response.headers.get("content-type") || ""
    const type = detectBinaryType(url, contentTypeHeader)

    if (type === "unknown") {
      return {
        success: false,
        text: "",
        contentType: "unknown",
        error: "Not a recognized binary format",
      }
    }

    const arrayBuffer = await response.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const { text, metadata } = await parseBinaryContent(buffer, type)

    if (!text || text.trim().length === 0) {
      return {
        success: false,
        text: "",
        contentType: type,
        metadata,
        error: "No text extracted from binary file",
      }
    }

    return {
      success: true,
      text,
      contentType: type,
      metadata,
    }
  } catch (error) {
    return {
      success: false,
      text: "",
      contentType: "unknown",
      error: String(error),
    }
  }
}
