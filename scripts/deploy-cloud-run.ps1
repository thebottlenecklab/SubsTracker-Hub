<#
.SYNOPSIS
  Deploys server.ts (built app) to Cloud Run under the substracker-31427 project.

.EXAMPLE
  .\scripts\deploy-cloud-run.ps1 -FirebaseKeyPath "C:\Users\ogunb\Downloads\substracker-31427-firebase-adminsdk-xxxxx.json"
#>
param(
  [Parameter(Mandatory=$true)][string]$FirebaseKeyPath,
  [string]$ProjectId = "substracker-31427",
  [string]$Region = "us-east1",
  [string]$ServiceName = "substracker-backend"
)

if (-not (Test-Path $FirebaseKeyPath)) {
  Write-Error "Firebase service account key not found at: $FirebaseKeyPath"
  exit 1
}

$repoRoot = Split-Path -Parent $PSScriptRoot
$envFile = Join-Path $repoRoot "env-vars.deploy.yaml"

$json = Get-Content -Raw $FirebaseKeyPath
$escapedJson = $json -replace "'", "''"

@"
FIREBASE_SERVICE_ACCOUNT_JSON: '$escapedJson'
NODE_ENV: 'production'
"@ | Set-Content -Encoding utf8 $envFile

try {
  gcloud run deploy $ServiceName `
    --source "$repoRoot" `
    --project $ProjectId `
    --region $Region `
    --allow-unauthenticated `
    --port 3000 `
    --env-vars-file $envFile
}
finally {
  Remove-Item $envFile -ErrorAction SilentlyContinue
}
