// src/app/api/email/rules/route.ts

import { NextResponse } from "next/server"
import { requireAuth, requireCompany } from "@/lib/auth-utils"
import { db } from "@/lib/db"
import { setTenantContext } from "@/lib/prisma-extensions"
import { apiError } from "@/lib/api-error"

export async function GET() {
  try {
    const user = await requireAuth()
    const company = await requireCompany(user.id!)
    setTenantContext({ companyId: company.id, userId: user.id! })

    const rules = await db.emailImportRule.findMany({
      where: { companyId: company.id },
      include: {
        connection: {
          select: { emailAddress: true, provider: true },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json({ rules })
  } catch (error) {
    return apiError(error, {
      status: 500,
      code: "OPERATION_FAILED",
      message: "Failed to fetch rules",
    })
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuth()
    const company = await requireCompany(user.id!)
    setTenantContext({ companyId: company.id, userId: user.id! })

    const { connectionId, senderEmail, senderDomain, subjectContains, filenameContains } =
      await request.json()

    if (!connectionId) {
      return NextResponse.json({ error: "connectionId is required" }, { status: 400 })
    }

    // Verify connection belongs to company
    const connection = await db.emailConnection.findFirst({
      where: { id: connectionId, companyId: company.id },
    })

    if (!connection) {
      return NextResponse.json({ error: "Connection not found" }, { status: 404 })
    }

    // Require at least one filter
    if (!senderEmail && !senderDomain && !subjectContains && !filenameContains) {
      return NextResponse.json(
        { error: "At least one filter criterion is required" },
        { status: 400 }
      )
    }

    const rule = await db.emailImportRule.create({
      data: {
        connectionId,
        companyId: company.id,
        senderEmail: senderEmail || null,
        senderDomain: senderDomain || null,
        subjectContains: subjectContains || null,
        filenameContains: filenameContains || null,
      },
    })

    return NextResponse.json({ rule })
  } catch (error) {
    return apiError(error, {
      status: 500,
      code: "OPERATION_FAILED",
      message: "Failed to create rule",
    })
  }
}
