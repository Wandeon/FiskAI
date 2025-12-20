// src/lib/tutorials/progress.ts

import { drizzleDb } from "@/lib/db/drizzle"
import { tutorialProgress } from "@/lib/db/schema/tutorials"
import { eq, and } from "drizzle-orm"
import type { TutorialProgress, TutorialTrack } from "./types"

export async function getTutorialProgress(
  userId: string,
  companyId: string,
  trackId: string
): Promise<TutorialProgress | null> {
  const result = await drizzleDb
    .select()
    .from(tutorialProgress)
    .where(
      and(
        eq(tutorialProgress.userId, userId),
        eq(tutorialProgress.companyId, companyId),
        eq(tutorialProgress.trackId, trackId)
      )
    )
    .limit(1)

  if (!result[0]) return null

  return {
    trackId: result[0].trackId,
    completedTasks: (result[0].completedTasks as string[]) || [],
    currentDay: parseInt(result[0].currentDay || "1"),
    startedAt: result[0].startedAt,
    lastActivityAt: result[0].lastActivityAt,
  }
}

export async function initTutorialProgress(
  userId: string,
  companyId: string,
  trackId: string
): Promise<TutorialProgress> {
  const [result] = await drizzleDb
    .insert(tutorialProgress)
    .values({
      userId,
      companyId,
      trackId,
      completedTasks: [],
      currentDay: "1",
    })
    .returning()

  return {
    trackId: result.trackId,
    completedTasks: [],
    currentDay: 1,
    startedAt: result.startedAt,
    lastActivityAt: result.lastActivityAt,
  }
}

export async function markTaskComplete(
  userId: string,
  companyId: string,
  trackId: string,
  taskId: string
): Promise<void> {
  const existing = await getTutorialProgress(userId, companyId, trackId)

  if (!existing) {
    await initTutorialProgress(userId, companyId, trackId)
  }

  const currentTasks = existing?.completedTasks || []
  if (currentTasks.includes(taskId)) return

  await drizzleDb
    .update(tutorialProgress)
    .set({
      completedTasks: [...currentTasks, taskId],
      lastActivityAt: new Date(),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(tutorialProgress.userId, userId),
        eq(tutorialProgress.companyId, companyId),
        eq(tutorialProgress.trackId, trackId)
      )
    )
}

export function calculateTrackProgress(
  track: TutorialTrack,
  completedTasks: string[]
): { completed: number; total: number; percentage: number } {
  const allTasks = track.days.flatMap((d) => d.tasks.filter((t) => !t.isOptional))
  const completed = allTasks.filter((t) => completedTasks.includes(t.id)).length
  const total = allTasks.length
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0

  return { completed, total, percentage }
}
