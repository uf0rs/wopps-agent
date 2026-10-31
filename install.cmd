@echo off
setlocal EnableExtensions EnableDelayedExpansion
cd /d "%~dp0"

set "UF0RS_BINARY=%~dp0dist\uf0rs.exe"
if not exist "%UF0RS_BINARY%" (
  if exist "%~dp0dist\releases\win-x64\uf0rs.exe" set "UF0RS_BINARY=%~dp0dist\releases\win-x64\uf0rs.exe"
)

if not exist "%UF0RS_BINARY%" (
  where node.exe >nul 2>nul
  if errorlevel 1 (
    echo Node.js 22+ is required only to build the standalone executable.
    echo Install Node.js, then run install.cmd again.
    exit /b 1
  )
  for /f "delims=v." %%V in ('node.exe --version') do set NODE_MAJOR=%%V
  if not defined NODE_MAJOR (
    echo Could not determine the Node.js version.
    exit /b 1
  )
  if !NODE_MAJOR! LSS 22 (
    echo Node.js 22 or newer is required to build the standalone executable.
    exit /b 1
  )
  if not exist "node_modules\@yao-pkg\pkg\lib-es5\bin.js" (
    call npm.cmd install
    if errorlevel 1 exit /b 1
  )
  call npm.cmd run build:cli
  if errorlevel 1 exit /b 1
)

"%UF0RS_BINARY%" install --source-dir "%~dp0."
if errorlevel 1 exit /b %errorlevel%
endlocal
