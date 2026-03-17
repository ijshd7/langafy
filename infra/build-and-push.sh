#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────────
# Langafy — Build and Push Docker Images to Artifact Registry
#
# Builds the API and Web Docker images, tags them with the current git SHA
# and 'latest', then pushes both to GCP Artifact Registry.
#
# Prerequisites:
#   - Docker running locally
#   - gcloud authenticated (gcloud auth login)
#   - GCP project set up (infra/gcp-setup.sh already run)
#   - .env file at repo root with NEXT_PUBLIC_* Firebase values
#
# Usage:
#   chmod +x infra/build-and-push.sh
#   ./infra/build-and-push.sh
# ──────────────────────────────────────────────────────────────────────────────
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

info()    { echo -e "${BLUE}[INFO]${NC}  $*"; }
success() { echo -e "${GREEN}[OK]${NC}    $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error()   { echo -e "${RED}[ERROR]${NC} $*" >&2; }
step()    { echo -e "\n${CYAN}━━━ $* ━━━${NC}"; }

# ── Resolve repo root ────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "$REPO_ROOT"
info "Repo root: $REPO_ROOT"

# ── Preflight checks ─────────────────────────────────────────────────────────
step "Preflight Checks"

if ! command -v docker &>/dev/null; then
  error "Docker not found. Install Docker Desktop: https://www.docker.com/products/docker-desktop"
  exit 1
fi

if ! docker info &>/dev/null; then
  error "Docker daemon is not running. Start Docker Desktop and try again."
  exit 1
fi
success "Docker is running."

if ! command -v gcloud &>/dev/null; then
  error "gcloud CLI not found. Run infra/gcp-setup.sh first."
  exit 1
fi

if ! gcloud auth list --filter="status:ACTIVE" --format="value(account)" 2>/dev/null | grep -q '@'; then
  error "Not authenticated. Run: gcloud auth login"
  exit 1
fi
success "gcloud authenticated."

# ── Load .env for Firebase build args ────────────────────────────────────────
# NEXT_PUBLIC_* vars are baked into the Next.js bundle at build time.
# The web image needs them as Docker build args.
ENV_FILE="$REPO_ROOT/.env"
if [[ -f "$ENV_FILE" ]]; then
  info "Loading NEXT_PUBLIC_* vars from .env..."
  # Export only NEXT_PUBLIC_* lines (skip comments and blanks)
  set -a
  # shellcheck disable=SC1090
  source <(grep -E '^NEXT_PUBLIC_' "$ENV_FILE" | grep -v '^#')
  set +a
  success "Firebase config loaded from .env."
else
  warn ".env file not found at repo root."
  warn "The web image will be built without Firebase config (NEXT_PUBLIC_* vars)."
  warn "Copy .env.example to .env and fill in your Firebase values first."
fi

# ── Collect config ────────────────────────────────────────────────────────────
step "Configuration"

read -rp "GCP Project ID: " PROJECT_ID
if [[ -z "$PROJECT_ID" ]]; then error "Project ID is required."; exit 1; fi

read -rp "GCP Region [us-central1]: " GCP_REGION
GCP_REGION="${GCP_REGION:-us-central1}"

AR_REPO="langafy-images"
AR_URL="${GCP_REGION}-docker.pkg.dev/${PROJECT_ID}/${AR_REPO}"

# Tag images with git SHA for traceability + 'latest' for convenience
GIT_SHA=$(git rev-parse --short HEAD 2>/dev/null || echo "local")
info "Git SHA: $GIT_SHA"
info "Artifact Registry: $AR_URL"

echo ""
info "Will build and push:"
info "  API: ${AR_URL}/langafy-api:${GIT_SHA}"
info "  Web: ${AR_URL}/langafy-web:${GIT_SHA}"
echo ""
read -rp "Proceed? (y/N): " CONFIRM
if [[ "$CONFIRM" != "y" && "$CONFIRM" != "Y" ]]; then
  info "Aborted."
  exit 0
fi

# ── Configure Docker auth for Artifact Registry ───────────────────────────────
step "Configuring Docker Authentication"

info "Authorizing Docker to push to ${GCP_REGION}-docker.pkg.dev..."
gcloud auth configure-docker "${GCP_REGION}-docker.pkg.dev" --quiet
success "Docker configured for Artifact Registry."

# ── Build API image ───────────────────────────────────────────────────────────
step "Building API Image"

API_IMAGE="${AR_URL}/langafy-api"

info "Building from context: $REPO_ROOT"
info "Dockerfile: apps/api/LangafyApi/Dockerfile"

docker build \
  --file apps/api/LangafyApi/Dockerfile \
  --tag "${API_IMAGE}:${GIT_SHA}" \
  --tag "${API_IMAGE}:latest" \
  --platform linux/amd64 \
  .

success "API image built."

# ── Build Web image ───────────────────────────────────────────────────────────
step "Building Web Image"

WEB_IMAGE="${AR_URL}/langafy-web"

info "Building from context: $REPO_ROOT"
info "Dockerfile: apps/web/Dockerfile"

docker build \
  --file apps/web/Dockerfile \
  --tag "${WEB_IMAGE}:${GIT_SHA}" \
  --tag "${WEB_IMAGE}:latest" \
  --platform linux/amd64 \
  --build-arg NEXT_PUBLIC_FIREBASE_API_KEY="${NEXT_PUBLIC_FIREBASE_API_KEY:-}" \
  --build-arg NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="${NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN:-}" \
  --build-arg NEXT_PUBLIC_FIREBASE_PROJECT_ID="${NEXT_PUBLIC_FIREBASE_PROJECT_ID:-}" \
  --build-arg NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="${NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET:-}" \
  --build-arg NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="${NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID:-}" \
  --build-arg NEXT_PUBLIC_FIREBASE_APP_ID="${NEXT_PUBLIC_FIREBASE_APP_ID:-}" \
  --build-arg NEXT_PUBLIC_API_URL="${NEXT_PUBLIC_API_URL:-}" \
  .

success "Web image built."

# ── Push images ───────────────────────────────────────────────────────────────
step "Pushing Images to Artifact Registry"

info "Pushing API image..."
docker push "${API_IMAGE}:${GIT_SHA}"
docker push "${API_IMAGE}:latest"
success "API image pushed."

info "Pushing Web image..."
docker push "${WEB_IMAGE}:${GIT_SHA}"
docker push "${WEB_IMAGE}:latest"
success "Web image pushed."

# ── Summary ───────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  Build and Push Complete!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "  ${CYAN}API image:${NC}  ${API_IMAGE}:${GIT_SHA}"
echo -e "  ${CYAN}Web image:${NC}  ${WEB_IMAGE}:${GIT_SHA}"
echo ""
echo -e "  ${YELLOW}Next steps:${NC}"
echo -e "  • 3 — Create Cloud SQL PostgreSQL instance"
echo -e "  • 4 — Store secrets in Secret Manager"
echo -e "  • 5 — Create VPC Connector"
echo -e "  • 6 — Deploy API to Cloud Run (use image tag: ${GIT_SHA})"
echo ""
