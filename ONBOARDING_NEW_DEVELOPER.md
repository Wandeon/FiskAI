# FiskAI Developer Onboarding Guide

Welcome to the team! This guide explains how FiskAI's development, staging, and production infrastructure works.

---

## 🏗️ Architecture Overview

```
┌────────────────────────────────────────────────────────────────┐
│                     YOUR DEVELOPMENT FLOW                       │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. LOCAL OR VPS (Your Workspace)                             │
│     └─ Edit code in /home/admin/FiskAI/                       │
│     └─ Commit & push to GitHub                                │
│                                                                 │
│  2. THREE ENVIRONMENTS                                         │
│     │                                                          │
│     ├─ DEV: http://100.64.123.81:3001 (instant HMR)          │
│     │  └─ Run: npm run dev -- -p 3001                        │
│     │  └─ Purpose: See changes in <1 second                   │
│     │  └─ Database: Same PostgreSQL as prod                   │
│     │                                                          │
│     ├─ STAGING: http://erp.metrica.hr:3002 (via Coolify)     │
│     │  └─ Auto-deploys on git push                           │
│     │  └─ Purpose: Test before production                     │
│     │  └─ Database: Same PostgreSQL as prod                   │
│     │                                                          │
│     └─ PRODUCTION: https://erp.metrica.hr (via Coolify)      │
│        └─ Manual deploy trigger via Coolify dashboard         │
│        └─ Purpose: Customer-facing                            │
│        └─ Database: Same PostgreSQL (multi-tenant)            │
│                                                                 │
│  3. INFRASTRUCTURE (VPS-01)                                    │
│     └─ Coolify: Self-hosted PaaS (like Vercel but on your VPS)│
│     └─ Docker: All services containerized                      │
│     └─ PostgreSQL: Single database for all environments        │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
```

---

## 🌐 Three Environments Explained

### 1. DEV (Local Development)
**URL:** `http://100.64.123.81:3001` (Tailscale IP) or SSH tunnel to localhost:3001
**Command:** `ssh admin@vps-01 "cd /home/admin/FiskAI && npm run dev -- -p 3001"`
**Purpose:** Instant feedback while coding
**HMR (Hot Module Reload):** ✅ Yes (~1 second reload)
**First page load:** ~10-15 seconds (Next.js dev compilation)
**Subsequent loads:** <500ms (modules cached)

**When to use:** Daily development, testing features you just wrote

```bash
# Check if dev server is running
pgrep -f 'next dev'

# View logs
tail -50 /tmp/fiskai-dev.log

# Restart dev server
ssh admin@vps-01 "pkill -f 'next dev'"
ssh admin@vps-01 "cd /home/admin/FiskAI && nohup npm run dev -- -p 3001 -H 0.0.0.0 > /tmp/fiskai-dev.log 2>&1 &"
```

---

### 2. STAGING (Coolify Container)
**URL:** `http://erp.metrica.hr:3002` (public)
**Deployment:** Automatic on git push to `main` branch
**Purpose:** Test in production-like environment before going live
**HMR:** ❌ No (built container, not dev mode)

**How it works:**
1. You push commit to GitHub: `git push origin main`
2. Coolify webhook triggers automatically
3. Coolify builds Docker image from latest main
4. Deploys to staging container on port 3002
5. You access at http://erp.metrica.hr:3002

**Build time:** 3-5 minutes
**First visit after deploy:** May be slow (cold start)
**Subsequent visits:** Normal speed

**When to use:**
- Testing features before production
- Verifying database migrations work
- Checking mobile responsiveness on real server
- Testing with other team members

---

### 3. PRODUCTION (Coolify Container)
**URL:** `https://erp.metrica.hr` (HTTPS, public, customer-facing)
**Deployment:** MANUAL trigger via Coolify dashboard
**Purpose:** Live customer environment
**HMR:** ❌ No (built container)

**How to deploy:**
1. Ensure all code is tested on staging
2. Go to: https://git.metrica.hr (Coolify dashboard)
3. Login: admin@example.com / SecurePass!123
4. Find FiskAI app in dashboard
5. Click "Deploy" button
6. Wait 3-5 minutes for build
7. Verify at https://erp.metrica.hr

**Important:** Only deploy when feature is complete and tested on staging!

**When to use:** Only when code is ready for customers

---

## 🔑 Accessing Coolify Dashboard (With Your Token)

### What is Coolify?
Self-hosted alternative to Heroku/Vercel. Runs on your VPS, provides:
- Git-based deployments (push to deploy)
- Docker container management
- SSL/HTTPS certificates
- Environment variables management
- Logs & monitoring

### Dashboard Access
**URL:** https://git.metrica.hr

**Login Options:**

#### Option 1: Email/Password (Recommended)
```
Email: admin@example.com
Password: SecurePass!123
```

#### Option 2: API Token (Programmatic)
If you have an API token:
```bash
curl -H "Authorization: Bearer YOUR_API_TOKEN" \
  https://git.metrica.hr/api/v1/deployments/latest
```

