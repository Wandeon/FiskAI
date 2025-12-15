// src/app/api/email/rules/[id]/route.ts

import { NextResponse } from "next/server"
import { requireAuth, requireCompany } from "@/lib/auth-utils"
import { db } from "@/lib/db"
import { setTenantContext } from "@/lib/prisma-extensions"

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth()
    const company = await requireCompany(user.id!)
    setTenantContext({ companyId: company.id, userId: user.id! })

    const { id } = await params

    const rule = await db.emailImportRule.findFirst({
      where: { id, companyId: company.id },
    })

    if (!rule) {
      return NextResponse.json({ error: "Rule not found" }, { status: 404 })
    }

    const { senderEmail, senderDomain, subjectContains, filenameContains, isActive } =
      await request.json()

    const updated = await db.emailImportRule.update({
      where: { id },
      data: {
        senderEmail: senderEmail ?? rule.senderEmail,
        senderDomain: senderDomain ?? rule.senderDomain,
        subjectContains: subjectContains ?? rule.subjectContains,
        filenameContains: filenameContains ?? rule.filenameContains,
        isActive: isActive ?? rule.isActive,
      },
    })

    return NextResponse.json({ rule: updated })
  } catch (error) {
    console.error("[email/rules] PUT error:", error)
    return NextResponse.json({ error: "Failed to update rule" }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth()
    const company = await requireCompany(user.id!)
    setTenantContext({ companyId: company.id, userId: user.id! })

    const { id } = await params

    const rule = await db.emailImportRule.findFirst({
      where: { id, companyId: company.id },
    })

    if (!rule) {
      return NextResponse.json({ error: "Rule not found" }, { status: 404 })
    }

    await db.emailImportRule.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[email/rules] DELETE error:", error)
    return NextResponse.json({ error: "Failed to delete rule" }, { status: 500 })
  }
}
