---
name: coolify-deployment
description: Use when deploying to Coolify, checking deployment status, or managing the FiskAI application via Coolify API
---

# Coolify Deployment

## Overview

This skill documents the correct way to interact with the Coolify API for FiskAI deployments.

**IMPORTANT:** The CLAUDE.md file previously had INCORRECT endpoint format. Use this skill.

## Configuration

**Server:** `152.53.146.3`
**Dashboard:** https://ci.fiskai.hr (or http://152.53.146.3:8000)
**Application UUID:** `bsswgo8ggwgkw8c88wo8wcw8`

## API Authentication

**Token Location:** `.env` file (or `.env.local`)

```bash
COOLIFY_API_TOKEN=4|apxkFaHnjDRwyZuRo4NHnlBrQvlLvMuYN6Iv1yVybd98f84b
```

**Header Format:**

```
Authorization: Bearer <COOLIFY_API_TOKEN>
```

## API Base URL

```
http://152.53.146.3:8000/api/v1
```

Note: Most routes are prefixed with `/v1`. Exceptions: `/health`, `/feedback`

## Deployment Endpoints

### Trigger Deployment (CORRECT)

```bash
curl -X POST "http://152.53.146.3:8000/api/v1/applications/bsswgo8ggwgkw8c88wo8wcw8/start" \
  -H "Authorization: Bearer $(grep COOLIFY_API_TOKEN .env | cut -d'=' -f2)" \
  -H "Content-Type: application/json" \
  -d '{"force": true}'
```

**Response:**

```json
{ "message": "Deployment request queued.", "deployment_uuid": "<uuid>" }
```

### WRONG (DO NOT USE)

```bash
# WRONG - This endpoint doesn't exist
curl -X POST "http://152.53.146.3:8000/api/v1/deploy?uuid=xxx&force=true"
```

### Get Application Info

```bash
curl -s "http://152.53.146.3:8000/api/v1/applications/bsswgo8ggwgkw8c88wo8wcw8" \
  -H "Authorization: Bearer $(grep COOLIFY_API_TOKEN .env | cut -d'=' -f2)"
```

### Restart Application

```bash
curl -X POST "http://152.53.146.3:8000/api/v1/applications/bsswgo8ggwgkw8c88wo8wcw8/restart" \
  -H "Authorization: Bearer $(grep COOLIFY_API_TOKEN .env | cut -d'=' -f2)"
```

### Stop Application

```bash
curl -X POST "http://152.53.146.3:8000/api/v1/applications/bsswgo8ggwgkw8c88wo8wcw8/stop" \
  -H "Authorization: Bearer $(grep COOLIFY_API_TOKEN .env | cut -d'=' -f2)"
```

## Reading the Token

Always read the token from the environment file:

```bash
# Get token value
grep COOLIFY_API_TOKEN .env | cut -d'=' -f2

# Or use in curl directly
-H "Authorization: Bearer $(grep COOLIFY_API_TOKEN .env | cut -d'=' -f2)"
```

**NEVER hardcode the token in commands.**

## Common Errors

| Error                            | Cause                        | Solution                                            |
| -------------------------------- | ---------------------------- | --------------------------------------------------- |
| `{"message":"Unauthenticated."}` | Wrong or expired token       | Check token in .env.local matches Coolify dashboard |
| `404 Not Found`                  | Wrong endpoint path          | Use `/applications/{uuid}/start` not `/deploy`      |
| `500 Undefined variable $branch` | Using webhook endpoint wrong | Use API endpoint, not webhook                       |

## Deployment Workflow

1. **Push changes to GitHub**

   ```bash
   git push origin main
   ```

2. **Trigger deployment via API**

   ```bash
   curl -X POST "http://152.53.146.3:8000/api/v1/applications/bsswgo8ggwgkw8c88wo8wcw8/start" \
     -H "Authorization: Bearer $(grep COOLIFY_API_TOKEN .env | cut -d'=' -f2)" \
     -H "Content-Type: application/json" \
     -d '{"force": true}'
   ```

3. **Wait for deployment** (typically 3-5 minutes)

4. **Verify deployment**

   ```bash
   curl -s "http://152.53.146.3:8000/api/v1/applications/bsswgo8ggwgkw8c88wo8wcw8" \
     -H "Authorization: Bearer $(grep COOLIFY_API_TOKEN .env | cut -d'=' -f2)" | jq '.status'
   ```

   Expected: `"running:healthy"`

## Token Permissions

Tokens have permission levels:

- `read-only` (default): Read access only
- `read:sensitive`: Includes sensitive data
- `*` (all): Full access including deployments

For deployments, the token needs `*` permissions.

## Sources

- [Coolify Authorization Docs](https://coolify.io/docs/api-reference/authorization)
- [Coolify Application API](https://deepwiki.com/coollabsio/coolify/8.2-application-api-endpoints)
