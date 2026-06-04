$envFile = ".env"

if (-not (Test-Path $envFile)) {
    Write-Host "ERROR: .env file not found. Run this from the backend directory."
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

    if ($key -eq "PORT") {
        Write-Host "Skipping PORT"
        continue
    }

    if ([string]::IsNullOrWhiteSpace($value)) {
        Write-Host "Skipping $key (empty)"
        continue
    }

    Write-Host "Setting $key ..."
    $value | npx vercel env add $key production --force
}

Write-Host ""
Write-Host "Done. Now run: npm run build && npx vercel --prod --yes"
