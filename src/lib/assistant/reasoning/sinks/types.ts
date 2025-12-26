// src/lib/assistant/reasoning/sinks/types.ts
import type { ReasoningEvent } from "../types"

export type SinkMode = "nonBlocking" | "buffered" | "criticalAwait"

export interface ReasoningSink {
  mode: SinkMode
  write(event: ReasoningEvent): void | Promise<void>
  flush?(): Promise<void>
}

export interface SinkConfig {
  name: string
  enabled: boolean
}
