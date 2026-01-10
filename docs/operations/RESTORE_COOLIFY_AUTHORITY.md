# Restore Coolify as Deployment Authority

> **Status**: Active runbook for recovering from manual container deployment
> **Created**: 2026-01-10
> **Last Updated**: 2026-01-10

## Background

Production is currently running on a manual container (`fiskai-app-manual`) with a custom Traefik route because Coolify deployments were failing due to:

1. **Missing `coolify` user** on VPS-01 host (FIXED)
2. **Health endpoint requiring authentication** (PR #1387)

This runbook documents how to restore Coolify as the single deployment authority.

## Current State

| Component        | Status           | Location                                        |
| ---------------- | ---------------- | ----------------------------------------------- |
| App (production) | Manual container | VPS-01                                          |
| Traefik route    | Custom file      | `/data/coolify/proxy/dynamic/fiskai-route.yaml` |
| Workers          | Coolify-managed  | VPS                                             |
| Redis            | Service on VPS   | `100.120.14.126:6379`                           |

## Prerequisites

Before proceeding, verify:

```bash
# On VPS-01
id coolify  # Should show user exists
groups coolify  # Should include 'docker'

# Test SSH from Coolify container
docker exec coolify sh -c 'ssh -i /var/www/html/storage/app/ssh/keys/ssh_key@qs8w44gccgg00s0c0s8k0kgg -o StrictHostKeyChecking=no coolify@host.docker.internal docker ps --format "{{.Names}}" | head -3'
```

## Step 1: Merge Health Endpoint Fix

1. Review and merge PR #1387: `fix/health-endpoint-auth-bypass`
2. Wait for CI to pass
3. The PR fixes:
   - Middleware bypass for `/api/health` (no auth required)
   - Simplified health endpoint (no DB/Redis dependency)

## Step 2: Trigger Coolify Deployment

```bash
# From VPS-01
COOLIFY_TOKEN=$(grep COOLIFY_API_TOKEN /home/admin/FiskAI/.env | cut -d= -f2)

# Trigger deployment
curl -s -X POST "http://127.0.0.1:8000/api/v1/deploy?uuid=bsswgo8ggwgkw8c88wo8wcw8" \
  -H "Authorization: Bearer $COOLIFY_TOKEN"
```

## Step 3: Monitor Deployment

```bash
# Watch deployment progress
docker logs -f coolify 2>&1 | grep -i ApplicationDeploymentJob

# Check deployment status (wait for completion)
docker exec coolify-db psql -U coolify -d coolify -c \
  "SELECT deployment_uuid, status FROM application_deployment_queues ORDER BY created_at DESC LIMIT 1;"
```

Expected: `status = 'finished'` (not 'failed')

## Step 4: Verify New Container Health

```bash
# Check container is running and healthy
docker ps --filter "name=bsswgo8ggwgkw8c88wo8wcw8" --format "{{.Names}} {{.Status}}"

# Should show: bsswgo8ggwgkw8c88wo8wcw8-XXXXXX Up X minutes (healthy)

# Test health endpoint directly
docker exec $(docker ps -q --filter "name=bsswgo8ggwgkw8c88wo8wcw8" | head -1) \
  wget -qO- http://localhost:3000/api/health
```

Expected: `{"status":"ok","timestamp":"...","version":"...","uptime":...,"memory":{...}}`

## Step 5: Verify External Access

```bash
# Test from outside (use curl from VPS or local machine)
curl -sI https://app.fiskai.hr/ | head -5

# Should return 200 or 307 redirect (not 503)
```

## Step 6: Remove Manual Container and Route

**Only proceed if Steps 4 and 5 succeed!**

```bash
# Stop and remove manual container
docker stop fiskai-app-manual
docker rm fiskai-app-manual

# Remove custom Traefik route
sudo rm /data/coolify/proxy/dynamic/fiskai-route.yaml

# Verify Traefik reloaded (should still route to Coolify-managed container)
curl -sI https://app.fiskai.hr/ | head -3
```

## Step 7: Final Verification

```bash
# Verify Redis connectivity from new container
docker exec coolify-db psql -U coolify -d coolify -c \
  "SELECT deployment_uuid, status FROM application_deployment_queues ORDER BY created_at DESC LIMIT 1;"

# Verify workers still connected
docker exec fiskai-redis-vps redis-cli -a $REDIS_PASSWORD INFO clients | grep connected_clients

# Verify site is serving traffic
curl -s https://app.fiskai.hr/api/health | jq .
```

## Rollback Plan

If Coolify deployment fails or site becomes unavailable:

### Quick Rollback (< 2 minutes)

```bash
# Restart manual container
bash /tmp/start-fiskai-app.sh

# Restore Traefik route if removed
sudo cat > /data/coolify/proxy/dynamic/fiskai-route.yaml << 'EOF'
http:
  routers:
    fiskai-http:
      middlewares:
        - redirect-to-https
      entryPoints:
        - http
      service: fiskai-app
      rule: Host(`fiskai.hr`) || Host(`app.fiskai.hr`) || Host(`staff.fiskai.hr`) || Host(`admin.fiskai.hr`)
    fiskai-https:
      entryPoints:
        - https
      service: fiskai-app
      rule: Host(`fiskai.hr`) || Host(`app.fiskai.hr`) || Host(`staff.fiskai.hr`) || Host(`admin.fiskai.hr`)
      tls:
        certresolver: letsencrypt
  services:
    fiskai-app:
      loadBalancer:
        servers:
          - url: 'http://fiskai-app-manual:3000'
EOF

# Verify site is back
curl -sI https://app.fiskai.hr/ | head -3
```

## Root Cause Summary

### Issue 1: Missing `coolify` User (FIXED)

Coolify SSHs to `host.docker.internal` as user `coolify` to run Docker commands. The user was missing.

**Fix applied:**

```bash
sudo useradd -m -s /bin/bash -G docker coolify
echo 'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIGanXHfQ/9I+nfhCXJKbW6IqeQUjFpRq5IELUMq4N1Y7 coolify' | \
  sudo tee /home/coolify/.ssh/authorized_keys
sudo chmod 700 /home/coolify/.ssh
sudo chmod 600 /home/coolify/.ssh/authorized_keys
sudo chown -R coolify:coolify /home/coolify/.ssh
```

### Issue 2: Health Endpoint Auth (PR #1387)

The `/api/health` endpoint was blocked by auth middleware, causing:

- Docker HEALTHCHECK to receive 307 redirect instead of 200
- Container marked unhealthy
- Coolify rolling back deployment

**Fix**: PR #1387 adds early return for public API routes before auth check.

## Evidence Pack

### Git Clone Failure (Before Fix)

```
kex_exchange_identification: read: Connection reset by peer
# Caused by: SSH to host failing because 'coolify' user didn't exist
```

### Health Check Failure (Before Fix)

```
Container logs:
{ pathname: '/api/health' } 'Redirecting unauthenticated user to auth'

Deployment logs:
"New container is not healthy, rolling back to the old container."
```

### Successful SSH (After Fix)

```bash
docker exec coolify sh -c 'ssh -i /var/www/html/storage/app/ssh/keys/ssh_key@qs8w44gccgg00s0c0s8k0kgg -o StrictHostKeyChecking=no coolify@host.docker.internal echo test'
# Output: test
```

## Related Files

- `/tmp/start-fiskai-app.sh` - Manual container start script
- `/data/coolify/proxy/dynamic/fiskai-route.yaml` - Custom Traefik route
- `/data/coolify/ssh/keys/ssh_key@qs8w44gccgg00s0c0s8k0kgg` - Localhost SSH key

## Contacts

- **Coolify Dashboard**: https://ci.fiskai.hr
- **Application UUID**: `bsswgo8ggwgkw8c88wo8wcw8`
