// src/app/api/auth/check-email/route.ts
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { z } from "zod"
import { apiError } from "@/lib/api-error"

const schema = z.object({
  email: z.string().email(),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email } = schema.parse(body)

    const user = await db.user.findUnique({
      where: { email: email.toLowerCase() },
      select: {
        id: true,
        name: true,
        emailVerified: true,
        webAuthnCredentials: { select: { id: true }, take: 1 },
      },
    })

    if (!user) {
      return NextResponse.json({ exists: false })
    }

    return NextResponse.json({
      exists: true,
      emailVerified: !!user.emailVerified,
      hasPasskey: user.webAuthnCredentials.length > 0,
      name: user.name,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 })
    }
    return apiError(error)
  }
}
