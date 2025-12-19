import { db } from "@/lib/db"

export type SystemRole = "USER" | "STAFF" | "ADMIN"

export async function getSystemRole(userId: string): Promise<SystemRole> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { systemRole: true },
  })
  return (user?.systemRole as SystemRole) || "USER"
}

export async function setSystemRole(userId: string, role: SystemRole): Promise<void> {
  await db.user.update({
    where: { id: userId },
    data: { systemRole: role },
  })
}

export function canAccessSubdomain(systemRole: SystemRole, subdomain: string): boolean {
  switch (subdomain) {
    case "admin":
      return systemRole === "ADMIN"
    case "staff":
      return systemRole === "STAFF" || systemRole === "ADMIN"
    case "app":
      return true // All roles can access app
    case "marketing":
      return true // Public
    default:
      return false
  }
}

export function getAvailableSubdomains(systemRole: SystemRole): string[] {
  switch (systemRole) {
    case "ADMIN":
      return ["admin", "staff", "app"]
    case "STAFF":
      return ["staff", "app"]
    case "USER":
    default:
      return ["app"]
  }
}

export function hasMultipleRoles(systemRole: SystemRole): boolean {
  return systemRole === "ADMIN" || systemRole === "STAFF"
}
