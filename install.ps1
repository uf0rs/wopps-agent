$ErrorActionPreference = "Stop"

$projectRoot = $PSScriptRoot
Push-Location $projectRoot
try {
    $executable = Join-Path $projectRoot "dist\uf0rs.exe"
    $releaseExecutable = Join-Path $projectRoot "dist\releases\win-x64\uf0rs.exe"
    if (-not (Test-Path $executable) -and (Test-Path $releaseExecutable)) {
        $executable = $releaseExecutable
    }

    if (-not (Test-Path $executable)) {
        $node = Get-Command node.exe -ErrorAction SilentlyContinue
        if (-not $node) {
            throw "No prebuilt UF0RS executable was found. Node.js 22+ is required only to build it; install Node.js and run the installer again."
        }
        $nodeVersion = (& $node.Source --version).TrimStart('v')
        $nodeMajor = [int]$nodeVersion.Split('.')[0]
        if ($nodeMajor -lt 22) {
            throw "Node.js 22 or newer is required to build the standalone executable. Found v$nodeVersion."
        }

        $npm = Get-Command npm.cmd -ErrorAction SilentlyContinue
        if (-not $npm) {
            throw "npm.cmd was not found. Repair the Node.js installation and try again."
        }
        if (-not (Test-Path (Join-Path $projectRoot "node_modules\@yao-pkg\pkg\lib-es5\bin.js"))) {
            & $npm.Source install
            if ($LASTEXITCODE -ne 0) { throw "Dependency installation failed (exit code $LASTEXITCODE)." }
        }

        & $npm.Source run build:cli
        if ($LASTEXITCODE -ne 0) { throw "Standalone executable build failed (exit code $LASTEXITCODE)." }
        $executable = Join-Path $projectRoot "dist\uf0rs.exe"
    }

    if (-not (Test-Path $executable)) {
        throw "The UF0RS executable was not created: $executable"
    }
    & $executable install --source-dir $projectRoot
    if ($LASTEXITCODE -ne 0) { throw "UF0RS installation failed (exit code $LASTEXITCODE)." }
}
catch {
    Write-Error $_
    exit 1
}
finally {
    Pop-Location
}
