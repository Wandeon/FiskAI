import { db } from "@/lib/db"

/**
 * Verify that a STAFF user is assigned to a specific company.
 *
 * This function enforces tenant isolation for staff users accessing client company data.
 * It prevents staff users from accessing data for companies they're not assigned to.
 *
 * @param userId - The user ID to check
 * @param systemRole - The user's system role (USER, STAFF, or ADMIN)
 * @param companyId - The company ID to verify access to
 * @returns Promise<boolean> - true if access is allowed
 * @throws Error if staff user is not assigned to the company
 *
 * Access rules:
 * - ADMIN: Full access to all companies (returns true)
 * - STAFF: Must have a StaffAssignment record for the company
 * - USER: Not allowed to use this function (throws error)
 *
 * Usage in API routes:
 * ```typescript
 * const user = await getCurrentUser()
 * if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
 *
 * // For routes that accept companyId parameter
 * await requireStaffAccess(user.id, user.systemRole, companyId)
 * ```
 */
export async function requireStaffAccess(
  userId: string,
  systemRole: string,
  companyId: string
): Promise<boolean> {
  // ADMIN has full access to all companies
  if (systemRole === "ADMIN") {
    return true
  }

  // Only STAFF users should use this function
  if (systemRole !== "STAFF") {
    throw new Error("requireStaffAccess can only be used by STAFF users")
  }

  // Check if staff user is assigned to this company
  const assignment = await db.staffAssignment.findUnique({
    where: {
      staffId_companyId: {
        staffId: userId,
        companyId: companyId,
      },
    },
  })

  if (!assignment) {
    throw new Error("Not assigned to this company")
  }

  return true
}
