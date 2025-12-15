# Evidence Rules - Definition of Done

## Required for ✅ Complete Status

| Rule                | Check                                        | How to Verify                         |
| ------------------- | -------------------------------------------- | ------------------------------------- |
| File exists         | `docs/02_FEATURES/features/{name}.md` exists | `ls docs/02_FEATURES/features/`       |
| Minimum size        | > 200 bytes                                  | `wc -c < file.md`                     |
| Has Purpose         | Section "## Purpose" exists                  | `grep "## Purpose" file.md`           |
| Has Entry Points    | Section "## User Entry Points" exists        | `grep "## User Entry Points" file.md` |
| Has Evidence Links  | Section "## Evidence Links" exists           | `grep "## Evidence Links" file.md`    |
| Evidence count      | ≥ 5 file:line references                     | Count backtick references with `:`    |
| Evidence valid      | All referenced files exist                   | Script checks each path               |
| Dependencies listed | Has "Depends on" with content OR "None"      | `grep "Depends on" file.md`           |
| Status marked       | Has status badge in header                   | `grep "Documentation:" file.md`       |

## Status Definitions

| Status      | Meaning                             |
| ----------- | ----------------------------------- |
| ❌ Stub     | Only name and entry point exist     |
| 🟡 Partial  | Has content but fails ≥1 rule above |
| ✅ Complete | Passes all rules, reviewer approved |

## Validation Script

Run: `node docs/_meta/scripts/validate-feature.js <feature-file.md>`

Returns: `PASS` or `FAIL: <specific rule that failed>`
