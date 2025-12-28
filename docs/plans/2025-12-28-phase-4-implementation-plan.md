# Phase 4: Externalization - Implementation Plan

> Detailed implementation plan for audit-ready exports.
>
> **Design:** [2025-12-28-system-registry-phases-2-4-design.md](./2025-12-28-system-registry-phases-2-4-design.md)
> **Status:** Ready for implementation
> **Estimated Sprints:** 0.5 (can be done alongside Phase 2)

---

## Overview

Phase 4 creates export utilities for compliance and audit needs. Three formats: CSV ownership matrix, regulatory evidence pack (ZIP), and drift history (JSONL).

---

## Prerequisites

- [ ] Phase 1 complete
- [ ] Declarations stable

---

## Task 1: Create Export Module Structure

**File:** `src/lib/system-registry/export.ts`

**Core interface:**
```typescript
type ExportFormat = 'csv' | 'regulatory-pack' | 'drift-history';

interface ExportOptions {
  format: ExportFormat;
  outputPath?: string;     // Default: docs/system-registry/exports/
  since?: Date;            // For drift-history
  includeMetadata?: boolean;
}

interface ExportResult {
  format: ExportFormat;
  path: string;
  recordCount: number;
  generatedAt: Date;
}

async function exportRegistry(options: ExportOptions): Promise<ExportResult>;
```

**Implementation:**
1. Load declarations and drift state
2. Dispatch to format-specific handler
3. Write to output path
4. Return result metadata

**Tests:**
- Unknown format throws
- Default output path used if not specified
- Result contains correct metadata

**Acceptance criteria:**
- Module exports work
- Format dispatch correct
- Output paths created

---

## Task 2: Implement CSV Exporter

**File:** `src/lib/system-registry/exporters/csv.ts`

**Output format:**
```csv
component_id,type,name,owner,criticality,codeRef,dependencies,healthCheck_endpoint,alertChannel,last_verified
lib-auth,LIB,Auth Library,@fiskai/security,CRITICAL,src/lib/auth/,"lib-db,lib-config",/api/health/auth,#ops-critical,2025-01-15T10:00:00Z
```

**Columns:**
- component_id, type, name, owner, criticality, codeRef
- dependencies (comma-separated)
- healthCheck_endpoint, healthCheck_command (if present)
- slo_availability, slo_latencyP99 (if present)
- alertChannel, runbook (if present)
- last_verified (export timestamp)

**Implementation:**
1. Flatten component structure for CSV
2. Handle optional fields (empty string if missing)
3. Escape commas and quotes properly
4. Include header row

**Tests:**
- All field types export correctly
- Optional fields are empty, not undefined
- Special characters escaped
- Header row present

**Acceptance criteria:**
- Valid CSV output
- Opens in Excel without issues
- All declared fields included

---

## Task 3: Implement Regulatory Evidence Pack

**File:** `src/lib/system-registry/exporters/regulatory-pack.ts`

**Output structure:**
```
regulatory-export-YYYY-MM-DD/
├── manifest.json
├── ownership-matrix.csv
├── critical-paths.json
├── drift-report.md
├── governance-config.json
└── component-details/
    ├── lib-auth.json
    ├── lib-billing.json
    └── ...
```

**manifest.json:**
```json
{
  "exportVersion": "1.0.0",
  "generatedAt": "2025-01-15T10:00:00Z",
  "generatedBy": "system-registry-export",
  "componentCount": 150,
  "criticalCount": 15,
  "files": [
    {"name": "ownership-matrix.csv", "records": 150},
    {"name": "critical-paths.json", "paths": 4},
    {"name": "drift-report.md", "issues": 3}
  ]
}
```

**Implementation:**
1. Create temp directory
2. Generate ownership-matrix.csv (reuse CSV exporter)
3. Export critical paths from governance
4. Generate current drift report
5. Snapshot governance config
6. Export each component as JSON
7. Create manifest
8. ZIP directory
9. Clean up temp

**Dependencies:**
- Use `archiver` npm package for ZIP creation

**Tests:**
- ZIP is valid and extractable
- All expected files present
- Manifest counts match actual
- Component details complete

**Acceptance criteria:**
- Valid ZIP output
- All artifacts included
- Manifest is accurate

---

## Task 4: Implement Drift History Exporter

**File:** `src/lib/system-registry/exporters/drift-history.ts`

**Output format (JSON Lines):**
```jsonl
{"timestamp":"2025-01-15T10:00:00Z","runId":"abc123","component":"lib-auth","issue":"owner_missing","severity":"CRITICAL","resolved":false}
{"timestamp":"2025-01-15T10:05:00Z","runId":"abc123","component":"lib-auth","issue":"owner_missing","severity":"CRITICAL","resolved":true,"resolution":"added @fiskai/security"}
```

