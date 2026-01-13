# Worker Build Authority

> Last updated: 2026-01-10
> Status: ENFORCED

## Summary

**Worker images MUST be built on VPS (x86_64) only.**

Building on ARM64 hosts is forbidden. A build guard script enforces this.

## Architecture

| Host    | Tailscale IP     | Architecture | Purpose                |
|---------|------------------|--------------|------------------------|
| VPS     | 100.120.14.126   | x86_64       | Workers + Redis + Build|
| VPS-01  | 100.64.123.81    | ARM64        | App + Postgres ONLY    |

## The Incident (Why This Matters)

Workers were previously built on VPS-01 (ARM64) and deployed there. The x86_64 worker
images ran via QEMU binary translation, causing:

- **10-100x performance degradation** - Workers that should process in seconds took minutes
- **Memory overhead** - QEMU emulation consumed additional RAM
- **Silent failures** - No obvious errors, just slow execution
- **Queue backlogs** - Processing couldn't keep up with ingestion

The fix was to:
1. Run workers on VPS (native x86_64)
2. Build workers on VPS (native x86_64)
3. **Prevent future ARM64 builds**

## Build Authority Rules

### Rule 1: Only Build on x86_64

Workers use native x86_64 binaries and must not be emulated. The build guard
script at `/opt/fiskai-workers/build-workers.sh` enforces this:

```bash
if [ "$(uname -m)" != "x86_64" ]; then
    echo "WORKER BUILD BLOCKED - WRONG ARCHITECTURE"
    exit 1
fi
```

### Rule 2: Use the Canonical Build Script

**Always use:** `/opt/fiskai-workers/build-workers.sh`

**Never use directly:**
- `docker build` on worker Dockerfile
- `docker compose build` for workers
- GitHub Actions (workers are not built in CI)
- Coolify builds (app only, not workers)

### Rule 3: Workers Run on VPS Only

Workers connect to:
- Redis on VPS (100.120.14.126)
- PostgreSQL on VPS-01 (via Tailscale)

They process locally on VPS to avoid network latency for AI/embedding calls.

## How to Build Workers

### On VPS (100.120.14.126):

```bash
# SSH to VPS
ssh admin@vps  # or ssh admin@100.120.14.126

# Build all workers
cd /opt/fiskai-workers
./build-workers.sh --all

# Or build specific types
./build-workers.sh --base  # Base image (no OCR)
./build-workers.sh --ocr   # OCR image (with Tesseract)
```

### Build Script Options

| Flag    | Description                              |
|---------|------------------------------------------|
| --all   | Build base + OCR, tag all worker images  |
| --base  | Build base worker image only             |
| --ocr   | Build OCR worker image only              |

### After Building

```bash
# Restart workers to pick up new images
cd /opt/fiskai-workers
docker compose -f docker-compose.workers.yml down
docker compose -f docker-compose.workers.yml up -d

# Verify worker versions
docker ps | grep fiskai-worker
docker inspect fiskai-worker-orchestrator | grep GIT_SHA
```

## Guard Script Details

Location: `/opt/fiskai-workers/build-workers.sh`

The script:
1. **Checks `uname -m`** - Refuses to run on non-x86_64 hosts
2. **Sources from FiskAI repo** - Uses `/home/admin/FiskAI/Dockerfile.worker`
3. **Tags all worker images** - Creates `fiskai-worker-{type}:latest` for each worker
4. **Embeds version info** - GIT_SHA and BUILD_DATE in image labels

### What Happens on Wrong Architecture

```
========================================================================
  WORKER BUILD BLOCKED - WRONG ARCHITECTURE
========================================================================

  Current host: aarch64
  Required:     x86_64

  Worker images MUST be built on x86_64 hosts to avoid QEMU emulation.
  Build on VPS (100.120.14.126) - NOT on VPS-01 (ARM64).

  See: /home/admin/FiskAI/docs/operations/WORKER_BUILD_AUTHORITY.md

========================================================================
```

Exit code: 1

## Existing Build Scripts (Reference)

These scripts exist in the source repo but are NOT the canonical way to build workers:

| Script                      | Purpose                    | Status          |
|-----------------------------|----------------------------|-----------------|
| scripts/build-workers.sh    | Original build script      | Use /opt version|
| scripts/build-arm64.sh      | ARM64 app builds           | App only        |
| scripts/build-remote.sh     | Remote build on VPS-01     | App only        |
| scripts/build-limited.sh    | Resource-limited builds    | App only        |

## CI/CD Considerations

- **Workers are NOT built in GitHub Actions** - CI runs tests only
- **Workers are NOT built by Coolify** - Coolify deploys the main app only
- **Workers are built manually on VPS** - Using the guard script

This is intentional: worker builds require x86_64 host, and VPS is not a CI runner.

## Verification

To verify the guard is working:

```bash
# On VPS (should succeed)
/opt/fiskai-workers/build-workers.sh --all

# On VPS-01 (should fail with exit 1)
# DO NOT RUN - this would fail as expected
```

## Contacts

If you need to modify the build process or have questions about worker architecture:

- Check this document first
- Review the incident context above
- Ensure any changes maintain the x86_64 requirement

## Changelog

| Date       | Change                                    |
|------------|-------------------------------------------|
| 2026-01-10 | Created build guard and documentation     |
