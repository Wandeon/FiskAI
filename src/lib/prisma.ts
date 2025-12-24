// Re-export db as prisma for assistant query engine compatibility
import { db } from "./db"

export const prisma = db
