import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth-utils"
import { db } from "@/lib/db"

export async function POST(request: NextRequest) {
  // Check admin auth
  const user = await getCurrentUser()
  if (!user || user.systemRole !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { email } = body

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    // Check if user exists
    const existingUser = await db.user.findUnique({
      where: { email: email.toLowerCase() },
    })

    if (existingUser) {
      // If user exists and is already STAFF or ADMIN, return error
      if (existingUser.systemRole === "STAFF") {
        return NextResponse.json({ error: "User is already a staff member" }, { status: 400 })
      }
      if (existingUser.systemRole === "ADMIN") {
        return NextResponse.json({ error: "Cannot demote admin to staff" }, { status: 400 })
      }

      // Promote user to STAFF
      const updatedUser = await db.user.update({
        where: { id: existingUser.id },
        data: { systemRole: "STAFF" },
        select: {
          id: true,
          email: true,
          name: true,
          systemRole: true,
        },
      })

      return NextResponse.json({
        success: true,
        user: updatedUser,
        message: "User promoted to staff",
      })
    } else {
      // User doesn't exist - in a full implementation, we'd send an invitation
      // For now, return an error
      return NextResponse.json(
        {
          error: "User not found. Please ensure the user has registered first.",
        },
        { status: 404 }
      )
    }
  } catch (error) {
    console.error("Error adding staff member:", error)
    return NextResponse.json({ error: "Failed to add staff member" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  // Check admin auth
  const user = await getCurrentUser()
  if (!user || user.systemRole !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const staff = await db.user.findMany({
      where: { systemRole: "STAFF" },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        _count: {
          select: {
            staffAssignments: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json({ staff })
  } catch (error) {
    console.error("Error fetching staff:", error)
    return NextResponse.json({ error: "Failed to fetch staff" }, { status: 500 })
  }
}
