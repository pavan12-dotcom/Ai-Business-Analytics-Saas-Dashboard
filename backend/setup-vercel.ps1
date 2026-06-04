# setup-vercel.ps1
# Setup environment variables on Vercel dynamically from .env and deploy

$envFile = ".env"

if (-not (Test-Path $envFile)) {
    Write-Host "ERROR: .env file not found. Please create a .env file with your variables first."
    exit 1
}

$lines = Get-Content $envFile

foreach ($line in $lines) {
    if ([string]::IsNullOrWhiteSpace($line)) { continue }
    if ($line.StartsWith("#")) { continue }

    $eqIndex = $line.IndexOf("=")
    if ($eqIndex -le 0) { continue }

    $key = $line.Substring(0, $eqIndex).Trim()
    $value = $line.Substring($eqIndex + 1).Trim()

    if ($key -eq "PORT" -or $key -eq "ANTHROPIC_API_KEY") {
        continue
    }

    if ([string]::IsNullOrWhiteSpace($value)) {
        continue
    }

    # Remove outer quotes if present
    if ($value.StartsWith('"') -and $value.EndsWith('"')) { $value = $value.Substring(1, $value.Length - 2) }
    if ($value.StartsWith("'") -and $value.EndsWith("'")) { $value = $value.Substring(1, $value.Length - 2) }

    Write-Host "Setting $key on Vercel..."
    $value | npx vercel env add $key production --force
}

Write-Host ""
Write-Host "All env vars set. Rebuilding and deploying..."
npm run build
npx vercel --prod --yes
Write-Host "Deployed!"
