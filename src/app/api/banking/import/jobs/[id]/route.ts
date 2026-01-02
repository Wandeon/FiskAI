import { NextResponse } from "next/server"
import { z } from "zod"
import { requireAuth, requireCompany } from "@/lib/auth-utils"
import { setTenantContext } from "@/lib/prisma-extensions"
import { db } from "@/lib/db"
import { bankingLogger } from "@/lib/logger"
import { parseParams, isValidationError, formatValidationError } from "@/lib/api/validation"

const paramsSchema = z.object({
  id: z.string().cuid("Invalid job ID format"),
})

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuth()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const company = await requireCompany(user.id!)
  if (!company) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 })
  }

  setTenantContext({
    companyId: company.id,
    userId: user.id!,
  })

  try {
    const { id: jobId } = parseParams(await params, paramsSchema)

    const job = await db.importJob.findUnique({
      where: { id: jobId },
      include: {
        statement: {
          include: {
            pages: {
              select: {
                id: true,
                pageNumber: true,
                status: true,
              },
            },
          },
        },
      },
    })

    if (!job || job.companyId !== company.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    const pages = job.statement?.pages || []
    const pageCount = pages.length
    const pagesVerified = pages.filter((p) => p.status === "VERIFIED").length
    const pagesNeedsVision = pages.filter((p) => p.status === "NEEDS_VISION").length
    const pagesFailed = pages.filter((p) => p.status === "FAILED").length

    return NextResponse.json({
      success: true,
      job: {
        id: job.id,
        status: job.status,
        tierUsed: job.tierUsed,
        failureReason: job.failureReason,
        pagesProcessed: job.pagesProcessed,
        pagesFailed: job.pagesFailed,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt,
        statementId: job.statement?.id ?? null,
        pageCount,
        pagesVerified,
        pagesNeedsVision,
      },
    })
  } catch (error) {
    if (isValidationError(error)) {
      return NextResponse.json(formatValidationError(error), { status: 400 })
    }
    throw error
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuth()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const company = await requireCompany(user.id!)
  if (!company) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 })
  }

  setTenantContext({
    companyId: company.id,
    userId: user.id!,
  })

  try {
    const { id: jobId } = parseParams(await params, paramsSchema)

    const job = await db.importJob.findUnique({
      where: { id: jobId },
      include: { statement: true },
    })

    if (!job || job.companyId !== company.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    bankingLogger.warn(
      { jobId: job.id, userId: user.id },
      "Rejected bank import deletion attempt: imports are immutable"
    )

    return NextResponse.json(
      { error: "Bankovni uvozi su nepromjenjivi i nije ih moguće obrisati." },
      { status: 405 }
    )
  } catch (error) {
    if (isValidationError(error)) {
      return NextResponse.json(formatValidationError(error), { status: 400 })
    }
    throw error
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuth()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const company = await requireCompany(user.id!)
  if (!company) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 })
  }

  setTenantContext({
    companyId: company.id,
    userId: user.id!,
  })

  try {
    const { id: jobId } = parseParams(await params, paramsSchema)

    await request.json().catch(() => null)
    bankingLogger.warn(
      { jobId, userId: user.id },
      "Rejected bank import mutation attempt: imports are immutable"
    )

    return NextResponse.json(
      { error: "Bankovni uvozi su nepromjenjivi i nije ih moguće uređivati." },
      { status: 405 }
    )
  } catch (error) {
    if (isValidationError(error)) {
      return NextResponse.json(formatValidationError(error), { status: 400 })
    }
    throw error
  }
}
