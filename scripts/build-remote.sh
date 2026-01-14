#!/bin/bash
# Build FiskAI on VPS-01 with resource limits
# Triggers a limited build remotely and waits for completion
#
# Usage: ./scripts/build-remote.sh [tag]

set -e

TAG="${1:-latest}"
VPS="admin@vps-01"
IMAGE="ghcr.io/wandeon/fiskai:${TAG}"

echo "═══════════════════════════════════════════════════════════"
echo "  Remote Build on VPS-01 (Resource Limited)"
echo "═══════════════════════════════════════════════════════════"
echo "  Target: ${VPS}"
echo "  Image:  ${IMAGE}"
echo "  Limits: 4 CPUs, 8GB RAM"
echo ""

# Check VPS load before starting
LOAD=$(ssh ${VPS} "cat /proc/loadavg | cut -d' ' -f1")
echo "📊 Current VPS-01 load: ${LOAD}"

if (( $(echo "$LOAD > 5" | bc -l) )); then
  echo "⚠️  Warning: High load on VPS-01 (${LOAD})"
  read -p "Continue anyway? [y/N] " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi

# Sync code first
echo ""
echo "📦 Syncing code to VPS-01..."
rsync -avz --exclude 'node_modules' --exclude '.next' --exclude '.git' \
  /home/admin/FiskAI/ ${VPS}:/home/admin/FiskAI/

# Run build on VPS-01
echo ""
echo "🔨 Starting build on VPS-01..."
ssh -t ${VPS} "\
  docker build \
    --cpuset-cpus='0-3' \
    --memory='8g' \
    --memory-swap='10g' \
    -t '${IMAGE}' \
    . && \
  docker push '${IMAGE}'"

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  ✅ Build and push complete!"
echo "  Image: ${IMAGE}"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "To deploy via Coolify, run:"
echo "  ssh ${VPS} 'docker pull ${IMAGE}'"
echo "  Then restart via Coolify dashboard"
