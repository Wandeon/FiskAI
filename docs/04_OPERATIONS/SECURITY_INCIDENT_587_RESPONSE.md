# Security Incident #587: Response Plan

**Status:** CRITICAL
**Date:** 2025-12-30
**Issue:** [#587](https://github.com/your-org/FiskAI/issues/587)

## Summary

Production secrets committed to Git history in commits `18888e80`, `a5e516f0`, `e85472d1`, `7bb1d805`.

## Exposed Credentials

| Secret                   | Risk | Impact             |
| ------------------------ | ---- | ------------------ |
| POSTGRES_PASSWORD        | P0   | Database access    |
| NEXTAUTH_SECRET          | P0   | Session hijacking  |
| EINVOICE_KEY_SECRET      | P0   | Invoice decryption |
| FISCAL_CERT_KEY          | P0   | Certificate access |
| CLOUDFLARE_DNS_API_TOKEN | P0   | DNS hijacking      |
| COOLIFY_API_TOKEN        | P0   | Deployment control |
| RESEND_API_KEY           | P1   | Email abuse        |
| CRON_SECRET              | P1   | Unauthorized jobs  |
| OPENAI_API_KEY           | P2   | API cost abuse     |
| DEEPSEEK_API_KEY         | P2   | API cost abuse     |
| OLLAMA_API_KEY           | P2   | API cost abuse     |

## Response Actions

### Phase 1: Credential Rotation (DO FIRST)

**Critical: Rotate ALL credentials BEFORE cleaning history**

```bash
# 1. Database
NEW_PG_PASSWORD=$(openssl rand -hex 32)
docker exec fiskai-db psql -U fiskai -d fiskai -c "ALTER USER fiskai WITH PASSWORD '$NEW_PG_PASSWORD';"
# Update in Coolify: POSTGRES_PASSWORD, DATABASE_URL

# 2. NextAuth (invalidates sessions)
NEW_NEXTAUTH=$(openssl rand -hex 32)
# Update in Coolify: NEXTAUTH_SECRET

# 3. Encryption (requires migration)
NEW_EINVOICE_KEY=$(openssl rand -hex 32)
NEW_FISCAL_KEY=$(openssl rand -hex 32)
# Run migration scripts first
# Update in Coolify: EINVOICE_KEY_SECRET, FISCAL_CERT_KEY

# 4. Cron
NEW_CRON_SECRET=$(openssl rand -hex 32)
# Update in Coolify: CRON_SECRET

# 5. Third-party APIs
# Revoke old keys, create new:
# - Resend: https://resend.com/api-keys
# - Cloudflare: https://dash.cloudflare.com/profile/api-tokens
# - Coolify: http://152.53.146.3:8000/security/api-tokens
# - OpenAI: https://platform.openai.com/api-keys
# - DeepSeek: https://platform.deepseek.com
# - Ollama: https://ollama.com/settings/keys
```

### Phase 2: Git History Cleanup

```bash
pip install git-filter-repo

# Dry run
./scripts/security/remove-secrets-from-history.sh --dry-run

# After team coordination
./scripts/security/remove-secrets-from-history.sh

# Force push
git push --force --all
git push --force --tags
```

Team members:

```bash
git fetch --all
git reset --hard origin/main
```

### Phase 3: Prevention

```bash
./scripts/security/install-git-hooks.sh
```

## Verification

- [ ] All credentials rotated
- [ ] Services tested
- [ ] Git history cleaned
- [ ] Team repos updated
- [ ] Hooks installed
- [ ] GitHub secret scanning enabled

## Future Improvements

- GitHub Advanced Security
- Automated credential rotation
- HashiCorp Vault
- Quarterly security audits

---

**Owner:** Security Team
**Updated:** 2025-12-30
