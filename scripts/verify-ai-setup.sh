#!/bin/bash

# Verification script for Phase 16: AI/OCR Features
# Run with: bash scripts/verify-ai-setup.sh

echo "=================================="
echo "FiskAI - AI Features Verification"
echo "=================================="
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

ERRORS=0
WARNINGS=0

# Check 1: Core AI files
echo "1. Checking core AI library files..."
FILES=(
  "src/lib/ai/types.ts"
  "src/lib/ai/extract.ts"
  "src/lib/ai/ocr.ts"
  "src/lib/ai/categorize.ts"
  "src/lib/ai/index.ts"
)

for file in "${FILES[@]}"; do
  if [ -f "$file" ]; then
    echo -e "  ${GREEN}✓${NC} $file"
  else
    echo -e "  ${RED}✗${NC} $file (missing)"
    ((ERRORS++))
  fi
done
echo ""

# Check 2: API endpoints
echo "2. Checking API endpoints..."
API_FILES=(
  "src/app/api/ai/extract/route.ts"
  "src/app/api/ai/suggest-category/route.ts"
)

for file in "${API_FILES[@]}"; do
  if [ -f "$file" ]; then
    echo -e "  ${GREEN}✓${NC} $file"
  else
    echo -e "  ${RED}✗${NC} $file (missing)"
    ((ERRORS++))
  fi
done
echo ""

# Check 3: Components
echo "3. Checking UI components..."
COMPONENT_FILES=(
  "src/components/expense/receipt-scanner.tsx"
  "src/components/expense/expense-form-with-ai.tsx"
  "src/components/ui/badge.tsx"
)

for file in "${COMPONENT_FILES[@]}"; do
  if [ -f "$file" ]; then
    echo -e "  ${GREEN}✓${NC} $file"
  else
    echo -e "  ${RED}✗${NC} $file (missing)"
    ((ERRORS++))
  fi
done
echo ""

# Check 4: Dependencies
echo "4. Checking package.json dependencies..."
if grep -q '"openai"' package.json; then
  echo -e "  ${GREEN}✓${NC} openai package"
else
  echo -e "  ${RED}✗${NC} openai package (missing in package.json)"
  ((ERRORS++))
fi

if grep -q '"lucide-react"' package.json; then
  echo -e "  ${GREEN}✓${NC} lucide-react package"
else
  echo -e "  ${YELLOW}!${NC} lucide-react package (missing in package.json)"
  ((WARNINGS++))
fi
echo ""

# Check 5: Environment configuration
echo "5. Checking environment configuration..."
if [ -f ".env.example" ]; then
  if grep -q "OPENAI_API_KEY" .env.example; then
    echo -e "  ${GREEN}✓${NC} OPENAI_API_KEY in .env.example"
  else
    echo -e "  ${YELLOW}!${NC} OPENAI_API_KEY missing from .env.example"
    ((WARNINGS++))
  fi
else
  echo -e "  ${RED}✗${NC} .env.example file missing"
  ((ERRORS++))
fi

if [ -f ".env" ]; then
  if grep -q "OPENAI_API_KEY" .env; then
    if grep -q "OPENAI_API_KEY=sk-" .env; then
      echo -e "  ${GREEN}✓${NC} OPENAI_API_KEY configured in .env"
    else
      echo -e "  ${YELLOW}!${NC} OPENAI_API_KEY in .env but not set (add your key)"
      ((WARNINGS++))
    fi
  else
    echo -e "  ${YELLOW}!${NC} OPENAI_API_KEY missing from .env"
    ((WARNINGS++))
  fi
else
  echo -e "  ${YELLOW}!${NC} .env file not found (copy from .env.example)"
  ((WARNINGS++))
fi
echo ""

# Check 6: Documentation
echo "6. Checking documentation..."
DOC_FILES=(
  "docs/AI_FEATURES.md"
  "docs/AI_QUICK_START.md"
  "PHASE_16_IMPLEMENTATION.md"
)

for file in "${DOC_FILES[@]}"; do
  if [ -f "$file" ]; then
    echo -e "  ${GREEN}✓${NC} $file"
  else
    echo -e "  ${YELLOW}!${NC} $file (missing)"
    ((WARNINGS++))
  fi
done
echo ""

# Summary
echo "=================================="
echo "Verification Summary"
echo "=================================="
if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
  echo -e "${GREEN}✓ All checks passed!${NC}"
  echo ""
  echo "Next steps:"
  echo "1. Install dependencies: npm install"
  echo "2. Add your OpenAI API key to .env"
  echo "3. Start dev server: npm run dev"
  echo "4. Test at: http://localhost:3000/expenses/new"
  exit 0
elif [ $ERRORS -eq 0 ]; then
  echo -e "${YELLOW}! $WARNINGS warning(s) found${NC}"
  echo ""
  echo "The setup is functional but some optional items are missing."
  echo "Check the warnings above for details."
  exit 0
else
  echo -e "${RED}✗ $ERRORS error(s) and $WARNINGS warning(s) found${NC}"
  echo ""
  echo "Please fix the errors above before proceeding."
  exit 1
fi
