"use client"

import { useState } from "react"
import { DEMO_FIXTURES, type FixtureKey } from "@/lib/assistant/fixtures"
import { AssistantContainer } from "@/components/assistant-v2"

const FIXTURE_OPTIONS: { key: FixtureKey; label: string }[] = [
  { key: "ANSWER", label: "Successful Answer with Citations" },
  { key: "NO_CITABLE_RULES", label: "Refusal: No Citable Rules" },
  { key: "OUT_OF_SCOPE", label: "Refusal: Out of Scope" },
  { key: "UNRESOLVED_CONFLICT", label: "Refusal: Unresolved Conflict" },
  { key: "MISSING_CLIENT_DATA", label: "Refusal: Missing Client Data" },
]

export default function AssistantDemoPage() {
  const [selectedFixture, setSelectedFixture] = useState<FixtureKey>("ANSWER")
  const fixture = DEMO_FIXTURES[selectedFixture]

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 md:px-6">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-white">Assistant Demo (Fixtures)</h1>
        <p className="text-white/70 mt-1">Test UI components with predefined response scenarios.</p>
      </header>

      <div className="mb-6 p-4 bg-slate-800 rounded-lg">
        <label className="block text-sm font-medium text-white/80 mb-2">Select Scenario:</label>
        <select
          value={selectedFixture}
          onChange={(e) => setSelectedFixture(e.target.value as FixtureKey)}
          className="w-full p-2 rounded bg-slate-700 text-white border border-slate-600"
        >
          {FIXTURE_OPTIONS.map(({ key, label }) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-4 p-3 bg-slate-900/50 rounded text-xs font-mono text-white/60 overflow-auto max-h-48">
        <pre>{JSON.stringify(fixture, null, 2)}</pre>
      </div>

      {/* The container would need to accept a fixture prop or use context */}
      <AssistantContainer surface={fixture.surface} />
    </div>
  )
}
