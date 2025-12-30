#!/bin/bash

# 1. Fix rate-limit.ts - add ADMIN_EXPORT rate limit
sed -i '77 a\  ADMIN_EXPORT: {\n    attempts: 10, // 10 tenant data exports per hour per admin\n    window: 60 * 60 * 1000, // 1 hour\n    blockDuration: 60 * 60 * 1000, // 1 hour block\n  },' src/lib/security/rate-limit.ts

# 2. Fix the extra closing brace (line 78)
sed -i '78s/  },//' src/lib/security/rate-limit.ts

# 3. Add imports to admin actions
sed -i '6 a\import { checkRateLimit } from "@/lib/security/rate-limit"\nimport { logAudit } from "@/lib/audit"' src/lib/admin/actions.ts

echo "Applied fixes for issue #723"
