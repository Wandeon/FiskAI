import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { generateWebAuthnRegistrationOptions } from "@/lib/webauthn"
import { apiError } from "@/lib/api-error"

export async function POST() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      include: {
        webAuthnCredentials: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const options = await generateWebAuthnRegistrationOptions(
      user.id,
      user.email,
      user.name || user.email,
      user.webAuthnCredentials.map((cred) => ({
        credentialId: cred.credentialId,
        publicKey: cred.publicKey,
        counter: cred.counter,
        transports: cred.transports ?? null,
      }))
    )

    return NextResponse.json(options)
  } catch (error) {
    return apiError(error, {
      status: 500,
      code: "OPERATION_FAILED",
      message: "Failed to generate registration options",
    })
  }
}
