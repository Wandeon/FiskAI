import { NextResponse } from "next/server"
import { z } from "zod"
import { requireAuth, requireCompany } from "@/lib/auth-utils"
import { setTenantContext } from "@/lib/prisma-extensions"
import { db } from "@/lib/db"
import { JobStatus } from "@prisma/client"
import {
  parseParams,
  parseBody,
  isValidationError,
  formatValidationError,
} from "@/lib/api/validation"

const paramsSchema = z.object({
  id: z.string().cuid("Invalid job ID format"),
})

const bodySchema = z.object({
  status: z.nativeEnum(JobStatus, { error: "Invalid job status" }),
})

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
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
    const { status } = await parseBody(request, bodySchema)

    // Verify job ownership - SECURITY: Prevent IDOR vulnerability
    const job = await db.importJob.findFirst({
      where: {
        id: jobId,
        companyId: company.id,
      },
    })

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 })
    }

    await db.importJob.update({
      where: { id: job.id },
      data: { status },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    if (isValidationError(error)) {
      return NextResponse.json(formatValidationError(error), { status: 400 })
    }
    throw error
  }
}
