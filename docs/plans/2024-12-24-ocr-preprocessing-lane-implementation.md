# OCR Preprocessing Lane Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add Tesseract OCR with Croatian language support to process 87 scanned PDFs that currently fail with "No text extracted".

**Architecture:** OCR as preprocessing that creates text artifacts consumed by existing Extractor. Tesseract primary (fast, free), Vision fallback for low-confidence pages. Immutable artifacts stored separately from raw evidence.

**Tech Stack:** Tesseract 5.x, poppler-utils, node child_process, BullMQ, Prisma

---

## Task 1: Schema Migration - Add EvidenceArtifact Table

**Files:**

- Modify: `prisma/schema.prisma:1724-1745`

**Step 1: Add fields to Evidence model and create EvidenceArtifact**

Edit `prisma/schema.prisma`, find the Evidence model (line 1724) and update it:

```prisma
model Evidence {
  id                      String   @id @default(cuid())
  sourceId                String
  fetchedAt               DateTime @default(now())
  contentHash             String
  rawContent              String   @db.Text  // Full HTML/PDF text - IMMUTABLE
  contentType             String   @default("html")  // html, pdf, xml
  url                     String
  hasChanged              Boolean  @default(false)
  changeSummary           String?
  deletedAt               DateTime?

  // NEW: OCR support fields
  contentClass            String   @default("HTML")  // HTML, PDF_TEXT, PDF_SCANNED, DOC, XLSX, JSON
  ocrMetadata             Json?    // OCR processing metadata
  primaryTextArtifactId   String?  // Points to canonical text artifact for Extractor

  source             RegulatorySource     @relation(fields: [sourceId], references: [id], onDelete: Cascade)
  sourcePointers     SourcePointer[]
  agentRuns          AgentRun[]
  extractionRejected ExtractionRejected[]
  artifacts          EvidenceArtifact[]

  @@unique([url, contentHash])
  @@index([sourceId])
  @@index([fetchedAt])
  @@index([contentHash])
  @@index([contentClass])
}

model EvidenceArtifact {
  id          String   @id @default(cuid())
  evidenceId  String
  kind        String   // PDF_TEXT, OCR_TEXT, OCR_HOCR, HTML_CLEANED, TABLE_JSON
  content     String   @db.Text
  contentHash String
  pageMap     Json?    // Per-page metadata: [{page, confidence, method}]
  createdAt   DateTime @default(now())

  evidence    Evidence @relation(fields: [evidenceId], references: [id], onDelete: Cascade)

  @@index([evidenceId])
  @@index([kind])
  @@index([createdAt])
}
```

**Step 2: Generate and run migration**

```bash
cd /home/admin/FiskAI
npx prisma migrate dev --name add_ocr_support
```

Expected: Migration creates `EvidenceArtifact` table and adds columns to `Evidence`.

**Step 3: Verify migration**

```bash
npx prisma db pull --force
```

**Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat(schema): add EvidenceArtifact table and OCR fields to Evidence"
```

---

## Task 2: Update Dockerfile.worker with OCR Dependencies

**Files:**

- Modify: `Dockerfile.worker:28-35`

**Step 1: Add OCR packages to runner stage**

Edit `Dockerfile.worker`, after `FROM base AS runner` section, add OCR dependencies:

```dockerfile
# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# ========== OCR DEPENDENCIES ==========
RUN apk add --no-cache \
    tesseract-ocr \
    tesseract-ocr-data-hrv \
    tesseract-ocr-data-eng \
    poppler-utils \
    ghostscript
# tesseract-ocr-data-hrv = Croatian language pack
# poppler-utils = pdftoppm, pdfinfo for PDF→image rendering
# ghostscript = required by some PDF operations
# ======================================

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 worker
```

**Step 2: Verify Dockerfile syntax**

```bash
docker build -f Dockerfile.worker --target runner -t test-ocr-deps . 2>&1 | head -50
```

Expected: Build starts successfully (may take time, can cancel after deps install).

**Step 3: Commit**

```bash
git add Dockerfile.worker
git commit -m "feat(docker): add tesseract-ocr, poppler-utils to worker image"
```

---

## Task 3: Create PDF Renderer Utility

**Files:**

- Create: `src/lib/regulatory-truth/utils/pdf-renderer.ts`

**Step 1: Create the PDF renderer**

```typescript
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
    const { stdout: infoOut } = await execAsync(`pdfinfo ${tempPdf} 2>/dev/null | grep Pages`)
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
```

**Step 2: Commit**

```bash
git add src/lib/regulatory-truth/utils/pdf-renderer.ts
git commit -m "feat(ocr): add PDF renderer utility using pdftoppm"
```

---

## Task 4: Create Tesseract Wrapper

**Files:**

- Create: `src/lib/regulatory-truth/utils/tesseract.ts`

**Step 1: Create Tesseract CLI wrapper**

```typescript
// src/lib/regulatory-truth/utils/tesseract.ts
// Wrapper for Tesseract OCR CLI with TSV output parsing for confidence data

import { exec } from "child_process"
import { promisify } from "util"
import { writeFile, readFile, rm } from "fs/promises"
import { randomUUID } from "crypto"
import path from "path"

const execAsync = promisify(exec)

export interface TesseractResult {
  text: string
  confidence: number
  wordCount: number
}

