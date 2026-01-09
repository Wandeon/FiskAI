# Marketing Site Separation Operations Runbook

> Last Updated: 2026-01-09

## Architecture Overview

FiskAI uses a split architecture with two separate deployments:

| Component | URL | Hosting | Repository |
|-----------|-----|---------|------------|
| Marketing Site | www.fiskai.hr | SiteGround (static) | fiskai-marketing |
| Application | app.fiskai.hr | Coolify (Docker) | FiskAI |

### Domain Architecture

```
fiskai.hr (root)          → SiteGround (marketing)
www.fiskai.hr             → SiteGround (marketing)
app.fiskai.hr             → Coolify (Next.js app)
  ├─ /admin/*             → Admin portal (ADMIN role)
  ├─ /staff/*             → Staff portal (STAFF role)
  └─ /*                   → Client dashboard (all roles)
```

### Removed/Deprecated
- `admin.fiskai.hr` - DNS deleted, redirect via middleware to `app.fiskai.hr/admin`
- `staff.fiskai.hr` - DNS deleted, redirect via middleware to `app.fiskai.hr/staff`

## Marketing Site (fiskai-marketing repo)

### Repository
- GitHub: https://github.com/Wandeon/fiskai-marketing
- Static export: `output: "export"` in next.config.ts

### Deployment
- **Platform**: SiteGround via FTP
- **Trigger**: Push to main branch
- **Workflow**: `.github/workflows/deploy.yml`

### FTP Configuration
```yaml
server: siteground-ftp-host
username: bot@fiskai.hr
port: 21  # Standard FTP, not SFTP
server-dir: ./fiskai.hr/public_html/
```

### Manual Deployment
```bash
cd /tmp/fiskai-marketing
npm run build
# Result: ./out/ directory with static files
# Upload ./out/* to ./fiskai.hr/public_html/ via FTP
```

### Auth Redirects
Marketing site has stub pages that redirect to app.fiskai.hr for auth:
- `/login` → Redirects to `app.fiskai.hr/login`
- `/register` → Redirects to `app.fiskai.hr/register`
- `/forgot-password` → Redirects to `app.fiskai.hr/forgot-password`

## Main Application (FiskAI repo)

### Repository
- GitHub: https://github.com/Wandeon/FiskAI
- Docker deployment via Coolify

### Deployment
- **Platform**: Coolify at ci.fiskai.hr
- **Application UUID**: `bsswgo8ggwgkw8c88wo8wcw8`
- **Trigger**: Push to main or manual deploy

### Deploy Commands
```bash
# Trigger deployment
curl -X POST "http://152.53.146.3:8000/api/v1/applications/bsswgo8ggwgkw8c88wo8wcw8/start" \
  -H "Authorization: Bearer $(grep COOLIFY_API_TOKEN .env | cut -d'=' -f2)" \
  -H "Content-Type: application/json" \
  -d '{"force": true}'

# Check deployment status
curl -s "http://152.53.146.3:8000/api/v1/applications/bsswgo8ggwgkw8c88wo8wcw8" \
  -H "Authorization: Bearer $(grep COOLIFY_API_TOKEN .env | cut -d'=' -f2)" | jq '.status'
```

### Role-Based Access
Access control is path-based, not subdomain-based:

| Path | Required Role | Notes |
|------|---------------|-------|
| `/admin/*` | ADMIN | Platform administration |
| `/staff/*` | STAFF or ADMIN | Multi-client workspace |
| `/*` | Any authenticated | Client dashboard |

Implementation in `src/lib/middleware/subdomain.ts`:
```typescript
export function canAccessPath(systemRole: string, pathname: string): boolean {
  if (pathname.startsWith("/admin")) {
    return systemRole === "ADMIN"
  }
  if (pathname.startsWith("/staff")) {
    return systemRole === "STAFF" || systemRole === "ADMIN"
  }
  return true // All other paths accessible by all authenticated users
}
```

## Troubleshooting

### Marketing site shows old content
1. Check GitHub Actions for deploy status
2. Verify FTP credentials haven't expired
3. Manually trigger redeploy

### Auth redirect loops
1. Check marketing site's redirect pages are deployed
2. Verify app.fiskai.hr auth routes are working
3. Check NextAuth configuration

### Legacy subdomain access
Legacy subdomains (admin.fiskai.hr, staff.fiskai.hr) should redirect to app.fiskai.hr paths. If they don't:
1. Verify DNS records are deleted in Cloudflare
2. Check middleware handles redirects

### Application 404s on /admin or /staff
1. Verify pages exist in `src/app/admin/` and `src/app/staff/`
2. Check user has correct `systemRole` in database
3. Verify middleware allows the path

## DNS Records (Cloudflare)

| Name | Type | Value | Proxy |
|------|------|-------|-------|
| @ | A | SiteGround IP | Proxied |
| www | CNAME | @ | Proxied |
| app | A | 152.53.146.3 | Proxied |
| ci | A | 152.53.146.3 | DNS only |

### Deleted Records
- `admin` - Was CNAME to app
- `staff` - Was CNAME to app

## Contacts

- **SiteGround**: Account under main email
- **Coolify**: Self-hosted at ci.fiskai.hr
- **Cloudflare**: DNS management

## Related Documents

- [CLAUDE.md](../../CLAUDE.md) - Project context and deployment commands
- [fiskai-marketing/BOUNDARY_CONTRACT.md](https://github.com/Wandeon/fiskai-marketing/blob/main/BOUNDARY_CONTRACT.md) - Marketing repo contract