**Your token info:**
- Purpose: Deploy/manage FiskAI via API
- Expires: Check in Coolify dashboard (Settings → API Tokens)
- If expired: Generate new token in dashboard

### What You Can Do in Coolify Dashboard
1. **View deployments:** Click FiskAI app → see all deployments
2. **Trigger manual deploy:** Click "Deploy" button
3. **View logs:** Click app → "Logs" tab
4. **Manage environment variables:** Click app → "Settings"
5. **Monitor container health:** Dashboard shows CPU, memory, uptime
6. **View pull requests:** GitHub integration shows PR deployments

---

## 💻 Your Daily Workflow

### Setup (First Day)
```bash
# 1. SSH into VPS
ssh admin@vps-01

# 2. Clone repo (if not already done)
cd /home/admin
git clone https://github.com/Wandeon/FiskAI.git
cd FiskAI

# 3. Configure git (one-time)
git config user.email "your.email@company.com"
git config user.name "Your Name"

# 4. Install dependencies
npm install

# 5. Check .env.local (should exist)
cat .env.local | grep DATABASE_URL
# Should output something like: postgresql://fiskai:secret@172.18.0.2:5432/fiskai
```

### Daily Development
```bash
# 1. Pull latest code
git pull origin main

# 2. Create feature branch
git checkout -b feature/your-feature-name

# 3. Make changes
# (Edit files, save, browser auto-refreshes via HMR on dev server)

# 4. Commit
git add -A
git commit -m "feat: describe your change"

# 5. Push to GitHub
git push origin feature/your-feature-name

# 6. Create Pull Request on GitHub
# (Or admin will merge if approved)

# 7. Test on staging (auto-deploys when merged to main)
# Visit: http://erp.metrica.hr:3002

# 8. If staging looks good, deploy to production
# (via Coolify dashboard)
```

---

## 🗄️ Database Setup

### Connection Details
**Host:** `172.18.0.2` (Docker network IP)
**Port:** `5432`
**Database:** `fiskai`
**Username:** `fiskai`
**Password:** See `.env.local`

### Database in Each Environment
- **DEV (port 3001):** Same PostgreSQL container
- **STAGING (port 3002):** Same PostgreSQL container
- **PRODUCTION (port 443):** Same PostgreSQL container

**Important:** All three environments share the SAME database! This means:
- Changes you make in DEV immediately appear in STAGING
- Changes in STAGING appear in PRODUCTION
- Test data gets shared across environments
- **Use care with destructive operations**

### Migrations
```bash
# See migration status
npx prisma migrate status

# Create new migration (after schema change)
npx prisma migrate dev --name describe_your_change

# Deploy migration (only if needed in production)
DATABASE_URL='postgresql://fiskai:secret@172.18.0.2:5432/fiskai' \
npx prisma migrate deploy
```

---

## 🚀 Example: How a Feature Flows Through Environments

### Scenario: Add a new button to the invoice page

```
STEP 1: DEV
─────────────
git checkout -b feature/invoice-button
# Edit: src/app/(dashboard)/e-invoices/[id]/page.tsx
# Add button code
# Save file → browser auto-refreshes (HMR) → see button immediately
# Test on http://100.64.123.81:3001

STEP 2: COMMIT & PUSH
─────────────────────
git add src/app/(dashboard)/e-invoices/[id]/page.tsx
git commit -m "feat: add download invoice button"
git push origin feature/invoice-button

STEP 3: GITHUB
──────────────
# Go to GitHub
# Create Pull Request from feature/invoice-button → main
# Team reviews code
# Approve & merge to main

STEP 4: STAGING (Auto-Deploy)
──────────────────────────────
# Coolify webhook triggers automatically
# Builds Docker image
# Deploys to staging container
# You access: http://erp.metrica.hr:3002
# Test the button on staging
# Verify it works with production data

STEP 5: PRODUCTION (Manual Deploy)
──────────────────────────────────
# Go to Coolify dashboard: https://git.metrica.hr
# Find FiskAI app
# Click "Deploy" button
# Wait 3-5 minutes
# Access https://erp.metrica.hr
# See your button live for customers!
```

---

## 🔧 Useful Commands

### Check Dev Server Status
```bash
# Is it running?
pgrep -f 'next dev'

# View logs
ssh admin@vps-01 "tail -50 /tmp/fiskai-dev.log"

# Restart dev server
ssh admin@vps-01 "pkill -f 'next dev'"
ssh admin@vps-01 "cd /home/admin/FiskAI && nohup npm run dev -- -p 3001 -H 0.0.0.0 > /tmp/fiskai-dev.log 2>&1 &"
sleep 3
ssh admin@vps-01 "tail -20 /tmp/fiskai-dev.log"
```

