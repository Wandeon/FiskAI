import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { z } from "zod"
import bcrypt from "bcryptjs"
import { apiError } from "@/lib/api-error"

const schema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
  password: z.string().min(8),
  businessType: z.enum(["OBRT_PAUSAL", "OBRT_REAL", "OBRT_VAT", "JDOO", "DOO"]).optional(),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, name, password, businessType } = schema.parse(body)

    const emailLower = email.toLowerCase()

    // Check if user exists
    const existingUser = await db.user.findUnique({
      where: { email: emailLower },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: "Email je već u upotrebi" },
        { status: 400 }
      )
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10)

    // Create user
    const user = await db.user.create({
      data: {
        email: emailLower,
        name,
        passwordHash,
        intendedBusinessType: businessType,
      },
    })

    return NextResponse.json({
      success: true,
      userId: user.id,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Nevažeći podaci" }, { status: 400 })
    }
    return apiError(error, {
      status: 500,
      code: "OPERATION_FAILED",
      message: "Greška pri registraciji",
    })
  }
}
