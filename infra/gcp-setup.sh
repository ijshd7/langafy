#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────────
# Langafy — GCP Project Setup Script
#
# Creates and configures a GCP project for Langafy deployment.
# Safe to run multiple times (idempotent).
#
# Prerequisites:
#   1. gcloud CLI installed          (brew install --cask google-cloud-sdk)
#   2. Logged in                     (gcloud auth login)
#   3. A billing account exists      (console.cloud.google.com/billing)
#
# Usage:
#   chmod +x infra/gcp-setup.sh
#   ./infra/gcp-setup.sh
# ──────────────────────────────────────────────────────────────────────────────
set -euo pipefail

# ── Colors for output ────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

info()    { echo -e "${BLUE}[INFO]${NC}  $*"; }
success() { echo -e "${GREEN}[OK]${NC}    $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error()   { echo -e "${RED}[ERROR]${NC} $*" >&2; }
step()    { echo -e "\n${CYAN}━━━ $* ━━━${NC}"; }

# ── Preflight check ─────────────────────────────────────────────────────────
if ! command -v gcloud &>/dev/null; then
  error "gcloud CLI not found. Install it first:"
  error "  brew install --cask google-cloud-sdk"
  exit 1
fi

# Check if user is authenticated
if ! gcloud auth list --filter="status:ACTIVE" --format="value(account)" 2>/dev/null | head -1 | grep -q '@'; then
  error "Not authenticated. Run: gcloud auth login"
  exit 1
fi

ACTIVE_ACCOUNT=$(gcloud auth list --filter="status:ACTIVE" --format="value(account)" 2>/dev/null | head -1)
info "Authenticated as: ${ACTIVE_ACCOUNT}"

# ── Collect inputs ───────────────────────────────────────────────────────────
step "Configuration"

read -rp "GCP Project ID (globally unique, e.g. langafy-is-z9y3): " PROJECT_ID
if [[ -z "$PROJECT_ID" ]]; then
  error "Project ID is required."
  exit 1
fi

# Check if project already exists
if gcloud projects describe "$PROJECT_ID" &>/dev/null; then
  warn "Project '$PROJECT_ID' already exists. Will configure it (idempotent)."
  PROJECT_EXISTS=true
else
  PROJECT_EXISTS=false
fi

read -rp "Billing Account ID (format: XXXXXX-XXXXXX-XXXXXX): " BILLING_ACCOUNT
if [[ -z "$BILLING_ACCOUNT" ]]; then
  error "Billing Account ID is required."
  exit 1
fi

read -rp "GCP Region [us-central1]: " GCP_REGION
GCP_REGION=${GCP_REGION:-us-central1}

read -rp "GitHub repo (owner/repo, e.g. ijshd7/langafy): " GITHUB_REPO
if [[ -z "$GITHUB_REPO" ]]; then
  error "GitHub repo is required for Workload Identity Federation."
  exit 1
fi

echo ""
info "Configuration summary:"
info "  Project ID:      $PROJECT_ID"
info "  Billing Account: $BILLING_ACCOUNT"
info "  Region:          $GCP_REGION"
info "  GitHub Repo:     $GITHUB_REPO"
echo ""
read -rp "Proceed? (y/N): " CONFIRM
if [[ "$CONFIRM" != "y" && "$CONFIRM" != "Y" ]]; then
  info "Aborted."
  exit 0
fi

# ── 1. Create GCP Project ───────────────────────────────────────────────────
step "1/7 — Create GCP Project"

if [[ "$PROJECT_EXISTS" == "false" ]]; then
  info "Creating project '$PROJECT_ID'..."
  gcloud projects create "$PROJECT_ID" --name="Langafy"
  success "Project created."
else
  success "Project already exists — skipping creation."
fi

# Set as active project for all subsequent commands
gcloud config set project "$PROJECT_ID"
success "Active project set to '$PROJECT_ID'."

# ── 2. Link Billing Account ─────────────────────────────────────────────────
step "2/7 — Link Billing Account"

info "Linking billing account '$BILLING_ACCOUNT' to project..."
gcloud billing projects link "$PROJECT_ID" --billing-account="$BILLING_ACCOUNT"
success "Billing account linked."

# Resolve project number now — used to construct WIF resource names later
# (avoids describe calls that race with GCP propagation)
PROJECT_NUMBER=$(gcloud projects describe "$PROJECT_ID" --format="value(projectNumber)")
info "Project number: $PROJECT_NUMBER"

# ── 3. Enable Required APIs ─────────────────────────────────────────────────
step "3/7 — Enable GCP APIs"

APIS=(
  "run.googleapis.com"                    # Cloud Run (serverless containers)
  "sqladmin.googleapis.com"               # Cloud SQL Admin (managed PostgreSQL)
  "artifactregistry.googleapis.com"       # Artifact Registry (Docker images)
  "secretmanager.googleapis.com"          # Secret Manager (secure config)
  "vpcaccess.googleapis.com"              # VPC Access (Cloud Run → Cloud SQL)
  "iam.googleapis.com"                    # IAM (service accounts & permissions)
  "cloudresourcemanager.googleapis.com"   # Resource Manager (project metadata)
  "iamcredentials.googleapis.com"         # IAM Credentials (for WIF token exchange)
  "sts.googleapis.com"                    # Security Token Service (for WIF)
  "compute.googleapis.com"               # Compute Engine (needed for VPC networking)
)

info "Enabling ${#APIS[@]} APIs (this may take a minute or two)..."
for api in "${APIS[@]}"; do
  if gcloud services list --enabled --filter="name:$api" --format="value(name)" 2>/dev/null | grep -q "$api"; then
    success "  $api (already enabled)"
  else
    gcloud services enable "$api" --quiet
    success "  $api"
  fi
done

# ── 4. Create Service Accounts ───────────────────────────────────────────────
step "4/7 — Create Service Accounts"

create_service_account() {
  local SA_NAME="$1"
  local SA_DISPLAY="$2"
  local SA_EMAIL="${SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"

  if gcloud iam service-accounts describe "$SA_EMAIL" &>/dev/null; then
    success "  $SA_EMAIL (already exists)"
  else
    gcloud iam service-accounts create "$SA_NAME" \
      --display-name="$SA_DISPLAY" \
      --quiet
    success "  $SA_EMAIL (created)"
  fi
}

# API runner — needs Cloud SQL, Secret Manager, Cloud Run
create_service_account "langafy-api-runner" "Langafy API Cloud Run Runner"

# Web runner — needs Secret Manager (for build-time env vars), Cloud Run
create_service_account "langafy-web-runner" "Langafy Web Cloud Run Runner"

# ── 5. Assign IAM Roles to Service Accounts ──────────────────────────────────
step "5/7 — Assign IAM Roles"

API_SA="langafy-api-runner@${PROJECT_ID}.iam.gserviceaccount.com"
WEB_SA="langafy-web-runner@${PROJECT_ID}.iam.gserviceaccount.com"

bind_role() {
  local SA_EMAIL="$1"
  local ROLE="$2"
  local LABEL="$3"

  # gcloud add-iam-policy-binding is idempotent — safe to re-run
  gcloud projects add-iam-policy-binding "$PROJECT_ID" \
    --member="serviceAccount:${SA_EMAIL}" \
    --role="$ROLE" \
    --quiet \
    --no-user-output-enabled
  success "  ${LABEL}: ${ROLE}"
}

info "Granting roles to API service account..."
bind_role "$API_SA" "roles/run.invoker"            "api-runner"
bind_role "$API_SA" "roles/cloudsql.client"         "api-runner"  # Connect to Cloud SQL
bind_role "$API_SA" "roles/secretmanager.secretAccessor" "api-runner"  # Read secrets
bind_role "$API_SA" "roles/logging.logWriter"       "api-runner"  # Write structured logs

info "Granting roles to Web service account..."
bind_role "$WEB_SA" "roles/run.invoker"            "web-runner"
bind_role "$WEB_SA" "roles/secretmanager.secretAccessor" "web-runner"
bind_role "$WEB_SA" "roles/logging.logWriter"       "web-runner"

# ── 6. Create Artifact Registry ──────────────────────────────────────────────
step "6/7 — Create Artifact Registry Repository"

AR_REPO="langafy-images"

if gcloud artifacts repositories describe "$AR_REPO" \
    --location="$GCP_REGION" &>/dev/null; then
  success "Repository '$AR_REPO' already exists."
else
  gcloud artifacts repositories create "$AR_REPO" \
    --repository-format=docker \
    --location="$GCP_REGION" \
    --description="Langafy Docker images" \
    --quiet
  success "Repository '$AR_REPO' created."
fi

AR_URL="${GCP_REGION}-docker.pkg.dev/${PROJECT_ID}/${AR_REPO}"
info "Artifact Registry URL: ${AR_URL}"

# ── 7. Set Up Workload Identity Federation ───────────────────────────────────
step "7/7 — Set Up Workload Identity Federation (GitHub Actions → GCP)"

WIF_POOL="github-pool"
WIF_PROVIDER="github-provider"

# Create Workload Identity Pool
if gcloud iam workload-identity-pools describe "$WIF_POOL" \
    --location="global" &>/dev/null; then
  success "Workload Identity Pool '$WIF_POOL' already exists."
else
  info "Creating Workload Identity Pool..."
  gcloud iam workload-identity-pools create "$WIF_POOL" \
    --location="global" \
    --display-name="GitHub Actions Pool" \
    --description="Identity pool for GitHub Actions CI/CD" \
    --quiet
  success "Workload Identity Pool created."
fi

# Create OIDC Provider within the pool
if gcloud iam workload-identity-pools providers describe "$WIF_PROVIDER" \
    --workload-identity-pool="$WIF_POOL" \
    --location="global" &>/dev/null; then
  success "Provider '$WIF_PROVIDER' already exists."
else
  info "Creating OIDC Provider..."
  gcloud iam workload-identity-pools providers create-oidc "$WIF_PROVIDER" \
    --workload-identity-pool="$WIF_POOL" \
    --location="global" \
    --issuer-uri="https://token.actions.githubusercontent.com" \
    --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository,attribute.actor=assertion.actor" \
    --attribute-condition="assertion.repository == '${GITHUB_REPO}'" \
    --quiet
  success "OIDC Provider created (locked to repo '${GITHUB_REPO}')."
fi

# Construct resource names directly — avoids describe calls that race with GCP propagation
WIF_POOL_FULL="projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${WIF_POOL}"
WIF_PROVIDER_FULL="${WIF_POOL_FULL}/providers/${WIF_PROVIDER}"

# Allow GitHub Actions to impersonate the service accounts
info "Binding service accounts to Workload Identity Pool..."

for SA_EMAIL in "$API_SA" "$WEB_SA"; do
  SA_SHORT=$(echo "$SA_EMAIL" | cut -d@ -f1)
  gcloud iam service-accounts add-iam-policy-binding "$SA_EMAIL" \
    --role="roles/iam.workloadIdentityUser" \
    --member="principalSet://iam.googleapis.com/${WIF_POOL_FULL}/attribute.repository/${GITHUB_REPO}" \
    --quiet \
    --no-user-output-enabled
  success "  ${SA_SHORT} → GitHub Actions can impersonate"
done

# ── Summary ──────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  Setup Complete!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "  ${CYAN}Project ID:${NC}            $PROJECT_ID"
echo -e "  ${CYAN}Region:${NC}                $GCP_REGION"
echo -e "  ${CYAN}Artifact Registry:${NC}     $AR_URL"
echo -e "  ${CYAN}API Service Account:${NC}   $API_SA"
echo -e "  ${CYAN}Web Service Account:${NC}   $WEB_SA"
echo -e "  ${CYAN}WIF Provider:${NC}          $WIF_PROVIDER_FULL"
echo ""
echo -e "  ${YELLOW}Add these GitHub Repository Secrets:${NC}"
echo -e "  (Settings → Secrets and variables → Actions → New repository secret)"
echo ""
echo -e "  ${CYAN}GCP_PROJECT_ID${NC}                    = $PROJECT_ID"
echo -e "  ${CYAN}GCP_REGION${NC}                        = $GCP_REGION"
echo -e "  ${CYAN}GCP_WORKLOAD_IDENTITY_PROVIDER${NC}    = $WIF_PROVIDER_FULL"
echo -e "  ${CYAN}GCP_API_SERVICE_ACCOUNT${NC}           = $API_SA"
echo -e "  ${CYAN}GCP_WEB_SERVICE_ACCOUNT${NC}           = $WEB_SA"
echo ""
echo -e "  ${YELLOW}Next steps:${NC}"
echo -e "  • Step 2 — Build & push Docker images to Artifact Registry"
echo -e "  • Step 3 — Create Cloud SQL PostgreSQL instance"
echo -e "  • Step 4 — Store secrets in Secret Manager"
echo -e "  • Step 5 — Create VPC Connector"
echo ""
