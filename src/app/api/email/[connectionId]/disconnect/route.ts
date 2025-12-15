// src/app/api/email/[connectionId]/disconnect/route.ts

import { NextResponse } from "next/server"
import { requireAuth, requireCompany } from "@/lib/auth-utils"
import { db } from "@/lib/db"
import { setTenantContext } from "@/lib/prisma-extensions"
import { getEmailProvider } from "@/lib/email-sync/providers"
import { decryptSecret } from "@/lib/secrets"

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ connectionId: string }> }
) {
  try {
    const user = await requireAuth()
    const company = await requireCompany(user.id!)
    setTenantContext({ companyId: company.id, userId: user.id! })

    const { connectionId } = await params

    const connection = await db.emailConnection.findFirst({
      where: { id: connectionId, companyId: company.id },
    })

    if (!connection) {
      return NextResponse.json({ error: "Connection not found" }, { status: 404 })
    }

    // Try to revoke access token
    try {
      if (connection.accessTokenEnc) {
        const provider = getEmailProvider(connection.provider)
        const accessToken = decryptSecret(connection.accessTokenEnc)
        await provider.revokeAccess(accessToken)
      }
    } catch (revokeError) {
      console.error("[email/disconnect] revoke error:", revokeError)
      // Continue with deletion even if revoke fails
    }

    // Update status to revoked (keep for history)
    await db.emailConnection.update({
      where: { id: connectionId },
      data: {
        status: "REVOKED",
        accessTokenEnc: null,
        refreshTokenEnc: "",
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[email/disconnect] error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Disconnect failed" },
      { status: 500 }
    )
  }
}
