#!/bin/bash
#
# Migration script for GitHub Issue #692: Standardize API Error Responses
#
# This script automatically updates API routes to use the new apiError() utility
# from /src/lib/api-error.ts instead of inconsistent error patterns.
#
# Usage:
#   ./scripts/migrate-api-error-responses.sh [--dry-run]
#
# Options:
#   --dry-run    Show what would be changed without modifying files
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counters
TOTAL_FILES=0
UPDATED_FILES=0
SKIPPED_FILES=0

# Check if dry run
DRY_RUN=false
if [[ "$1" == "--dry-run" ]]; then
  DRY_RUN=true
  echo -e "${YELLOW}Running in DRY RUN mode - no files will be modified${NC}\n"
fi

echo "======================================================================"
echo "API Error Response Migration (Issue #692)"
echo "======================================================================"
echo ""

# Function to check if file needs migration
needs_migration() {
  local file="$1"

  # Skip if already has apiError import
  if grep -q "import.*apiError" "$file" 2>/dev/null; then
    return 1
  fi

  # Check if has 500 errors
  if grep -q "{ status: 500 }" "$file" 2>/dev/null; then
    return 0
  fi

  # Check if has 401/403 errors that could be improved
  if grep -E -q "{ status: 40[13] }" "$file" 2>/dev/null; then
    return 0
  fi

  return 1
}

# Function to migrate a single file
migrate_file() {
  local file="$1"
  local temp_file=$(mktemp)

  echo -e "${GREEN}✓${NC} Processing: ${file#/home/admin/FiskAI/}"

  # Create backup
  cp "$file" "$temp_file"

  # Step 1: Add import after last import statement
  # Find the line number of the last import
  last_import_line=$(grep -n "^import " "$file" | tail -1 | cut -d: -f1)

  if [ -n "$last_import_line" ]; then
    # Add apiError import after last import
    sed -i "${last_import_line}a\\import { apiError, ApiErrors } from \"@/lib/api-error\"" "$file"
  fi

  # Step 2: Replace error patterns

  # Pattern 1: error instanceof Error ? error.message : "..."
  perl -i -pe 's/return NextResponse\.json\(\s*\{\s*error:\s*error instanceof Error \? error\.message : [^}]+\},\s*\{\s*status:\s*500\s*\}\s*\)/return apiError(error)/g' "$file"

  # Pattern 2: Generic "Internal server error"
  perl -i -pe 's/return NextResponse\.json\(\s*\{\s*error:\s*"Internal server error"\s*\},\s*\{\s*status:\s*500\s*\}\s*\)/return apiError(error)/g' "$file"

  # Pattern 3: With details field
  perl -i -pe 's/return NextResponse\.json\(\s*\{\s*error:[^,]+,\s*details:[^}]+\},\s*\{\s*status:\s*500\s*\}\s*\)/return apiError(error)/g' "$file"

  # Pattern 4: Simple 500 with custom message
  perl -i -pe 's/return NextResponse\.json\(\s*\{\s*error:\s*"[^"]+"\s*\},\s*\{\s*status:\s*500\s*\}\s*\)/return apiError(error)/g' "$file"

  # Pattern 5: 401 Unauthorized
  perl -i -pe 's/return NextResponse\.json\(\s*\{\s*error:\s*"Unauthorized"\s*\},\s*\{\s*status:\s*401\s*\}\s*\)/return ApiErrors.unauthorized()/g' "$file"

  # Pattern 6: 403 Forbidden
  perl -i -pe 's/return NextResponse\.json\(\s*\{\s*error:\s*"Forbidden"\s*\},\s*\{\s*status:\s*403\s*\}\s*\)/return ApiErrors.forbidden()/g' "$file"

  # Check if file actually changed
  if diff -q "$temp_file" "$file" > /dev/null 2>&1; then
    # No changes made, restore original
    mv "$temp_file" "$file"
    return 1
  else
    rm "$temp_file"
    return 0
  fi
}

# Find all route.ts files in src/app/api
while IFS= read -r -d '' file; do
  ((TOTAL_FILES++))

  if needs_migration "$file"; then
    if [ "$DRY_RUN" = true ]; then
      echo -e "${YELLOW}Would update:${NC} ${file#/home/admin/FiskAI/}"
      ((UPDATED_FILES++))
    else
      if migrate_file "$file"; then
        ((UPDATED_FILES++))
      else
        ((SKIPPED_FILES++))
      fi
    fi
  else
    ((SKIPPED_FILES++))
  fi
done < <(find /home/admin/FiskAI/src/app/api -name "route.ts" -type f -print0)

echo ""
echo "======================================================================"
echo "Migration Summary"
echo "======================================================================"
echo "Total files scanned:  $TOTAL_FILES"
echo "Files updated:        $UPDATED_FILES"
echo "Files skipped:        $SKIPPED_FILES"
echo "======================================================================"

if [ "$DRY_RUN" = true ]; then
  echo ""
  echo -e "${YELLOW}This was a DRY RUN - no files were modified${NC}"
  echo "Run without --dry-run to apply changes"
elif [ "$UPDATED_FILES" -gt 0 ]; then
  echo ""
  echo -e "${GREEN}✓ Migration completed successfully!${NC}"
  echo ""
  echo "Next steps:"
  echo "1. Review changes: git diff"
  echo "2. Test the application"
  echo "3. Commit: git add -A && git commit -m 'fix: standardize API error responses (closes #692)'"
else
  echo ""
  echo "No files needed migration."
fi