**Schema per line:**
```typescript
interface DriftHistoryEntry {
  timestamp: string;       // ISO 8601
  runId: string;           // CI run or export id
  component: string;       // Component id
  issue: string;           // Issue type
  severity: Criticality;
  resolved: boolean;
  resolution?: string;     // How it was resolved
  prNumber?: number;       // If resolved via PR
}
```

**Implementation:**
1. Load historical drift reports from git history
2. Parse each report to extract issues
3. Compare consecutive reports to detect resolutions
4. Filter by --since date if provided
5. Output as JSONL

**Historical data source:**
- `docs/system-registry/drift-report-ci.md` versions in git
- Parse markdown to extract issue lists
- Correlate across commits

**Tests:**
- Entries are valid JSON
- One entry per line
- Resolution detection works
- Since filtering works

**Acceptance criteria:**
- Valid JSONL output
- Historical data extracted
- Resolutions tracked

---

## Task 5: Create CLI Entry Point

**File:** `src/lib/system-registry/scripts/export.ts`

**Usage:**
```bash
# Export current state as CSV
npx tsx src/lib/system-registry/scripts/export.ts --format csv

# Generate regulatory evidence pack
npx tsx src/lib/system-registry/scripts/export.ts --format regulatory-pack

# Export drift history
npx tsx src/lib/system-registry/scripts/export.ts --format drift-history --since 2025-01-01

# Custom output path
npx tsx src/lib/system-registry/scripts/export.ts --format csv --output ./exports/
```

**Arguments:**
- `--format` (required): csv | regulatory-pack | drift-history
- `--output` (optional): Output directory (default: docs/system-registry/exports/)
- `--since` (optional): Date filter for drift-history (YYYY-MM-DD)
- `--project-root` (optional): Project root path

**Implementation:**
1. Parse arguments
2. Validate format
3. Call exportRegistry()
4. Log result

**Tests:**
- All formats work via CLI
- Invalid format shows error
- Output path respected
- Since date parsed correctly

**Acceptance criteria:**
- CLI works for all formats
- Helpful error messages
- Logs export location

---

## Task 6: Add Workflow Dispatch for On-Demand Exports

**File:** `.github/workflows/registry-export.yml`

**Workflow:**
```yaml
name: Registry Export

on:
  workflow_dispatch:
    inputs:
      format:
        description: 'Export format'
        required: true
        type: choice
        options:
          - csv
          - regulatory-pack
          - drift-history
      since:
        description: 'Since date for drift-history (YYYY-MM-DD)'
        required: false
        type: string

jobs:
  export:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0  # Full history for drift-history

      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - run: npm ci

      - name: Run Export
        run: |
          npx tsx src/lib/system-registry/scripts/export.ts \
            --format ${{ inputs.format }} \
            ${{ inputs.since && format('--since {0}', inputs.since) || '' }}

      - name: Upload Artifact
        uses: actions/upload-artifact@v4
        with:
          name: registry-export-${{ inputs.format }}
          path: docs/system-registry/exports/*
          retention-days: 90
```

**Tests:**
- Workflow runs on dispatch
- All format options work
- Artifact uploaded correctly

**Acceptance criteria:**
- Can trigger from GitHub UI
- Exports available as artifacts
- 90-day retention

---

## Task 7: Create Exports Directory Structure

**Directory:** `docs/system-registry/exports/`

**Contents:**
- `.gitkeep` to track empty directory
- `README.md` documenting export formats

**README.md:**
```markdown
# System Registry Exports

This directory contains exports generated by the registry export tool.

## Generating Exports

```bash
# Local
npx tsx src/lib/system-registry/scripts/export.ts --format csv

# Via GitHub Actions
# Go to Actions → Registry Export → Run workflow
```

## Formats

- **csv**: Ownership matrix for spreadsheet analysis
- **regulatory-pack**: ZIP file for compliance audits
- **drift-history**: JSONL for trend analysis

## Retention

Exports are git-committed manually when needed for audit trail.
On-demand exports via CI are retained for 90 days.
```

**Acceptance criteria:**
- Directory exists
- README explains usage
- .gitkeep present

---

## Definition of Done

- [ ] Export module created
- [ ] CSV exporter working
- [ ] Regulatory pack exporter working
- [ ] Drift history exporter working
- [ ] CLI entry point working
- [ ] GitHub workflow created
- [ ] Directory structure in place
- [ ] Can generate all three formats
