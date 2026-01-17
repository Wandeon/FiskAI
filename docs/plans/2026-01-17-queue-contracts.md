# RTL Queue Contracts - Draft Package Skeleton and Versioning Rules

> Created: 2026-01-17
> Status: Draft (proposed)
> Goal: Prevent cross-repo queue drift after split by sharing versioned payload contracts.

## 1) Versioning rules

- Every job payload includes `version` (integer) and `createdAt` (ISO string).
- Producers publish only the latest version.
- Consumers must accept `version` N and N-1 during rollouts.
- Breaking changes require:
  - new `version`, and
  - optional translation shim (`v1` -> `v2`) kept for at least 1 release cycle.
- If payload shape is incompatible or hazardous, use a new queue name (for example `extract.v2`).
- Job IDs must remain deterministic and idempotent; payload changes cannot break jobId stability.

## 2) Required envelope fields (all queues)

```
{
  version: number,
  runId: string,
  createdAt: string,
  producer: string,
  traceId?: string
}
```

## 3) Proposed package skeleton (shared between repos)

```
packages/rtl-queue-contracts/
  package.json
  README.md
  src/
    index.ts
    v1/
      index.ts
      queues.ts
      payloads/
        sentinel.ts
        scout.ts
        router.ts
        ocr.ts
        extract.ts
        compose.ts
        apply.ts
        review.ts
        arbiter.ts
        release.ts
        article.ts
        backup.ts
        system-status.ts
        deadletter.ts
        scheduled.ts
      validators/
        sentinel.ts
        scout.ts
        router.ts
        ...
```

## 4) v1 queue inventory (payload contracts to define)

| Queue         | Job name(s)                                                                         | Payload type      |
| ------------- | ----------------------------------------------------------------------------------- | ----------------- |
| sentinel      | sentinel-\*                                                                         | SentinelJobV1     |
| scout         | scout                                                                               | ScoutJobV1        |
| router        | route                                                                               | RouterJobV1       |
| ocr           | ocr                                                                                 | OcrJobV1          |
| extract       | extract                                                                             | ExtractJobV1      |
| compose       | compose                                                                             | ComposeJobV1      |
| apply         | apply                                                                               | ApplyJobV1        |
| review        | review                                                                              | ReviewJobV1       |
| arbiter       | arbiter                                                                             | ArbiterJobV1      |
| release       | release, release-single                                                             | ReleaseJobV1      |
| scheduled     | pipeline-run, auto-approve, arbiter-sweep, release-batch, regression-detection, ... | ScheduledJobV1    |
| article       | article.generate, article.process                                                   | ArticleJobV1      |
| backup        | scheduled-backup, manual-backup                                                     | BackupJobV1       |
| system-status | refresh                                                                             | SystemStatusJobV1 |
| deadletter    | dlq                                                                                 | DeadLetterJobV1   |

## 5) v1 payload shape (minimum required fields)

- SentinelJobV1
  - version, runId, createdAt, producer
  - sourceId?: string
  - priority?: "CRITICAL" | "HIGH" | "NORMAL" | "LOW"

- ScoutJobV1
  - version, runId, createdAt, producer
  - evidenceId: string
  - parentJobId?: string

- RouterJobV1
  - version, runId, createdAt, producer
  - evidenceId: string
  - sourceSlug: string
  - scoutResult: object (content-scout output)
  - parentJobId?: string

- OcrJobV1
  - version, runId, createdAt, producer
  - evidenceId: string

- ExtractJobV1
  - version, runId, createdAt, producer
  - evidenceId: string
  - parentJobId?: string
  - llmProvider?: "LOCAL_OLLAMA" | "CLOUD_OLLAMA"

- ComposeJobV1
  - version, runId, createdAt, producer
  - candidateFactIds: string[]
  - domain: string
  - parentJobId?: string
  - pointerIds?: string[] (legacy fallback)

- ApplyJobV1
  - version, runId, createdAt, producer
  - proposal: ComposerProposalV1
  - domain: string
  - parentJobId?: string

- ReviewJobV1
  - version, runId, createdAt, producer
  - ruleId: string
  - parentJobId?: string

- ArbiterJobV1
  - version, runId, createdAt, producer
  - conflictId: string
  - parentJobId?: string

- ReleaseJobV1
  - version, runId, createdAt, producer
  - ruleIds: string[]
  - parentJobId?: string

- ArticleJobV1
  - version, runId, createdAt, producer
  - action: "generate" | "process"
  - type?: "NEWS" | "GUIDE" | "HOWTO" | ...
  - sourceUrls?: string[]
  - topic?: string
  - maxIterations?: number
  - metadata?: { triggeredBy?: string; newsItemId?: string; ruleId?: string }
  - jobId?: string (for process)

- BackupJobV1
  - version, runId, createdAt, producer
  - companyId: string
  - frequency: "daily" | "weekly" | "monthly"
  - notifyEmail?: string
  - retentionDays?: number
  - scheduledAt: string
  - manual?: boolean

- SystemStatusJobV1
  - version, runId, createdAt, producer
  - jobId: string
  - userId: string
  - timeoutSeconds: number
  - lockKey: string

- DeadLetterJobV1
  - version, runId, createdAt, producer
  - originalQueue: string
  - originalJobId?: string
  - originalJobName: string
  - originalJobData: unknown
  - error: string
  - stackTrace?: string
  - attemptsMade: number
  - failedAt: string
  - firstFailedAt?: string
  - errorCategory?: string
  - idempotencyKey?: string
  - isRetryable?: boolean

- ScheduledJobV1
  - version, runId, createdAt, producer
  - type: "pipeline-run" | "auto-approve" | "arbiter-sweep" | "release-batch" | "regression-detection" | ...
  - triggeredBy?: string

## 6) Example validator (zod)

```ts
import { z } from "zod"

export const ExtractJobV1 = z.object({
  version: z.number().int().min(1),
  runId: z.string().min(1),
  createdAt: z.string().datetime(),
  producer: z.string().min(1),
  evidenceId: z.string().min(1),
  parentJobId: z.string().optional(),
  llmProvider: z.enum(["LOCAL_OLLAMA", "CLOUD_OLLAMA"]).optional(),
})

export type ExtractJobV1 = z.infer<typeof ExtractJobV1>
```

## 7) Rollout rules

- Add schema + validator in both repos before switching producers.
- Deploy consumer that accepts N-1 and N first.
- Switch producer to N and keep translation for at least one release.
