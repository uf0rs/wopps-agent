@echo off
setlocal
set "UF0RS_EXE=%LOCALAPPDATA%\Programs\UF0RS AGENT\uf0rs.exe"
if not exist "%UF0RS_EXE%" (
  echo UF0RS AGENT is not installed for this user.
  exit /b 1
)
set "UF0RS_CMD_UNINSTALL=1"
"%UF0RS_EXE%" uninstall
if errorlevel 1 exit /b %errorlevel%
del /f /q "%UF0RS_EXE%" 2>nul
del /f /q "%LOCALAPPDATA%\Programs\UF0RS AGENT\uf0rs.cmd" 2>nul
rmdir "%LOCALAPPDATA%\Programs\UF0RS AGENT" 2>nul
endlocal
