#!/bin/bash
# Build ARM64 image locally, push to GHCR, deploy to VPS-01
# Usage: ./scripts/deploy-to-vps01.sh [tag]

set -e

TAG="${1:-latest}"
IMAGE="ghcr.io/wandeon/fiskai:${TAG}"
VPS="admin@vps-01"

echo "═══════════════════════════════════════════════════════════"
echo "  FiskAI Deployment Pipeline"
echo "═══════════════════════════════════════════════════════════"
echo ""

# Step 1: Build
echo "📦 Step 1/4: Building ARM64 image..."
cd /home/admin/FiskAI
docker buildx use multiarch 2>/dev/null || docker buildx create --name multiarch --use
docker buildx build \
  --platform linux/arm64 \
  --tag "${IMAGE}" \
  --push \
  .

echo "✅ Image pushed: ${IMAGE}"
echo ""

# Step 2: Pull on VPS-01
echo "📥 Step 2/4: Pulling image on VPS-01..."
ssh ${VPS} "docker pull ${IMAGE}"
echo ""

# Step 3: Get current container info
echo "🔍 Step 3/4: Getting current container configuration..."
CURRENT_CONTAINER=$(ssh ${VPS} "docker ps --filter 'name=bsswgo8ggwgkw8c88wo8wcw8' --format '{{.Names}}' | head -1")
echo "   Current container: ${CURRENT_CONTAINER}"

if [ -z "${CURRENT_CONTAINER}" ]; then
  echo "❌ Error: FiskAI container not found on VPS-01"
  echo "   Use Coolify dashboard to deploy manually"
  exit 1
fi

# Step 4: Trigger Coolify rebuild via webhook (if available) or notify
echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  ✅ Image ready on VPS-01: ${IMAGE}"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "To complete deployment, either:"
echo "  1. Go to https://ci.fiskai.hr → FiskAI → Restart/Redeploy"
echo "  2. Or configure Coolify to use: ${IMAGE}"
echo ""
echo "To configure Coolify for pre-built images:"
echo "  • Application → General → Source: 'Docker Image'"
echo "  • Image: ${IMAGE}"
echo "  • Save and Deploy"