### Check Docker Containers
```bash
# List all containers
docker ps

# View FiskAI staging container logs
docker logs bsswgo8ggwgkw8c88wo8wcw8-215458880769 --tail 50 -f

# View Coolify logs
docker logs coolify --tail 50 -f
```

### Build & Test Locally
```bash
# Check for TypeScript errors
npm run build

# Run tests (if configured)
npm run test

# Check linting
npm run lint
```

### Database Operations
```bash
# Open database in Prisma Studio (interactive UI)
npx prisma studio

# Execute raw SQL
docker exec -i fiskai-db psql -U fiskai -d fiskai -c "SELECT COUNT(*) FROM \"EInvoice\";"
```

---

## 📊 Environment Variables

All stored in `/home/admin/FiskAI/.env.local`:

```bash
# Database (shared across all environments)
DATABASE_URL="postgresql://fiskai:password@172.18.0.2:5432/fiskai"

# NextAuth
NEXTAUTH_URL="https://erp.metrica.hr"
NEXTAUTH_SECRET="random-secret-key"

# Admin panel
ADMIN_PASSWORD="Adminpass123!"
ADMIN_EMAILS="info@metrica.hr,mislav@hey.com"

# OIB lookup
SUDSKI_REGISTAR_USERNAME="your-username"
SUDSKI_REGISTAR_PASSWORD="your-password"

# Features
ENABLE_PASSKEYS=true
ENABLE_FISCALIZATION=false  # Until credentials arrive
```

**Important:** These env vars are used by all three environments (DEV, STAGING, PROD). Changes here affect all!

---

## 🐛 Common Issues & Solutions

### Issue: "Dev server not responding"
**Solution:**
```bash
ssh admin@vps-01 "pkill -f 'next dev'"
ssh admin@vps-01 "cd /home/admin/FiskAI && rm -rf .next && npm run dev -- -p 3001 -H 0.0.0.0 > /tmp/fiskai-dev.log 2>&1 &"
```

### Issue: "Database connection refused"
**Solution:** Database container is running but network unreachable
```bash
docker ps | grep fiskai-db  # Check if container is running
docker restart fiskai-db    # Restart if needed
```

### Issue: "Staging deploy failed"
**Solution:** Check Coolify dashboard logs
```bash
# Go to: https://git.metrica.hr
# Click FiskAI app
# Click "Logs" tab
# Look for error message
# Common: TypeScript compilation error or migration failure
```

### Issue: "Can't access http://100.64.123.81:3001"
**Solution 1:** Use Tailscale (encrypted tunnel)
```bash
# Connect to Tailscale network (you need to be invited)
# Then access: http://100.64.123.81:3001
```

**Solution 2:** Use SSH tunnel
```bash
ssh -L 3001:localhost:3001 admin@vps-01
# Then access: http://localhost:3001
```

---

## 📚 Key Files & Directories

| Path | Purpose |
|------|---------|
| `/home/admin/FiskAI/` | Project root (all code here) |
| `src/app/` | Next.js app routes & pages |
| `src/components/` | React components |
| `src/lib/` | Utilities, helpers, business logic |
| `src/app/actions/` | Server actions (RSC) |
| `src/app/api/` | API routes |
| `prisma/schema.prisma` | Database schema definition |
| `prisma/migrations/` | Database migration history |
| `.env.local` | Environment variables (SECRET!) |
| `package.json` | Dependencies & scripts |
| `tsconfig.json` | TypeScript config |
| `tailwind.config.ts` | Tailwind CSS config |

---

## 🔐 Security Reminders

1. **Never commit `.env.local`** to Git (it contains secrets)
2. **API tokens expire:** Check Coolify dashboard if deployments fail
3. **Database is shared:** Test data visible to all environments
4. **Coolify credentials:** admin@example.com / SecurePass!123 (change password!)
5. **GitHub personal access token:** Keep safe, don't share

---

## 📞 Getting Help

**Questions about:**
- **Infrastructure/deployment:** Ask Mislav (founder)
- **Feature design:** Ask Mislav
- **Code architecture:** Check existing code patterns first
- **Database schema:** See `prisma/schema.prisma`
- **TypeScript errors:** Check `npm run build` output

---

## ✨ You're Ready!

You now understand:
- ✅ Three environments (DEV → STAGING → PROD)
- ✅ How Coolify auto-deploys staging and manual deploys prod
- ✅ How to access dev server on port 3001
- ✅ How to trigger Coolify deployments
- ✅ How the shared database works
- ✅ Daily development workflow

**Start by:**
1. SSH into VPS: `ssh admin@vps-01`
2. Pull latest: `cd /home/admin/FiskAI && git pull origin main`
3. Check dev server: `tail -20 /tmp/fiskai-dev.log`
4. Create feature branch: `git checkout -b feature/your-task`
5. Make changes, commit, push
6. See staging auto-deploy at http://erp.metrica.hr:3002
7. Ask Mislav to merge to main when ready
8. Mislav manually deploys to production

Welcome aboard! 🚀