<#
.SYNOPSIS
  TRUETRAINNEO - Secret Manager + IAM setup (Windows PowerShell).

.DESCRIPTION
  PowerShell equivalent of scripts/setup-secrets.sh. Creates the Gemini API key
  secret and grants the Cloud Run runtime service account permission to read it.
  Firebase Admin needs no secret: it uses the same service account's Application
  Default Credentials.

  The secret is written through a temporary file rather than a pipe. Piping a
  string into `gcloud ... --data-file=-` on Windows PowerShell stores the text
  as UTF-16 with a byte-order mark and a trailing newline, all of which end up
  INSIDE the secret and make the API key silently invalid.

.EXAMPLE
  .\scripts\setup-secrets.ps1 -ProjectId my-project -GeminiApiKey AIza...

.EXAMPLE
  .\scripts\setup-secrets.ps1 -ProjectId my-project
  # Creates the secret and bindings without uploading a key version.
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$ProjectId,

    [string]$GeminiApiKey = "",
    [string]$Region = "asia-east1",
    [string]$SecretName = "GEMINI_API_KEY",
    [string]$RuntimeServiceAccount = ""
)

$ErrorActionPreference = "Stop"

function Assert-LastExitCode {
    param([string]$What)
    if ($LASTEXITCODE -ne 0) {
        throw "$What failed with exit code $LASTEXITCODE"
    }
}

Write-Host "==> Resolving project number" -ForegroundColor Cyan
$projectNumber = gcloud projects describe $ProjectId --format="value(projectNumber)"
Assert-LastExitCode "gcloud projects describe"
$projectNumber = $projectNumber.Trim()

if ([string]::IsNullOrWhiteSpace($RuntimeServiceAccount)) {
    $RuntimeServiceAccount = "$projectNumber-compute@developer.gserviceaccount.com"
}

Write-Host "Project : $ProjectId ($projectNumber)"
Write-Host "Region  : $Region"
Write-Host "Runtime : $RuntimeServiceAccount"

Write-Host "`n==> Enabling required APIs" -ForegroundColor Cyan
gcloud services enable `
    run.googleapis.com `
    secretmanager.googleapis.com `
    firestore.googleapis.com `
    cloudbuild.googleapis.com `
    firebase.googleapis.com `
    identitytoolkit.googleapis.com `
    generativelanguage.googleapis.com `
    --project $ProjectId
Assert-LastExitCode "gcloud services enable"

Write-Host "`n==> Creating secret $SecretName" -ForegroundColor Cyan
$existing = gcloud secrets describe $SecretName --project $ProjectId --format="value(name)"
if ($LASTEXITCODE -eq 0 -and -not [string]::IsNullOrWhiteSpace($existing)) {
    Write-Host "    already exists, skipping"
}
else {
    $global:LASTEXITCODE = 0
    gcloud secrets create $SecretName --replication-policy="automatic" --project $ProjectId
    Assert-LastExitCode "gcloud secrets create"
}

if (-not [string]::IsNullOrWhiteSpace($GeminiApiKey)) {
    Write-Host "`n==> Adding a new secret version" -ForegroundColor Cyan

    # UTF-8 with NO byte-order mark, and no trailing newline: the file content
    # becomes the secret value byte for byte.
    $tempFile = [System.IO.Path]::GetTempFileName()
    try {
        $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
        [System.IO.File]::WriteAllText($tempFile, $GeminiApiKey.Trim(), $utf8NoBom)

        $written = [System.IO.File]::ReadAllBytes($tempFile)
        Write-Host "    writing $($written.Length) bytes (key length $($GeminiApiKey.Trim().Length))"

        gcloud secrets versions add $SecretName --data-file=$tempFile --project $ProjectId
        Assert-LastExitCode "gcloud secrets versions add"
    }
    finally {
        Remove-Item $tempFile -Force -ErrorAction SilentlyContinue
    }
}
else {
    Write-Host "`n==> GeminiApiKey not supplied; skipping version upload" -ForegroundColor Yellow
    Write-Host "    Re-run with -GeminiApiKey YOUR_KEY when you have one."
}

Write-Host "`n==> Granting secretAccessor on this secret only (not project-wide)" -ForegroundColor Cyan
gcloud secrets add-iam-policy-binding $SecretName `
    --member="serviceAccount:$RuntimeServiceAccount" `
    --role="roles/secretmanager.secretAccessor" `
    --project $ProjectId
Assert-LastExitCode "secretAccessor binding"

Write-Host "`n==> Granting Firestore access to the runtime service account" -ForegroundColor Cyan
gcloud projects add-iam-policy-binding $ProjectId `
    --member="serviceAccount:$RuntimeServiceAccount" `
    --role="roles/datastore.user" `
    --condition=None
Assert-LastExitCode "datastore.user binding"

Write-Host "`n==> Granting Firebase Auth admin access (session cookies, token verify)" -ForegroundColor Cyan
gcloud projects add-iam-policy-binding $ProjectId `
    --member="serviceAccount:$RuntimeServiceAccount" `
    --role="roles/firebaseauth.admin" `
    --condition=None
Assert-LastExitCode "firebaseauth.admin binding"

Write-Host "`nDone. After deploying, verify with:" -ForegroundColor Green
Write-Host '  curl.exe -s "$SERVICE_URL/api/health"'
