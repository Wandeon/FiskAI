"use server"

import { z } from "zod"
import bcrypt from "bcryptjs"
import { db } from "@/lib/db"
import { signIn, signOut } from "@/lib/auth"
import { registerSchema, loginSchema } from "@/lib/validations"
import { redirect } from "next/navigation"
import { AuthError } from "next-auth"

export async function register(formData: z.infer<typeof registerSchema>) {
  const validatedFields = registerSchema.safeParse(formData)

  if (!validatedFields.success) {
    return { error: "Invalid fields" }
  }

  const { name, email, password } = validatedFields.data

  const existingUser = await db.user.findUnique({
    where: { email },
  })

  if (existingUser) {
    return { error: "Email already in use" }
  }

  const passwordHash = await bcrypt.hash(password, 10)

  await db.user.create({
    data: {
      name,
      email,
      passwordHash,
    },
  })

  return { success: "Account created! Please log in." }
}

export async function login(formData: z.infer<typeof loginSchema>) {
  const validatedFields = loginSchema.safeParse(formData)

  if (!validatedFields.success) {
    return { error: "Invalid fields" }
  }

  const { email, password } = validatedFields.data

  try {
    await signIn("credentials", {
      email,
      password,
      redirect: false,
    })
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return { error: "Invalid credentials" }
        default:
          return { error: "Something went wrong" }
      }
    }
    throw error
  }

  redirect("/dashboard")
}

export async function logout() {
  await signOut({ redirect: false })
  redirect("/login")
}
