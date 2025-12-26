// src/lib/assistant/reasoning/sinks/consumer.ts
import type { ReasoningSink } from "./types"
import type { ReasoningEvent, TerminalPayload } from "../types"
import { isTerminal } from "../types"

export async function consumeReasoning(
  generator: AsyncGenerator<ReasoningEvent, TerminalPayload>,
  sinks: ReasoningSink[]
): Promise<TerminalPayload> {
  let terminalPayload: TerminalPayload | undefined

  try {
    // Manually iterate to capture both yielded values and return value
    let result = await generator.next()

    while (!result.done) {
      const event = result.value

      // Write to all sinks
      for (const sink of sinks) {
        if (sink.mode === "criticalAwait" && event.severity === "critical") {
          // Await critical writes
          await sink.write(event)
        } else {
          // Fire and forget for non-critical
          const writeResult = sink.write(event)
          if (writeResult instanceof Promise) {
            writeResult.catch((err) => {
              console.error("[consumeReasoning] Sink write failed", { error: err })
            })
          }
        }
      }

      // Capture terminal from event data as fallback
      if (isTerminal(event) && event.data) {
        terminalPayload = event.data as TerminalPayload
      }

      result = await generator.next()
    }

    // When done is true, result.value is the return value
    if (result.done && result.value) {
      terminalPayload = result.value
    }
  } finally {
    // Flush all sinks
    await flushAllSinks(sinks)
  }

  if (!terminalPayload) {
    // This should never happen if generator is well-formed
    throw new Error("Pipeline ended without terminal payload")
  }

  return terminalPayload
}

async function flushAllSinks(sinks: ReasoningSink[]): Promise<void> {
  const flushPromises = sinks
    .filter((sink) => sink.flush)
    .map((sink) =>
      sink.flush!().catch((err) => {
        console.error("[consumeReasoning] Sink flush failed", { error: err })
      })
    )

  await Promise.all(flushPromises)
}
