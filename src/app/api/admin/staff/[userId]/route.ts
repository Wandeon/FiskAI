import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth-utils"
import { db } from "@/lib/db"

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  // Check admin auth
  const user = await getCurrentUser()
  if (!user || user.systemRole !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { userId } = await params

  try {
    // Find the user
    const staffUser = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        systemRole: true,
      },
    })

    if (!staffUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    if (staffUser.systemRole !== "STAFF") {
      return NextResponse.json({ error: "User is not a staff member" }, { status: 400 })
    }

    // Demote user to regular USER role
    const updatedUser = await db.user.update({
      where: { id: userId },
      data: { systemRole: "USER" },
      select: {
        id: true,
        email: true,
        systemRole: true,
      },
    })

    // Also remove any staff assignments
    await db.staffAssignment.deleteMany({
      where: { userId },
    })

    return NextResponse.json({
      success: true,
      user: updatedUser,
      message: "Staff member removed",
    })
  } catch (error) {
    console.error("Error removing staff member:", error)
    return NextResponse.json({ error: "Failed to remove staff member" }, { status: 500 })
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  // Check admin auth
  const user = await getCurrentUser()
  if (!user || user.systemRole !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { userId } = await params

  try {
    const staffUser = await db.user.findUnique({
      where: { id: userId, systemRole: "STAFF" },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        staffAssignments: {
          include: {
            company: {
              select: {
                id: true,
                name: true,
                oib: true,
              },
            },
          },
        },
      },
    })

    if (!staffUser) {
      return NextResponse.json({ error: "Staff member not found" }, { status: 404 })
    }

    return NextResponse.json({ user: staffUser })
  } catch (error) {
    console.error("Error fetching staff member:", error)
    return NextResponse.json({ error: "Failed to fetch staff member" }, { status: 500 })
  }
}
