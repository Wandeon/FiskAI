# Security Rotation Tasks - 2026-01-10

> **Priority**: HIGH
> **Reason**: Credentials were exposed in conversation/logs during recovery

## Tasks

### 1. Rotate Coolify API Token

**Location**: Coolify Dashboard → Settings → API Tokens

```bash
# After generating new token, update:
# 1. /home/admin/FiskAI/.env on VPS-01
# 2. Any CI/CD scripts that use the token
```

### 2. Rotate Redis Password

**OLD (EXPIRED)**: `e760f79e10a4903a9528fe33daf6c952b3cea53d1e30896d`
**CURRENT**: `5a42cf3f43b0fe332f10ca17ff4c2931cab329fb486dd663304ae7b39f3a7e0a`

**Steps**:
```bash
# 1. Generate new password
NEW_REDIS_PASSWORD=$(openssl rand -hex 32)
echo "New password: $NEW_REDIS_PASSWORD"

# 2. Update Redis on VPS
ssh 100.120.14.126
cd /opt/redis
# Edit docker-compose.yml with new password
# docker compose down && docker compose up -d

# 3. Update Coolify env for FiskAI app
# REDIS_URL=redis://default:$NEW_REDIS_PASSWORD@100.120.14.126:6379

# 4. Update workers on VPS
cd /opt/fiskai-workers
# Edit docker-compose.workers.yml with new REDIS_URL
# docker compose down && docker compose up -d

# 5. Trigger Coolify redeploy to pick up new REDIS_URL
```

### 3. Harden SSH for `coolify` User (Optional but Recommended)

**Current state**: User has `/bin/bash` shell

**Recommended**:
```bash
# Restrict shell to no login
sudo usermod -s /usr/sbin/nologin coolify

# Or restrict to specific commands via SSH authorized_keys:
# command="/usr/bin/docker",no-port-forwarding,no-X11-forwarding,no-agent-forwarding ssh-ed25519 AAAA...
```

**Note**: Test after changes - Coolify needs Docker access via SSH.

## Verification After Rotation

```bash
# Test Redis connectivity
docker exec fiskai-redis-vps redis-cli -a $NEW_REDIS_PASSWORD PING

# Test app health
curl -s https://app.fiskai.hr/api/health | jq .

# Test workers
docker logs fiskai-worker-scheduler --tail 20 | grep -i redis
```

## Status

- [x] Coolify API Token rotated (new token saved to .env)
- [x] Redis password rotated (from e760f79e... to 5a42cf3f...)
- [x] App env updated (REDIS_URL in Coolify)
- [x] Workers env updated (docker-compose.workers.yml)
- [ ] SSH hardening applied (optional - deferred)
- [x] Verification complete

## Rotation Log (2026-01-10 14:17 CET)

1. **Redis Password Rotation**
   - Old: `e760f79e10a4903a9528fe33daf6c952b3cea53d1e30896d`
   - New: `5a42cf3f43b0fe332f10ca17ff4c2931cab329fb486dd663304ae7b39f3a7e0a`
   - Updated: `/opt/redis/redis.conf`, `/opt/redis/docker-compose.yml`
   - Restarted Redis, verified 278 clients connected

2. **Workers Updated**
   - Updated: `/opt/fiskai-workers/docker-compose.workers.yml`
   - All 15 workers restarted and connected

3. **App Updated**
   - Updated REDIS_URL in Coolify environment via model
   - Deployed via Coolify (deployment UUID: e8cgooc04sows4wk4kswwc00)
   - Container healthy: `bsswgo8ggwgkw8c88wo8wcw8-135723949307`

4. **Coolify API Token Rotation**
   - Deleted old token: "Claude New"
   - Created new token: "FiskAI-API-2026-01-10"
   - Token saved to `/home/admin/FiskAI/.env`

5. **Verification**
   - Health endpoint: 200 OK
   - Redis: 278 connected clients
   - Workers: All 15 running
   - App container: healthy
