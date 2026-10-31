@echo off
setlocal EnableExtensions EnableDelayedExpansion
title WOPPS AI installer

rem Installs WOPPS AI for the current user and registers it in PATH, so any new
rem terminal (CMD, PowerShell, Git Bash) can start it with the "uf0rs" command.
rem Works from any folder: if uf0rs.exe is next to this file it installs that copy,
rem otherwise it downloads the latest GitHub release.

set "BIN_DIR=%LOCALAPPDATA%\Programs\UF0RS AI"
set "SOURCE=%~dp0uf0rs.exe"
set "DOWNLOADED="

if exist "%SOURCE%" goto :install

echo WOPPS AI was not found next to this file, downloading the latest release...
where curl.exe >nul 2>nul
if errorlevel 1 (
    echo.
    echo curl.exe is missing on this system, so the download cannot start.
    echo Download uf0rs.exe from https://github.com/uf0rs/wopps-ai/releases/latest
    echo put it next to this file, and run this installer again.
    goto :fail
)

set "SOURCE=%TEMP%\uf0rs-download-%RANDOM%%RANDOM%.exe"
set "DOWNLOADED=1"
curl.exe -fL --retry 3 --retry-delay 2 -o "!SOURCE!" "https://github.com/uf0rs/wopps-ai/releases/latest/download/uf0rs.exe"
if errorlevel 1 (
    del /f /q "!SOURCE!" >nul 2>nul
    echo.
    echo The download failed. Check the internet connection and try again.
    goto :fail
)

:install
echo Installing WOPPS AI into "%BIN_DIR%"...
"%SOURCE%" install
if errorlevel 1 goto :fail
if defined DOWNLOADED del /f /q "%SOURCE%" >nul 2>nul

if not exist "%BIN_DIR%\uf0rs.exe" (
    echo.
    echo The executable was not copied to "%BIN_DIR%".
    goto :fail
)

echo.
echo Verifying the installation...
"%BIN_DIR%\uf0rs.exe" doctor

echo.
echo Done. In any NEW terminal window WOPPS AI starts with:
echo     uf0rs
echo.
echo If this window still cannot find uf0rs, close it and open a new one.
pause
exit /b 0

:fail
echo.
echo WOPPS AI installation failed.
pause
exit /b 1
