import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { apiError } from "@/lib/api-error"

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    const passkey = await db.webAuthnCredential.findUnique({
      where: { id },
    })

    if (!passkey || passkey.userId !== session.user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    await db.webAuthnCredential.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return apiError(error, {
      status: 500,
      code: "OPERATION_FAILED",
      message: "Failed to delete passkey",
    })
  }
}
