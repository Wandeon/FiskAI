#!/bin/bash
# Build ARM64 image for VPS-01 deployment
# Usage: ./scripts/build-arm64.sh [tag]

set -e

TAG="${1:-latest}"
IMAGE="ghcr.io/wandeon/fiskai:${TAG}"

echo "🏗️  Building ARM64 image: ${IMAGE}"
echo "   Platform: linux/arm64"
echo "   Builder: multiarch"
echo ""

# Ensure multiarch builder is active
docker buildx use multiarch 2>/dev/null || docker buildx create --name multiarch --use

# Build and push ARM64 image
cd /home/admin/FiskAI
docker buildx build \
  --platform linux/arm64 \
  --tag "${IMAGE}" \
  --push \
  .

echo ""
echo "✅ Build complete: ${IMAGE}"
echo "   Run on VPS-01: docker pull ${IMAGE}"
