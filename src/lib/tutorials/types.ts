// src/lib/tutorials/types.ts

export interface TutorialTask {
  id: string
  title: string
  description?: string
  isOptional?: boolean
  href: string
  completionCheck?: (context: TutorialContext) => boolean
}

export interface TutorialDay {
  day: number
  title: string
  tasks: TutorialTask[]
}

export interface TutorialTrack {
  id: string
  name: string
  description: string
  targetLegalForm: string[]
  days: TutorialDay[]
}

export interface TutorialContext {
  contactsCount: number
  productsCount: number
  invoicesCount: number
  hasKprEntry: boolean
  hasPosdDraft: boolean
  hasCalendarReminder: boolean
}

export interface TutorialProgress {
  trackId: string
  completedTasks: string[]
  currentDay: number
  startedAt: Date
  lastActivityAt: Date
}
