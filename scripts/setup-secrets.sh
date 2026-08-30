#!/usr/bin/env bash
# TRUETRAINNEO — Secret Manager + IAM setup.
#
# Creates the Gemini API key secret and grants the Cloud Run runtime service
# account permission to read it. Firebase Admin needs no secret: it uses the
# same service account's Application Default Credentials.
#
# Usage:
#   PROJECT_ID=my-project GEMINI_API_KEY=xxx ./scripts/setup-secrets.sh
set -euo pipefail

PROJECT_ID="${PROJECT_ID:?PROJECT_ID is required}"
REGION="${REGION:-asia-east1}"
SECRET_NAME="${SECRET_NAME:-GEMINI_API_KEY}"
SERVICE_NAME="${SERVICE_NAME:-truetrainneo}"

PROJECT_NUMBER="$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')"
RUNTIME_SA="${RUNTIME_SA:-${PROJECT_NUMBER}-compute@developer.gserviceaccount.com}"

echo "Project : $PROJECT_ID ($PROJECT_NUMBER)"
echo "Region  : $REGION"
echo "Runtime : $RUNTIME_SA"

echo "==> Enabling required APIs"
gcloud services enable \
  run.googleapis.com \
  secretmanager.googleapis.com \
  firestore.googleapis.com \
  cloudbuild.googleapis.com \
  aiplatform.googleapis.com \
  generativelanguage.googleapis.com \
  --project "$PROJECT_ID"

echo "==> Creating secret $SECRET_NAME (ignored if it already exists)"
gcloud secrets create "$SECRET_NAME" \
  --replication-policy="automatic" \
  --project "$PROJECT_ID" 2>/dev/null || echo "    already exists"

if [[ -n "${GEMINI_API_KEY:-}" ]]; then
  echo "==> Adding a new secret version"
  # printf avoids the trailing newline that echo would store inside the secret.
  printf '%s' "$GEMINI_API_KEY" | gcloud secrets versions add "$SECRET_NAME" \
    --data-file=- --project "$PROJECT_ID"
else
  echo "==> GEMINI_API_KEY not set; skipping version upload"
  echo "    printf '%s' 'YOUR_KEY' | gcloud secrets versions add $SECRET_NAME --data-file=-"
fi

echo "==> Granting secretAccessor on this secret only (not project-wide)"
gcloud secrets add-iam-policy-binding "$SECRET_NAME" \
  --member="serviceAccount:${RUNTIME_SA}" \
  --role="roles/secretmanager.secretAccessor" \
  --project "$PROJECT_ID"

echo "==> Granting Firestore access to the runtime service account"
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:${RUNTIME_SA}" \
  --role="roles/datastore.user" \
  --condition=None

echo "==> Granting Firebase Auth admin access (session cookies, token verify)"
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:${RUNTIME_SA}" \
  --role="roles/firebaseauth.admin" \
  --condition=None

echo
echo "Done. Verify after deploying with:"
echo "  curl -s https://<SERVICE_URL>/api/health | jq"
