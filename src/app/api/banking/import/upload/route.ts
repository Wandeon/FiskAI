import { NextResponse } from "next/server"
import { promises as fs } from "fs"
import path from "path"
import { createHash } from "crypto"
import { requireAuth, requireCompany } from "@/lib/auth-utils"
import { db } from "@/lib/db"
import { setTenantContext } from "@/lib/prisma-extensions"
import { Prisma } from "@prisma/client"
import { bankingLogger } from "@/lib/logger"
import { scanBuffer } from "@/lib/security/virus-scanner"

const MAX_UPLOAD_BYTES = 20 * 1024 * 1024 // 20MB safety cap
const ALLOWED_EXTENSIONS = ["pdf", "xml"]

export async function POST(request: Request) {
  let company, userId

  try {
    const user = await requireAuth()
    userId = user.id!
    const userCompany = await requireCompany(userId)
    if (!userCompany) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 })
    }
    company = userCompany
  } catch (authError) {
    bankingLogger.warn({ error: authError }, "Bank import upload authentication failed")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  setTenantContext({
    companyId: company.id,
    userId: userId,
  })

  const formData = await request.formData()
  const file = formData.get("file")
  const accountId = formData.get("accountId") as string | null
  if (!(file instanceof Blob) || !accountId) {
    return NextResponse.json({ error: "Missing file or account" }, { status: 400 })
  }

  const account = await db.bankAccount.findUnique({ where: { id: accountId } })
  if (!account || account.companyId !== company.id) {
    return NextResponse.json({ error: "Invalid bank account" }, { status: 400 })
  }

  const fileName = (file as File).name || "upload"
  const extension = fileName.split(".").pop()?.toLowerCase() || ""
  if (!ALLOWED_EXTENSIONS.includes(extension)) {
    return NextResponse.json({ error: "Only PDF or XML files are supported" }, { status: 400 })
  }

  const arrayBuffer = await file.arrayBuffer()
  if (arrayBuffer.byteLength === 0) {
    return NextResponse.json({ error: "Empty file" }, { status: 400 })
  }
  if (arrayBuffer.byteLength > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: "File too large (max 20MB)" }, { status: 413 })
  }

  const buffer = Buffer.from(arrayBuffer)
  const checksum = createHash("sha256").update(buffer).digest("hex")

  // Scan for viruses before processing
  const scanResult = await scanBuffer(buffer, fileName)
  if (scanResult.isInfected) {
    bankingLogger.warn(
      { viruses: scanResult.viruses, fileName, accountId },
      "Infected bank statement blocked"
    )
    return NextResponse.json(
      {
        error: scanResult.error
          ? "Sigurnosno skeniranje nije uspjelo. Pokušajte ponovno kasnije."
          : "Datoteka je odbijena sigurnosnim skeniranjem.",
        viruses: scanResult.viruses,
      },
      { status: 400 }
    )
  }

  const storageDir = path.join(process.cwd(), "uploads", "bank-statements")
  await fs.mkdir(storageDir, { recursive: true })
  const storedFileName = `${checksum}.${extension}`
  const storagePath = path.join(storageDir, storedFileName)

  // Detect duplicate for this bank account by checksum
  const existingJob = await db.importJob.findFirst({
    where: {
      bankAccountId: accountId,
      fileChecksum: checksum,
    },
  })

  if (existingJob) {
    return NextResponse.json(
      {
        success: true,
        deduplicated: true,
        existingJobId: existingJob.id,
        message: "Izvod s istim sadržajem već postoji. Koristimo postojeći uvoz.",
      },
      { status: 200 }
    )
  }

  await fs.writeFile(storagePath, buffer)

  try {
    const job = await db.importJob.create({
      data: {
        companyId: company.id,
        userId: userId,
        bankAccountId: accountId,
        fileChecksum: checksum,
        originalName: fileName,
        storagePath,
        status: "PENDING",
        tierUsed: extension === "xml" ? "XML" : null,
      },
    })

    bankingLogger.info(
      { jobId: job.id, accountId, fileName, checksum },
      "Bank statement upload successful"
    )

    return NextResponse.json({
      success: true,
      jobId: job.id,
      status: job.status,
      tierUsed: job.tierUsed,
      message: "Upload received. Processing will continue in the background.",
    })
  } catch (error) {
    // Failed to create job - clean up uploaded file
    try {
      await fs.unlink(storagePath)
      bankingLogger.info(
        { path: storagePath, fileName },
        "Cleaned up uploaded file after job creation failed"
      )
    } catch (unlinkError) {
      bankingLogger.error(
        { error: unlinkError, path: storagePath, fileName },
        "Failed to clean up uploaded file after job creation failed - orphaned file will be cleaned by cron"
      )
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      bankingLogger.warn(
        { error, accountId, checksum },
        "Duplicate statement upload attempt detected (checksum match)"
      )
      return NextResponse.json(
        { error: "This statement was already uploaded for this account (checksum match)." },
        { status: 409 }
      )
    }
    bankingLogger.error({ error, accountId, fileName }, "Failed to create import job")
    return NextResponse.json({ error: "Failed to create import job" }, { status: 500 })
  }
}