/**
 * Run Tesseract OCR on an image buffer.
 * Returns extracted text and average confidence score.
 *
 * @param imageBuffer PNG image buffer
 * @param lang Language code(s), e.g., "hrv+eng"
 */
export async function runTesseract(
  imageBuffer: Buffer,
  lang: string = "hrv+eng"
): Promise<TesseractResult> {
  const id = randomUUID()
  const tempIn = path.join("/tmp", `ocr-in-${id}.png`)
  const tempOutBase = path.join("/tmp", `ocr-out-${id}`)
  const tempOutTsv = `${tempOutBase}.tsv`

  try {
    // Write image to temp file
    await writeFile(tempIn, imageBuffer)

    // Run Tesseract with TSV output for confidence data
    // --psm 1 = Automatic page segmentation with OSD
    // --oem 1 = LSTM neural network mode
    await execAsync(
      `tesseract "${tempIn}" "${tempOutBase}" -l ${lang} --psm 1 --oem 1 tsv 2>/dev/null`
    )

    // Parse TSV output
    const tsvContent = await readFile(tempOutTsv, "utf-8")
    const result = parseTesseractTsv(tsvContent)

    return result
  } catch (error) {
    console.error("[tesseract] OCR failed:", error)
    return { text: "", confidence: 0, wordCount: 0 }
  } finally {
    // Cleanup temp files
    await rm(tempIn, { force: true }).catch(() => {})
    await rm(tempOutTsv, { force: true }).catch(() => {})
    await rm(`${tempOutBase}.txt`, { force: true }).catch(() => {})
  }
}

/**
 * Parse Tesseract TSV output to extract text and confidence.
 *
 * TSV columns:
 * level, page_num, block_num, par_num, line_num, word_num, left, top, width, height, conf, text
 */
function parseTesseractTsv(tsv: string): TesseractResult {
  const lines = tsv.trim().split("\n").slice(1) // Skip header row
  const words: string[] = []
  let totalConf = 0
  let wordCount = 0

  for (const line of lines) {
    const cols = line.split("\t")
    if (cols.length < 12) continue

    const conf = parseInt(cols[10] || "-1")
    const text = cols[11] || ""

    // Only count actual words with valid confidence (conf > 0)
    // conf = -1 means empty/delimiter
    if (text.trim() && conf > 0) {
      words.push(text)
      totalConf += conf
      wordCount++
    }
  }

  // Reconstruct text with proper spacing
  // Group words by line (word_num resets per line)
  const fullText = reconstructText(lines)

  return {
    text: fullText,
    confidence: wordCount > 0 ? totalConf / wordCount : 0,
    wordCount,
  }
}

/**
 * Reconstruct readable text from TSV with proper line breaks.
 */
function reconstructText(lines: string[]): string {
  const result: string[] = []
  let currentLine = ""
  let lastLineNum = -1

  for (const line of lines) {
    const cols = line.split("\t")
    if (cols.length < 12) continue

    const lineNum = parseInt(cols[4] || "0")
    const text = cols[11] || ""
    const conf = parseInt(cols[10] || "-1")

    if (!text.trim() || conf < 0) continue

    if (lineNum !== lastLineNum && lastLineNum !== -1) {
      // New line - push current and start new
      if (currentLine.trim()) {
        result.push(currentLine.trim())
      }
      currentLine = text
    } else {
      // Same line - append with space
      currentLine += (currentLine ? " " : "") + text
    }
    lastLineNum = lineNum
  }

  // Don't forget last line
  if (currentLine.trim()) {
    result.push(currentLine.trim())
  }

  return result.join("\n")
}

/**
 * Check if Tesseract is available.
 */
export async function isTesseractAvailable(): Promise<boolean> {
  try {
    await execAsync("tesseract --version")
    return true
  } catch {
    return false
  }
}

/**
 * Get available Tesseract languages.
 */
export async function getTesseractLanguages(): Promise<string[]> {
  try {
    const { stdout } = await execAsync("tesseract --list-langs 2>/dev/null")
    return stdout
      .split("\n")
      .slice(1) // Skip header
      .filter((l) => l.trim())
  } catch {
    return []
  }
}
```

**Step 2: Commit**

```bash
git add src/lib/regulatory-truth/utils/tesseract.ts
git commit -m "feat(ocr): add Tesseract CLI wrapper with TSV parsing"
```

---

## Task 5: Create Vision OCR Fallback

**Files:**

- Create: `src/lib/regulatory-truth/utils/vision-ocr.ts`

**Step 1: Create Vision model OCR fallback**

```typescript
// src/lib/regulatory-truth/utils/vision-ocr.ts
// Vision model fallback for low-confidence OCR pages

export interface VisionOcrResult {
  text: string
  confidence: number
}

const VISION_MODEL = process.env.OLLAMA_VISION_MODEL || "llama3.2-vision"
const OLLAMA_ENDPOINT = process.env.OLLAMA_ENDPOINT || "http://localhost:11434"
const OLLAMA_API_KEY = process.env.OLLAMA_API_KEY

const VISION_PROMPT = `You are an OCR assistant. Extract ALL text from this scanned document image.

Rules:
- Output ONLY the extracted text, no explanations or commentary
- Preserve original formatting (paragraphs, lists, tables)
- For tables, use | separators between columns
- Keep Croatian characters exactly as shown (č, ć, đ, š, ž, Č, Ć, Đ, Š, Ž)
- If text is unclear or illegible, use [nejasno] placeholder
- Do not translate, interpret, or summarize - just transcribe exactly what you see
- Maintain the original reading order (top to bottom, left to right)

Extract the text now:`

