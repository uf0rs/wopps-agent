$ErrorActionPreference = "Stop"
$uninstaller = Join-Path $PSScriptRoot "uninstall.cmd"
if (-not (Test-Path $uninstaller)) {
    Write-Error "UF0RS AI is not installed in the current user's standard location."
    exit 1
}
& $uninstaller
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
