// src/lib/regulatory-truth/utils/pdf-renderer.ts
// Renders PDF pages to images using poppler-utils (pdftoppm)

import { exec } from "child_process"
import { promisify } from "util"
import { readdir, readFile, writeFile, mkdir, rm } from "fs/promises"
import { randomUUID } from "crypto"
import path from "path"

const execAsync = promisify(exec)

export interface RenderOptions {
  dpi?: number // Default 300
}

export interface RenderedPage {
  pageNum: number
  buffer: Buffer
  width?: number
  height?: number
}

/**
 * Render PDF buffer to PNG images, one per page.
 * Uses pdftoppm from poppler-utils.
 */
export async function renderPdfToImages(
  pdfBuffer: Buffer,
  options: RenderOptions = {}
): Promise<RenderedPage[]> {
  const dpi = options.dpi || 300
  const tempDir = path.join("/tmp", `pdf-render-${randomUUID()}`)
  const tempPdf = path.join(tempDir, "input.pdf")

  try {
    // Create temp directory
    await mkdir(tempDir, { recursive: true })

    // Write PDF to temp file
    await writeFile(tempPdf, pdfBuffer)

    // Get page count first
    const { stdout: infoOut } = await execAsync(`pdfinfo "${tempPdf}" 2>/dev/null | grep Pages`)
    const pageCountMatch = infoOut.match(/Pages:\s+(\d+)/)
    const pageCount = pageCountMatch ? parseInt(pageCountMatch[1]) : 1

    console.log(`[pdf-renderer] Rendering ${pageCount} pages at ${dpi} DPI`)

    // Render all pages to PNG
    await execAsync(`pdftoppm -png -r ${dpi} "${tempPdf}" "${tempDir}/page"`)

    // Read all generated page images
    const files = await readdir(tempDir)
    const pageFiles = files
      .filter((f) => f.startsWith("page-") && f.endsWith(".png"))
      .sort((a, b) => {
        // Sort by page number: page-01.png, page-02.png, etc.
        const numA = parseInt(a.match(/page-(\d+)/)?.[1] || "0")
        const numB = parseInt(b.match(/page-(\d+)/)?.[1] || "0")
        return numA - numB
      })

    const pages: RenderedPage[] = []
    for (let i = 0; i < pageFiles.length; i++) {
      const imgBuffer = await readFile(path.join(tempDir, pageFiles[i]))
      pages.push({
        pageNum: i + 1,
        buffer: imgBuffer,
      })
    }

    console.log(`[pdf-renderer] Rendered ${pages.length} pages`)
    return pages
  } finally {
    // Cleanup temp directory
    await rm(tempDir, { recursive: true, force: true }).catch(() => {})
  }
}

/**
 * Get PDF page count without rendering.
 */
export async function getPdfPageCount(pdfBuffer: Buffer): Promise<number> {
  const tempFile = path.join("/tmp", `pdf-info-${randomUUID()}.pdf`)

  try {
    await writeFile(tempFile, pdfBuffer)
    const { stdout } = await execAsync(`pdfinfo "${tempFile}" 2>/dev/null | grep Pages`)
    const match = stdout.match(/Pages:\s+(\d+)/)
    return match ? parseInt(match[1]) : 1
  } finally {
    await rm(tempFile, { force: true }).catch(() => {})
  }
}
