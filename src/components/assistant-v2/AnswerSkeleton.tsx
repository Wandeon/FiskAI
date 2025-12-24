// src/components/assistant-v2/AnswerSkeleton.tsx
"use client"

import React from "react"
import { cn } from "@/lib/utils"

interface AnswerSkeletonProps {
  className?: string
}

export function AnswerSkeleton({ className }: AnswerSkeletonProps) {
  return (
    <div
      data-testid="answer-skeleton-container"
      aria-hidden="true"
      className={cn("p-6 border rounded-lg space-y-4", className)}
    >
      {/* Headline skeleton */}
      <div
        data-testid="skeleton-headline"
        className="h-6 bg-muted rounded motion-safe:animate-pulse w-3/4"
      />

      {/* Direct answer skeleton */}
      <div className="space-y-2">
        <div
          data-testid="skeleton-answer-1"
          className="h-4 bg-muted rounded motion-safe:animate-pulse"
        />
        <div
          data-testid="skeleton-answer-2"
          className="h-4 bg-muted rounded motion-safe:animate-pulse w-5/6"
        />
      </div>

      {/* Button placeholders */}
      <div className="flex gap-2 pt-2">
        <div
          data-testid="skeleton-button-1"
          className="h-8 w-20 bg-muted rounded motion-safe:animate-pulse"
        />
        <div
          data-testid="skeleton-button-2"
          className="h-8 w-24 bg-muted rounded motion-safe:animate-pulse"
        />
      </div>
    </div>
  )
}
