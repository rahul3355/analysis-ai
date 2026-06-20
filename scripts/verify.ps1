# Analysis AI -- Verification Pipeline (Windows PowerShell)
# Runs lint, type check, unit tests, build, and golden dataset eval.
# Exits non-zero if anything fails.

$ErrorActionPreference = "Continue"

Write-Host ""
Write-Host "==========================================="
Write-Host "  Analysis AI -- Verification Pipeline"
Write-Host "==========================================="
Write-Host ""

$failed = 0
$ROOT = Resolve-Path (Join-Path $PSScriptRoot "..")

# Step 1: ESLint
Push-Location (Join-Path $ROOT "apps\web")
try {
Write-Host ">> Step 1/5: ESLint..."
npm run lint 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "  !! ESLint failed" -ForegroundColor Red
    $failed = 1
} else {
    Write-Host "  OK ESLint passed" -ForegroundColor Green
}
Write-Host ""

# Step 2: TypeScript type check
Write-Host ">> Step 2/5: TypeScript type check..."
npx tsc --noEmit 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "  !! Type check failed" -ForegroundColor Red
    $failed = 1
} else {
    Write-Host "  OK Type check passed" -ForegroundColor Green
}
Write-Host ""

# Step 3: Unit tests
Write-Host ">> Step 3/5: Unit tests..."
npm run test 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "  !! Unit tests failed" -ForegroundColor Red
    $failed = 1
} else {
    Write-Host "  OK Unit tests passed" -ForegroundColor Green
}
Write-Host ""

# Step 4: Production build
Write-Host ">> Step 4/5: Production build..."
npm run build 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "  !! Build failed" -ForegroundColor Red
    $failed = 1
} else {
    Write-Host "  OK Build passed" -ForegroundColor Green
}
Write-Host ""

} finally { Pop-Location }

# Step 5: Golden dataset structure check
Push-Location $ROOT
try {
Write-Host ">> Step 5/5: Golden dataset validation..."
$goldenDir = Join-Path $ROOT "golden"
$requiredFiles = @(
    "README.md",
    "test-cases.json",
    "baseline.json",
    "run.js"
)
$missing = @()
foreach ($file in $requiredFiles) {
    $path = Join-Path $goldenDir $file
    if (-not (Test-Path $path)) {
        $missing += $file
    }
}
if ($missing.Count -gt 0) {
    Write-Host "  !! Missing golden dataset files: $($missing -join ', ')" -ForegroundColor Red
    $failed = 1
} else {
    Write-Host "  OK Golden dataset structure validated" -ForegroundColor Green
}

# Validate test-cases.json
$casesFile = Join-Path $goldenDir "test-cases.json"
$totalCases = 0
try {
    $content = Get-Content $casesFile -Raw | ConvertFrom-Json
    if ($content -is [array]) {
        $totalCases = $content.Count
    }
} catch {
    Write-Host "  !! Invalid test-cases.json: $_" -ForegroundColor Red
    $failed = 1
}
Write-Host "  Golden dataset: $totalCases test cases in single file" -ForegroundColor Cyan
Write-Host ""

} finally { Pop-Location }

# Summary
Write-Host "==========================================="
if ($failed -eq 0) {
    Write-Host "  ALL CHECKS PASSED" -ForegroundColor Green
} else {
    Write-Host "  SOME CHECKS FAILED" -ForegroundColor Red
}
Write-Host "==========================================="

exit $failed
