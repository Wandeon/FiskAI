# Quick Reference: DEV → STAGING → PRODUCTION Flow

## 🚀 The Three Environments

| Aspect | DEV | STAGING | PRODUCTION |
|--------|-----|---------|------------|
| **URL** | `http://100.64.123.81:3001` | `http://erp.metrica.hr:3002` | `https://erp.metrica.hr` |
| **Port** | 3001 | 3002 | 443 (HTTPS) |
| **Access** | Tailscale/SSH tunnel | Public | Public |
| **Database** | Same PostgreSQL | Same PostgreSQL | Same PostgreSQL |
| **Deployment** | Manual: `npm run dev` | Auto: on `git push` | Manual: Coolify button |
| **HMR** | ✅ Yes (<1s reload) | ❌ No | ❌ No |
| **Build time** | N/A (dev mode) | 3-5 min | 3-5 min |
| **Use when** | Writing code | Testing feature | Live for customers |

---

## 📝 Daily Workflow in 5 Steps

```
STEP 1: Make Code Changes (DEV)
─────────────────────────────────
$ git checkout -b feature/my-feature
$ # Edit code in /home/admin/FiskAI/
$ # Save → browser refreshes instantly (HMR)
$ # See changes on http://100.64.123.81:3001
$ # Test locally

STEP 2: Commit & Push
─────────────────────
$ git add -A
$ git commit -m "feat: description of change"
$ git push origin feature/my-feature

STEP 3: Create Pull Request (GitHub)
─────────────────────────────────────
$ # Go to GitHub
$ # Create PR: feature/my-feature → main
$ # Team reviews
$ # Merge to main

STEP 4: Auto-Deploy to STAGING
───────────────────────────────
✅ Coolify webhook detects push to main
✅ Builds Docker image (3-5 min)
✅ Deploys to staging container
✅ You access: http://erp.metrica.hr:3002
✅ Test the feature

STEP 5: Manual Deploy to PRODUCTION
────────────────────────────────────
✅ Go to: https://git.metrica.hr (Coolify dashboard)
✅ Login: admin@example.com / SecurePass!123
✅ Click FiskAI app → "Deploy" button
✅ Wait 3-5 min
✅ Verify at: https://erp.metrica.hr (LIVE!)
```

---

## 🔑 Coolify Dashboard Quick Access

**URL:** https://git.metrica.hr

**Login:**
```
Email:    admin@example.com
Password: SecurePass!123
```

**Once logged in:**
1. Click "FiskAI" app
2. View deployments (shows all recent builds)
3. Click "Deploy" to trigger production deployment
4. Check "Logs" tab if deployment fails
5. Check "Settings" to view/update environment variables

---

## 🐚 Useful Terminal Commands

### Check Dev Server Status
```bash
# Is it running?
pgrep -f 'next dev'

# View live logs
tail -f /tmp/fiskai-dev.log

# Restart it
pkill -f 'next dev'
cd /home/admin/FiskAI
nohup npm run dev -- -p 3001 -H 0.0.0.0 > /tmp/fiskai-dev.log 2>&1 &
```

### Check Staging/Production Status
```bash
# View all containers
docker ps

# View FiskAI staging container logs
docker logs bsswgo8ggwgkw8c88wo8wcw8-215458880769 --tail 50 -f

# View Coolify logs
docker logs coolify --tail 100 -f
```

### Database Queries
```bash
# Open interactive Prisma Studio (web UI)
npx prisma studio

# Run raw SQL
docker exec -i fiskai-db psql -U fiskai -d fiskai << EOF
SELECT COUNT(*) FROM "EInvoice";
EOF

# Check migrations
npx prisma migrate status
```

### Building & Testing
```bash
# Check TypeScript errors
npm run build

# Run tests
npm run test

# Check linting
npm run lint
```

---

## 🆘 Troubleshooting

| Problem | Solution |
|---------|----------|
| Dev server not responding | `pkill -f 'next dev' && cd /home/admin/FiskAI && rm -rf .next && npm run dev` |
| Staging deploy failed | Check logs in Coolify: https://git.metrica.hr → FiskAI → Logs |
| Production won't deploy | Check API token expiry, may need new token in Coolify |
| Can't access http://100.64.123.81:3001 | Use SSH tunnel: `ssh -L 3001:localhost:3001 admin@vps-01` |
| Database connection error | Restart DB: `docker restart fiskai-db` |
| TypeScript build error | Run locally: `npm run build` (shows exact errors) |

---

## 🔐 Important Security Rules

1. **Never push `.env.local` to Git** (contains secrets)
2. **Coolify credentials are shared** – change password regularly
3. **Database is shared** across all environments – test data is visible to all
4. **API tokens expire** – regenerate in Coolify if deployments fail
5. **HTTPS only in production** – staging is HTTP (internal testing only)

---

## 📊 When Each Environment is Used

### DEV (http://100.64.123.81:3001)
- **You:** Writing code, testing features locally
- **Others:** Not normally accessing
- **Use case:** "Does my code work on my machine?"

### STAGING (http://erp.metrica.hr:3002)
- **You:** Testing complete features before prod
- **Others:** Team members can test together
- **Use case:** "Does this work in production-like environment?"

### PRODUCTION (https://erp.metrica.hr)
- **You:** Only after feature is tested & approved
- **Others:** Customers using the app
- **Use case:** "This is live for everyone"

---

## 💾 Database Notes

**All three environments use the SAME PostgreSQL database:**

```
DEV (port 3001)     ┐
STAGING (port 3002) ├─→ Same PostgreSQL (172.18.0.2:5432)
PRODUCTION (3002)   ┘

Data is SHARED!
```

**Implications:**
- Changes in DEV immediately visible in STAGING & PROD
- Test data gets mixed with production data
- **Be very careful with destructive operations**
- Use separate test companies/accounts for testing

---

## 🎯 Deployment Decision Tree

```
Should I deploy to production?

  ├─ Is the code tested on DEV?
  │  └─ NO: Keep developing on DEV
  │  └─ YES: Continue
  │
  ├─ Is the PR merged to main?
  │  └─ NO: Wait for merge, staging auto-deploys
  │  └─ YES: Continue
  │
  ├─ Did staging work correctly?
  │  └─ NO: Fix bugs, retest on DEV, commit, staging re-deploys
  │  └─ YES: Continue
  │
  ├─ Is it approved by Mislav (founder)?
  │  └─ NO: Wait for approval
  │  └─ YES: Continue
  │
  └─ DEPLOY TO PRODUCTION
     1. Go to https://git.metrica.hr
     2. Click FiskAI → "Deploy"
     3. Wait 3-5 min
     4. Verify at https://erp.metrica.hr
```

---

## 📞 Support

**Who to ask:**
- **Deployment issues:** Mislav
- **Feature design:** Mislav
- **Code architecture:** Check `src/` structure & existing patterns
- **Database questions:** See `prisma/schema.prisma`

---

## ✅ Checklist Before Production Deploy

- [ ] Code tested on DEV server (http://100.64.123.81:3001)
- [ ] PR reviewed & merged to main
- [ ] Staging auto-deployed & tested (http://erp.metrica.hr:3002)
- [ ] No database migrations failed
- [ ] No TypeScript build errors
- [ ] Approved by product owner (Mislav)
- [ ] Feature is complete (not partial)
- [ ] Ready to go live for customers

---

## 🚀 You're Ready!

Print this card. Reference it daily. After a week, you'll know the flow by heart.

**First deploy time: Exciting!**
**Hundredth deploy time: Routine!**