/**
 * Run vision model OCR on an image.
 * Used as fallback when Tesseract confidence is low.
 */
export async function runVisionOcr(imageBuffer: Buffer): Promise<VisionOcrResult> {
  const base64Image = imageBuffer.toString("base64")

  try {
    const response = await fetch(`${OLLAMA_ENDPOINT}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(OLLAMA_API_KEY && { Authorization: `Bearer ${OLLAMA_API_KEY}` }),
      },
      body: JSON.stringify({
        model: VISION_MODEL,
        messages: [
          {
            role: "user",
            content: VISION_PROMPT,
            images: [base64Image],
          },
        ],
        stream: false,
        options: {
          temperature: 0.1, // Low temperature for deterministic output
          num_predict: 4096, // Allow long responses for full pages
        },
      }),
    })

    if (!response.ok) {
      throw new Error(`Vision API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    const text = data.message?.content?.trim() || ""

    // Estimate confidence based on response quality
    const confidence = estimateVisionConfidence(text)

    console.log(
      `[vision-ocr] Extracted ${text.length} chars, confidence: ${confidence.toFixed(1)}%`
    )

    return { text, confidence }
  } catch (error) {
    console.error("[vision-ocr] Failed:", error)
    throw error
  }
}

/**
 * Estimate confidence based on output quality heuristics.
 */
function estimateVisionConfidence(text: string): number {
  if (!text || text.length < 10) return 0

  let confidence = 85 // Base confidence for vision models

  // Count [nejasno] markers - each one reduces confidence
  const unclearCount = (text.match(/\[nejasno\]/gi) || []).length
  const totalWords = text.split(/\s+/).length
  const unclearRatio = unclearCount / Math.max(totalWords, 1)
  confidence -= unclearRatio * 40

  // Check for garbage characters (not letters, numbers, punctuation, Croatian)
  const validChars = text.match(/[\w\s\u0100-\u017Fčćđšž.,;:!?()\-"'\/\[\]|]/gi) || []
  const garbageRatio = 1 - validChars.length / text.length
  confidence -= garbageRatio * 50

  // Very short output is suspicious
  if (text.length < 50) confidence -= 20

  return Math.max(0, Math.min(100, confidence))
}

/**
 * Check if vision model is available.
 */
export async function isVisionModelAvailable(): Promise<boolean> {
  try {
    const response = await fetch(`${OLLAMA_ENDPOINT}/api/tags`, {
      headers: OLLAMA_API_KEY ? { Authorization: `Bearer ${OLLAMA_API_KEY}` } : {},
    })
    if (!response.ok) return false

    const data = await response.json()
    const models = data.models?.map((m: { name: string }) => m.name) || []
    return models.some((m: string) => m.includes("vision") || m.includes("llava"))
  } catch {
    return false
  }
}
```

**Step 2: Commit**

```bash
git add src/lib/regulatory-truth/utils/vision-ocr.ts
git commit -m "feat(ocr): add vision model fallback for low-confidence pages"
```

---

## Task 6: Create Main OCR Processor

**Files:**

- Create: `src/lib/regulatory-truth/utils/ocr-processor.ts`

**Step 1: Create the main OCR pipeline**

```typescript
// src/lib/regulatory-truth/utils/ocr-processor.ts
// Main OCR pipeline: Tesseract primary, Vision fallback

import { renderPdfToImages } from "./pdf-renderer"
import { runTesseract } from "./tesseract"
import { runVisionOcr } from "./vision-ocr"

// Thresholds
const TESSERACT_CONFIDENCE_THRESHOLD = 70 // Below this, try vision
const GARBAGE_TEXT_THRESHOLD = 0.2 // More than 20% non-letters = garbage
const MANUAL_REVIEW_THRESHOLD = 50 // Below this avg, flag for review

export interface PageResult {
  pageNum: number
  text: string
  confidence: number
  method: "tesseract" | "vision"
}

export interface OcrResult {
  text: string
  pages: PageResult[]
  avgConfidence: number
  method: "tesseract" | "vision" | "hybrid"
  processingMs: number
  failedPages: number[]
  needsManualReview: boolean
}

/**
 * Check if text looks like OCR garbage (too many non-letter chars).
 */
function isGarbageText(text: string): boolean {
  if (!text || text.length < 20) return true

  // Count letters (including Croatian)
  const letters = text.match(/[\p{L}]/gu) || []
  const letterRatio = letters.length / text.length

  return letterRatio < 1 - GARBAGE_TEXT_THRESHOLD
}

/**
 * Process a single page with Tesseract, falling back to Vision if needed.
 */
async function processPage(imageBuffer: Buffer, pageNum: number): Promise<PageResult> {
  // 1. Try Tesseract first (fast, free)
  console.log(`[ocr] Page ${pageNum}: Running Tesseract...`)
  const tesseractResult = await runTesseract(imageBuffer, "hrv+eng")

  const needsVision =
    tesseractResult.confidence < TESSERACT_CONFIDENCE_THRESHOLD ||
    isGarbageText(tesseractResult.text)

  if (!needsVision) {
    console.log(
      `[ocr] Page ${pageNum}: Tesseract OK (conf=${tesseractResult.confidence.toFixed(1)}%)`
    )
    return {
      pageNum,
      text: tesseractResult.text,
      confidence: tesseractResult.confidence,
      method: "tesseract",
    }
  }

  // 2. Vision fallback for low-quality pages
  console.log(
    `[ocr] Page ${pageNum}: Tesseract low quality (conf=${tesseractResult.confidence.toFixed(1)}%), trying vision...`
  )

  try {
    const visionResult = await runVisionOcr(imageBuffer)

    // Use vision if it's better than tesseract
    if (visionResult.confidence > tesseractResult.confidence) {
      console.log(
        `[ocr] Page ${pageNum}: Vision better (conf=${visionResult.confidence.toFixed(1)}%)`
      )
      return {
        pageNum,
        text: visionResult.text,
        confidence: visionResult.confidence,
        method: "vision",
      }
    }
  } catch (error) {
    console.warn(`[ocr] Page ${pageNum}: Vision failed, using Tesseract anyway`)
  }

  // 3. Keep tesseract result if vision fails or isn't better
  return {
    pageNum,
    text: tesseractResult.text,
    confidence: tesseractResult.confidence,
    method: "tesseract",
  }
}

/**
 * Process a scanned PDF through the OCR pipeline.
 *
 * @param pdfBuffer PDF file as buffer
 * @returns OCR result with text, metadata, and quality metrics
 */
export async function processScannedPdf(pdfBuffer: Buffer): Promise<OcrResult> {
  const startMs = Date.now()

  // 1. Render PDF to images
  console.log("[ocr] Rendering PDF to images...")
  const renderedPages = await renderPdfToImages(pdfBuffer, { dpi: 300 })
  console.log(`[ocr] Rendered ${renderedPages.length} pages`)

  // 2. Process each page
  const pages: PageResult[] = []
  for (const rendered of renderedPages) {
    const pageResult = await processPage(rendered.buffer, rendered.pageNum)
    pages.push(pageResult)
  }

  // 3. Combine results
  const combinedText = pages.map((p) => `[Stranica ${p.pageNum}]\n${p.text}`).join("\n\n")

  const avgConfidence =
    pages.length > 0 ? pages.reduce((sum, p) => sum + p.confidence, 0) / pages.length : 0

  const visionUsed = pages.some((p) => p.method === "vision")
  const failedPages = pages
    .filter((p) => p.confidence < MANUAL_REVIEW_THRESHOLD)
    .map((p) => p.pageNum)

  const processingMs = Date.now() - startMs

  console.log(
    `[ocr] Complete: ${pages.length} pages, avg conf=${avgConfidence.toFixed(1)}%, ` +
      `method=${visionUsed ? "hybrid" : "tesseract"}, time=${processingMs}ms`
  )

  return {
    text: combinedText,
    pages,
    avgConfidence,
    method: visionUsed ? "hybrid" : "tesseract",
    processingMs,
    failedPages,
    needsManualReview: avgConfidence < MANUAL_REVIEW_THRESHOLD,
  }
}

/**
 * Detect if a PDF is scanned (image-only) vs has text layer.
 * Uses character-per-page heuristic.
 */
export function isScannedPdf(extractedText: string, pageCount: number): boolean {
  const textLength = extractedText?.trim().length || 0
  const charsPerPage = textLength / Math.max(pageCount, 1)

  // Scanned PDFs typically have <50 chars/page (just whitespace, page numbers)
  return charsPerPage < 50
}
```

**Step 2: Commit**

```bash
git add src/lib/regulatory-truth/utils/ocr-processor.ts
git commit -m "feat(ocr): add main OCR processor with Tesseract + Vision fallback"
```

---

## Task 7: Create Content Provider

**Files:**

- Create: `src/lib/regulatory-truth/utils/content-provider.ts`

**Step 1: Create artifact-aware content provider**

```typescript
// src/lib/regulatory-truth/utils/content-provider.ts
// Provides extractable text content from Evidence, using artifacts when available

import { db } from "@/lib/db"

export interface ExtractableContent {
  text: string
  source: "artifact" | "raw"
  artifactKind?: string
  contentClass: string
}

/**
 * Get the canonical text content for extraction.
 * Priority: primaryTextArtifact > OCR_TEXT > PDF_TEXT > rawContent
 */
export async function getExtractableContent(evidenceId: string): Promise<ExtractableContent> {
  const evidence = await db.evidence.findUnique({
    where: { id: evidenceId },
    include: {
      artifacts: {
        orderBy: { createdAt: "desc" },
      },
    },
  })

  if (!evidence) {
    throw new Error(`Evidence not found: ${evidenceId}`)
  }

  // 1. Check primaryTextArtifactId (explicit pointer set by OCR worker)
  if (evidence.primaryTextArtifactId) {
    const primary = evidence.artifacts.find((a) => a.id === evidence.primaryTextArtifactId)
    if (primary) {
      return {
        text: primary.content,
        source: "artifact",
        artifactKind: primary.kind,
        contentClass: evidence.contentClass,
      }
    }
  }

  // 2. Fallback: find best artifact by kind priority
  const priority = ["OCR_TEXT", "PDF_TEXT", "HTML_CLEANED"]
  for (const kind of priority) {
    const artifact = evidence.artifacts.find((a) => a.kind === kind)
    if (artifact) {
      return {
        text: artifact.content,
        source: "artifact",
        artifactKind: artifact.kind,
        contentClass: evidence.contentClass,
      }
    }
  }

  // 3. Final fallback: rawContent (for HTML/JSON sources, or PDFs stored as text)
  return {
    text: evidence.rawContent,
    source: "raw",
    contentClass: evidence.contentClass,
  }
}

/**
 * Check if evidence is ready for extraction.
 * Scanned PDFs need OCR artifact first.
 */
export async function isReadyForExtraction(evidenceId: string): Promise<boolean> {
  const evidence = await db.evidence.findUnique({
    where: { id: evidenceId },
    include: {
      artifacts: {
        select: { kind: true },
      },
    },
  })

  if (!evidence) return false

  // Scanned PDFs need OCR artifact
  if (evidence.contentClass === "PDF_SCANNED") {
    return evidence.artifacts.some((a) => a.kind === "OCR_TEXT")
  }

  // Text PDFs need PDF_TEXT artifact
  if (evidence.contentClass === "PDF_TEXT") {
    return evidence.artifacts.some((a) => a.kind === "PDF_TEXT")
  }

  // HTML/JSON - rawContent is sufficient
  return true
}

/**
 * Get evidence with its primary text artifact loaded.
 */
export async function getEvidenceWithText(evidenceId: string) {
  return db.evidence.findUnique({
    where: { id: evidenceId },
    include: {
      source: true,
      artifacts: {
        where: {
          kind: { in: ["OCR_TEXT", "PDF_TEXT"] },
        },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  })
}
```

**Step 2: Commit**

```bash
git add src/lib/regulatory-truth/utils/content-provider.ts
git commit -m "feat(ocr): add content provider for artifact-aware text retrieval"
```

---

## Task 8: Add OCR Queue

**Files:**

- Modify: `src/lib/regulatory-truth/workers/queues.ts:29-50`

**Step 1: Add ocrQueue**

Edit `src/lib/regulatory-truth/workers/queues.ts`:

```typescript
// src/lib/regulatory-truth/workers/queues.ts
import { Queue, QueueEvents } from "bullmq"
import { redis } from "./redis"

const PREFIX = process.env.BULLMQ_PREFIX || "fiskai"
const RETENTION_MS = parseInt(process.env.JOB_RETENTION_HOURS || "24") * 60 * 60 * 1000

const defaultJobOptions = {
  attempts: 3,
  backoff: {
    type: "exponential" as const,
    delay: 10000, // 10s, 20s, 40s
  },
  removeOnComplete: { age: RETENTION_MS },
  removeOnFail: false, // Keep for inspection
}

// Queue factory
function createQueue(name: string, limiter?: { max: number; duration: number }) {
  return new Queue(name, {
    connection: redis,
    prefix: PREFIX,
    defaultJobOptions,
    ...(limiter && { limiter }),
  })
}

// Pipeline queues
export const sentinelQueue = createQueue("sentinel", { max: 5, duration: 60000 })
export const extractQueue = createQueue("extract", { max: 10, duration: 60000 })
export const ocrQueue = createQueue("ocr", { max: 2, duration: 60000 }) // NEW: OCR queue (CPU intensive)
export const composeQueue = createQueue("compose", { max: 5, duration: 60000 })
export const reviewQueue = createQueue("review", { max: 5, duration: 60000 })
export const arbiterQueue = createQueue("arbiter", { max: 3, duration: 60000 })
export const releaseQueue = createQueue("release", { max: 2, duration: 60000 })

// Control queues
export const scheduledQueue = createQueue("scheduled")
export const deadletterQueue = createQueue("deadletter")

// All queues for health checks
export const allQueues = {
  sentinel: sentinelQueue,
  extract: extractQueue,
  ocr: ocrQueue, // NEW
  compose: composeQueue,
  review: reviewQueue,
  arbiter: arbiterQueue,
  release: releaseQueue,
  scheduled: scheduledQueue,
  deadletter: deadletterQueue,
}

// Queue events for monitoring
export function createQueueEvents(queueName: string): QueueEvents {
  return new QueueEvents(queueName, { connection: redis, prefix: PREFIX })
}
```

**Step 2: Commit**

```bash
git add src/lib/regulatory-truth/workers/queues.ts
git commit -m "feat(ocr): add ocrQueue for OCR job processing"
```

---

## Task 9: Create OCR Worker

**Files:**

- Create: `src/lib/regulatory-truth/workers/ocr.worker.ts`

**Step 1: Create the OCR worker**

```typescript
// src/lib/regulatory-truth/workers/ocr.worker.ts
// OCR worker: processes scanned PDFs and creates text artifacts

import { Job } from "bullmq"
import { createWorker, setupGracefulShutdown, type JobResult } from "./base"
import { extractQueue } from "./queues"
import { jobsProcessed, jobDuration } from "./metrics"
import { db } from "@/lib/db"
import { processScannedPdf } from "../utils/ocr-processor"
import { hashContent } from "../utils/content-hash"
import { logWorkerStartup } from "./startup-log"

logWorkerStartup("ocr")

interface OcrJobData {
  evidenceId: string
  runId: string
}

async function processOcrJob(job: Job<OcrJobData>): Promise<JobResult> {
  const start = Date.now()
  const { evidenceId, runId } = job.data

  try {
    // 1. Get evidence
    const evidence = await db.evidence.findUnique({
      where: { id: evidenceId },
    })

    if (!evidence) {
      return { success: false, duration: 0, error: `Evidence not found: ${evidenceId}` }
    }

    if (evidence.contentClass !== "PDF_SCANNED") {
      return {
        success: false,
        duration: 0,
        error: `Evidence ${evidenceId} is not PDF_SCANNED (is ${evidence.contentClass})`,
      }
    }

    // Check if already processed
    const existingArtifact = await db.evidenceArtifact.findFirst({
      where: { evidenceId, kind: "OCR_TEXT" },
    })

    if (existingArtifact) {
      console.log(`[ocr] Evidence ${evidenceId} already has OCR_TEXT artifact, skipping`)
      return { success: true, duration: 0, data: { skipped: true } }
    }

    // 2. Decode PDF from base64
    console.log(`[ocr] Processing evidence ${evidenceId}...`)
    const pdfBuffer = Buffer.from(evidence.rawContent, "base64")

    // 3. Run OCR pipeline
    const ocrResult = await processScannedPdf(pdfBuffer)

    if (!ocrResult.text || ocrResult.text.trim().length === 0) {
      // Mark as failed with metadata
      await db.evidence.update({
        where: { id: evidenceId },
        data: {
          ocrMetadata: {
            error: "No text extracted",
            processingMs: ocrResult.processingMs,
            needsManualReview: true,
          },
        },
      })
      return { success: false, duration: Date.now() - start, error: "No text extracted from OCR" }
    }

    // 4. Create OCR artifact
    const artifact = await db.evidenceArtifact.create({
      data: {
        evidenceId,
        kind: "OCR_TEXT",
        content: ocrResult.text,
        contentHash: hashContent(ocrResult.text),
        pageMap: ocrResult.pages.map((p) => ({
          page: p.pageNum,
          confidence: p.confidence,
          method: p.method,
        })),
      },
    })

    // 5. Update evidence with OCR metadata
    await db.evidence.update({
      where: { id: evidenceId },
      data: {
        primaryTextArtifactId: artifact.id,
        ocrMetadata: {
          method: ocrResult.method,
          language: "hrv+eng",
          pages: ocrResult.pages.length,
          avgConfidence: ocrResult.avgConfidence,
          processingMs: ocrResult.processingMs,
          failedPages: ocrResult.failedPages,
          needsManualReview: ocrResult.needsManualReview,
          engineVersion: "tesseract 5.x",
        },
      },
    })

    // 6. Queue for extraction (now has text artifact)
    await extractQueue.add("extract", { evidenceId, runId })

    const duration = Date.now() - start
    jobsProcessed.inc({ worker: "ocr", status: "success", queue: "ocr" })
    jobDuration.observe({ worker: "ocr", queue: "ocr" }, duration / 1000)

    console.log(
      `[ocr] Completed ${evidenceId}: ${ocrResult.pages.length} pages, ` +
        `conf=${ocrResult.avgConfidence.toFixed(1)}%, time=${duration}ms`
    )

    return {
      success: true,
      duration,
      data: {
        pages: ocrResult.pages.length,
        avgConfidence: ocrResult.avgConfidence,
        method: ocrResult.method,
        textLength: ocrResult.text.length,
      },
    }
  } catch (error) {
    jobsProcessed.inc({ worker: "ocr", status: "failed", queue: "ocr" })

    // Store error in metadata
    await db.evidence
      .update({
        where: { id: evidenceId },
        data: {
          ocrMetadata: {
            error: error instanceof Error ? error.message : String(error),
            needsManualReview: true,
          },
        },
      })
      .catch(() => {})

    return {
      success: false,
      duration: Date.now() - start,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

// Create and start worker
// Concurrency 1 because OCR is CPU-intensive
const worker = createWorker<OcrJobData>("ocr", processOcrJob, {
  name: "ocr",
  concurrency: 1,
})

setupGracefulShutdown([worker])

console.log("[ocr] Worker started")
```

**Step 2: Commit**

```bash
git add src/lib/regulatory-truth/workers/ocr.worker.ts
git commit -m "feat(ocr): add OCR worker for processing scanned PDFs"
```

---

## Task 10: Update Sentinel to Detect and Route Scanned PDFs

**Files:**

- Modify: `src/lib/regulatory-truth/agents/sentinel.ts`

**Step 1: Read current sentinel implementation**

First, check current PDF handling in sentinel:

```bash
grep -n "parsePdf\|binaryType\|PDF" src/lib/regulatory-truth/agents/sentinel.ts | head -20
```

**Step 2: Update sentinel to detect scanned PDFs and route to OCR queue**

The sentinel needs these changes:

1. After parsing PDF, check if it's scanned (charsPerPage < 50)
2. If scanned: store as base64, set contentClass = PDF_SCANNED, queue to OCR (not extract)
3. If has text: create PDF_TEXT artifact, set contentClass = PDF_TEXT, queue to extract

Add after the binary parsing section in `sentinel.ts`:

```typescript
// Import at top
import { ocrQueue } from "../workers/queues"
import { isScannedPdf } from "../utils/ocr-processor"
import { hashContent } from "../utils/content-hash"

// In the PDF handling section, replace the current logic with:

if (binaryType === "pdf") {
  const arrayBuffer = await response.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)
  const parsed = await parseBinaryContent(buffer, binaryType)

  const pageCount = (parsed.metadata?.pages as number) || 1
  const isScanned = isScannedPdf(parsed.text, pageCount)

  if (isScanned) {
    // Scanned PDF - store as base64, queue for OCR
    console.log(`[sentinel] Scanned PDF detected (${pageCount} pages, ${parsed.text.length} chars)`)

    const evidence = await db.evidence.create({
      data: {
        sourceId: source.id,
        url: item.url,
        rawContent: buffer.toString("base64"), // Store PDF bytes
        contentHash: hashContent(buffer),
        contentType: "pdf",
        contentClass: "PDF_SCANNED",
      },
    })

    await db.discoveredItem.update({
      where: { id: item.id },
      data: {
        status: "FETCHED",
        processedAt: new Date(),
        evidenceId: evidence.id,
        contentHash: evidence.contentHash,
      },
    })

    // Queue for OCR, NOT extract
    await ocrQueue.add("ocr", { evidenceId: evidence.id, runId })
    console.log(`[sentinel] Queued ${evidence.id} for OCR`)
  } else {
    // PDF with text layer - create artifact and queue for extract
    console.log(`[sentinel] Text PDF detected (${pageCount} pages, ${parsed.text.length} chars)`)

    const evidence = await db.evidence.create({
      data: {
        sourceId: source.id,
        url: item.url,
        rawContent: buffer.toString("base64"), // Store PDF bytes
        contentHash: hashContent(buffer),
        contentType: "pdf",
        contentClass: "PDF_TEXT",
      },
    })

    // Create PDF_TEXT artifact
    const artifact = await db.evidenceArtifact.create({
      data: {
        evidenceId: evidence.id,
        kind: "PDF_TEXT",
        content: parsed.text,
        contentHash: hashContent(parsed.text),
      },
    })

    // Set primary text artifact
    await db.evidence.update({
      where: { id: evidence.id },
      data: { primaryTextArtifactId: artifact.id },
    })

    await db.discoveredItem.update({
      where: { id: item.id },
      data: {
        status: "FETCHED",
        processedAt: new Date(),
        evidenceId: evidence.id,
        contentHash: evidence.contentHash,
      },
    })

    // Queue for extraction
    await extractQueue.add("extract", { evidenceId: evidence.id, runId })
    console.log(`[sentinel] Queued ${evidence.id} for extraction`)
  }

  continue // Move to next item
}
```

**Step 3: Commit**

```bash
git add src/lib/regulatory-truth/agents/sentinel.ts
git commit -m "feat(ocr): update sentinel to detect scanned PDFs and route to OCR queue"
```

---

## Task 11: Update Continuous Drainer with OCR Stage

**Files:**

- Modify: `src/lib/regulatory-truth/workers/continuous-drainer.worker.ts`

**Step 1: Add OCR drain stage**

Add after imports:

```typescript
import { ocrQueue } from "./queues"
```

Add new function for draining pending OCR:

```typescript
/**
 * Check for PDF_SCANNED evidence without OCR artifacts and queue OCR jobs
 */
async function drainPendingOcr(): Promise<number> {
  // Find scanned PDFs without OCR artifacts
  const pending = await db.evidence.findMany({
    where: {
      contentClass: "PDF_SCANNED",
      primaryTextArtifactId: null,
      // Exclude those with error in ocrMetadata
      OR: [
        { ocrMetadata: { equals: Prisma.DbNull } },
        { ocrMetadata: { path: ["error"], equals: Prisma.DbNull } },
      ],
    },
    select: { id: true },
    take: 10,
  })

  if (pending.length === 0) return 0

  const runId = `drain-ocr-${Date.now()}`
  await ocrQueue.addBulk(
    pending.map((e) => ({
      name: "ocr",
      data: { evidenceId: e.id, runId },
    }))
  )

  console.log(`[drainer] Queued ${pending.length} OCR jobs`)
  return pending.length
}
```

Add `drainPendingOcr()` call in `runDrainCycle()` after Stage 1 and before Stage 2:

```typescript
// Stage 1.5: Queue scanned PDFs for OCR
try {
  const ocrQueued = await drainPendingOcr()
  if (ocrQueued > 0) {
    workDone = true
    console.log(`[drainer] Stage 1.5: Queued ${ocrQueued} OCR jobs`)
  }
} catch (error) {
  console.error("[drainer] Stage 1.5 error:", error instanceof Error ? error.message : error)
}
```

Update stats interface:

```typescript
interface DrainerState {
  // ... existing ...
  stats: {
    // ... existing ...
    ocrJobsQueued: number // NEW
  }
}
```

**Step 2: Commit**

```bash
git add src/lib/regulatory-truth/workers/continuous-drainer.worker.ts
git commit -m "feat(ocr): add OCR drain stage to continuous drainer"
```

---

## Task 12: Update Extractor to Use Content Provider

**Files:**

- Modify: `src/lib/regulatory-truth/agents/extractor.ts`
- Modify: `src/lib/regulatory-truth/workers/extractor.worker.ts`

**Step 1: Update extractor agent**

Add import at top of `src/lib/regulatory-truth/agents/extractor.ts`:

```typescript
import { getExtractableContent } from "../utils/content-provider"
```

Replace the line that reads `evidence.rawContent` with:

```typescript
// OLD: const content = evidence.rawContent
// NEW:
const { text: content, source, artifactKind } = await getExtractableContent(evidenceId)
console.log(
  `[extractor] Using ${source}${artifactKind ? `:${artifactKind}` : ""} for ${evidenceId}`
)
```

**Step 2: Update extractor worker**

Add import at top of `src/lib/regulatory-truth/workers/extractor.worker.ts`:

```typescript
import { isReadyForExtraction } from "../utils/content-provider"
```

Add readiness check at the start of `processExtractJob`:

```typescript
async function processExtractJob(job: Job<ExtractJobData>): Promise<JobResult> {
  const start = Date.now()
  const { evidenceId, runId } = job.data

  // Check if evidence is ready for extraction (has required artifacts)
  const ready = await isReadyForExtraction(evidenceId)
  if (!ready) {
    // Re-queue with delay - OCR might still be processing
    console.log(`[extractor] Evidence ${evidenceId} not ready, requeueing...`)
    await extractQueue.add("extract", { evidenceId, runId }, { delay: 30000 })
    return {
      success: true,
      duration: 0,
      data: { requeued: true, reason: "awaiting_artifact" },
    }
  }

  // ... rest of existing code ...
}
```

**Step 3: Commit**

```bash
git add src/lib/regulatory-truth/agents/extractor.ts src/lib/regulatory-truth/workers/extractor.worker.ts
git commit -m "feat(ocr): update extractor to use content provider for artifact-aware text"
```

---

## Task 13: Add OCR Worker to Docker Compose

**Files:**

- Modify: `docker-compose.workers.yml`

**Step 1: Add worker-ocr service**

Add after worker-extractor section:

```yaml
worker-ocr:
  build:
    context: .
    dockerfile: Dockerfile.worker
  container_name: fiskai-worker-ocr
  restart: unless-stopped
  command: ["npx", "tsx", "src/lib/regulatory-truth/workers/ocr.worker.ts"]
  environment:
    - NODE_ENV=production
    - REDIS_URL=redis://fiskai-redis:6379
    - DATABASE_URL=${DATABASE_URL}
    - OLLAMA_ENDPOINT=${OLLAMA_ENDPOINT}
    - OLLAMA_API_KEY=${OLLAMA_API_KEY}
    - OLLAMA_VISION_MODEL=${OLLAMA_VISION_MODEL:-llama3.2-vision}
    - WORKER_TYPE=ocr
    - WORKER_CONCURRENCY=1
  depends_on:
    redis:
      condition: service_healthy
  networks:
    - default
    - coolify
```

**Step 2: Commit**

```bash
git add docker-compose.workers.yml
git commit -m "feat(ocr): add worker-ocr service to docker-compose"
```

---

## Task 14: Update Queue Status Script

**Files:**

- Modify: `scripts/queue-status.ts`

**Step 1: Add ocr queue to monitoring**

Update the QUEUES array:

```typescript
const QUEUES = [
  "sentinel",
  "extract",
  "ocr",
  "compose",
  "review",
  "arbiter",
  "release",
  "scheduled",
]
```

**Step 2: Commit**

```bash
git add scripts/queue-status.ts
git commit -m "feat(ocr): add ocr queue to monitoring script"
```

---

## Task 15: Backfill Failed Scanned PDFs

**Files:**

- None (SQL commands)

**Step 1: Mark existing failed PDFs for reprocessing**

```bash
docker exec fiskai-db psql -U fiskai -d fiskai -c "
-- First, check how many we have
SELECT COUNT(*) as failed_scanned_pdfs
FROM \"DiscoveredItem\"
WHERE status = 'FAILED'
  AND \"errorMessage\" = 'No text extracted from pdf file';
"
```

**Step 2: Reset them to PENDING**

```bash
docker exec fiskai-db psql -U fiskai -d fiskai -c "
UPDATE \"DiscoveredItem\"
SET status = 'PENDING',
    \"retryCount\" = 0,
    \"errorMessage\" = NULL
WHERE status = 'FAILED'
  AND \"errorMessage\" = 'No text extracted from pdf file';
"
```

Expected: `UPDATE 87` (or similar count)

**Step 3: Verify**

```bash
docker exec fiskai-db psql -U fiskai -d fiskai -c "
SELECT status, COUNT(*)
FROM \"DiscoveredItem\"
GROUP BY status
ORDER BY status;
"
```

---

## Task 16: Build and Deploy

**Step 1: Build new worker images**

```bash
cd /home/admin/FiskAI
docker compose -f docker-compose.workers.yml build --no-cache worker-ocr worker-continuous-drainer
```

**Step 2: Deploy updated workers**

```bash
docker compose -f docker-compose.workers.yml up -d worker-ocr worker-continuous-drainer
```

**Step 3: Check logs**

```bash
docker logs -f fiskai-worker-ocr
```

Expected: `[ocr] Worker started` and processing logs

**Step 4: Verify pipeline flow**

```bash
npx tsx scripts/queue-status.ts
```

---

## Verification Checklist

- [ ] Schema migration applied successfully
- [ ] Dockerfile builds with Tesseract + poppler
- [ ] OCR worker starts and connects to Redis
- [ ] Scanned PDFs route to OCR queue (not extract)
- [ ] OCR creates EvidenceArtifact records
- [ ] Extractor reads from artifacts via content provider
- [ ] 87 failed PDFs reprocessed successfully
- [ ] Vision fallback triggers for low-confidence pages
- [ ] No regression on HTML/JSON/text-PDF sources
