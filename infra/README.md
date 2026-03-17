# Langafy — GCP Infrastructure Setup

A step-by-step guide to provisioning the Google Cloud Platform resources Langafy
needs. Designed for someone with minimal GCP experience.

> **Cost expectation:** Cloud Run scales to zero (free when idle). The main
> ongoing cost is Cloud SQL `db-f1-micro` at ~$7–10/month. GCP's free tier
> covers most other services at MVP scale.

---

## Prerequisites (manual — do these first)

### 1. Google Cloud account

If you don't already have one, create a Google Cloud account at
<https://cloud.google.com>. New accounts get **$300 in free credits** for
90 days.

### 2. Install the `gcloud` CLI

The `gcloud` CLI is how you interact with GCP from your terminal (like `aws`
for AWS or `az` for Azure).

```bash
# macOS (Homebrew)
brew install --cask google-cloud-sdk
```

After install, verify it works:

```bash
gcloud --version
```

### 3. Log in to GCP

```bash
gcloud auth login
```

This opens a browser window. Sign in with the Google account you want to use.

### 4. Create a billing account

GCP requires a billing account linked to your project (even with free credits).

1. Go to <https://console.cloud.google.com/billing>
2. Click **Create Account** (or use the one auto-created with your free trial)
3. Note the **Billing Account ID** — it looks like `01ABCD-234EFG-567HIJ`

You'll pass this to the setup script so it can link your project automatically.

### 5. Choose a GCP Project ID

Your project ID must be globally unique across all of GCP. It becomes part of
URLs and can **never be changed** after creation. Good pattern:

```
langafy-{your-initials}-{random}   →   e.g. langafy-is-x7k2
```

### 6. Know your GitHub repository

The setup script configures Workload Identity Federation so GitHub Actions can
deploy to GCP without storing any secrets. For this, it needs your GitHub repo
in `owner/repo` format (e.g. `isherrill/langafy`).

---

## Automated Setup

Once you have the prerequisites, the setup script handles everything:

```bash
# From the repo root:
chmod +x infra/gcp-setup.sh
./infra/gcp-setup.sh
```

The script will prompt you for:

| Prompt             | Example value          | Notes                                  |
| ------------------ | ---------------------- | -------------------------------------- |
| GCP Project ID     | `langafy-is-x7k2`      | Globally unique, lowercase, hyphens ok |
| Billing Account ID | `01ABCD-234EFG-567HIJ` | From step 4 above                      |
| GCP Region         | `us-central1`          | Default is fine for MVP                |
| GitHub repo        | `isherrill/langafy`    | `owner/repo` format                    |

### What the script creates

1. **GCP Project** — a container for all your resources
2. **Enabled APIs** — Cloud Run, Cloud SQL, Artifact Registry, Secret Manager,
   VPC Access, IAM, and Cloud Resource Manager
3. **Service Accounts** (two, with minimal permissions):
   - `langafy-api-runner` — used by Cloud Run API service
   - `langafy-web-runner` — used by Cloud Run web service
4. **Artifact Registry** — a private Docker image repository (`langafy-images`)
5. **Workload Identity Federation** — lets GitHub Actions authenticate to GCP
   using OIDC tokens (no long-lived keys)

### What the script does NOT create (later steps)

These are more complex resources created in Steps 9.2–9.5:

- Cloud SQL instance (Step 9.3)
- VPC Connector for private networking (Step 9.5)
- Secret Manager secrets with actual values (Step 9.4)
- Cloud Run service deployments (Steps 9.6–9.7)

---

## After Running the Script

The script prints a summary of values you'll need. Save them! They include:

- **Workload Identity Provider** — goes into GitHub Actions secrets
- **Service Account emails** — used when deploying Cloud Run services
- **Artifact Registry URL** — where Docker images are pushed

### GitHub Repository Secrets to Set

After the script completes, add these secrets to your GitHub repository
(Settings → Secrets and variables → Actions → New repository secret):

| Secret name                      | Value (printed by script)                              |
| -------------------------------- | ------------------------------------------------------ |
| `GCP_PROJECT_ID`                 | Your project ID                                        |
| `GCP_REGION`                     | The region you chose (e.g. `us-central1`)              |
| `GCP_WORKLOAD_IDENTITY_PROVIDER` | The full provider resource name                        |
| `GCP_API_SERVICE_ACCOUNT`        | `langafy-api-runner@{project}.iam.gserviceaccount.com` |
| `GCP_WEB_SERVICE_ACCOUNT`        | `langafy-web-runner@{project}.iam.gserviceaccount.com` |

---

## Teardown

To delete everything and stop all billing:

```bash
gcloud projects delete PROJECT_ID
```

This is irreversible. It deletes the project and all resources within it.

---

## Troubleshooting

### "You don't have permission"

Make sure you're authenticated and the project is set:

```bash
gcloud auth login
gcloud config set project YOUR_PROJECT_ID
```

### "Billing account not found"

Double-check your billing account ID at
<https://console.cloud.google.com/billing>. The format is `XXXXXX-XXXXXX-XXXXXX`.

### "API not enabled"

The setup script enables all required APIs, but propagation can take 30–60
seconds. If a subsequent command fails with "API not enabled", wait a minute
and re-run the script — it's idempotent (safe to run multiple times).

### Workload Identity Federation issues

If GitHub Actions can't authenticate:

1. Verify the repository name matches exactly (case-sensitive)
2. Check that the Workload Identity Pool and Provider exist:
   ```bash
   gcloud iam workload-identity-pools list --location=global
   gcloud iam workload-identity-pools providers list \
     --workload-identity-pool=github-pool --location=global
   ```
3. Verify the service account IAM binding:
   ```bash
   gcloud iam service-accounts get-iam-policy \
     langafy-api-runner@PROJECT_ID.iam.gserviceaccount.com
   ```
