@echo off
setlocal

cd /d "%~dp0"

echo.
echo === Git Sync: local changes -> GitHub ===
echo Current folder: %CD%
echo.

if not exist package.json (
  echo [ERROR] package.json was not found.
  echo Put this .bat file in the project root folder, then run it again.
  pause
  exit /b 1
)

git --version >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Git is not installed or not available in PATH.
  pause
  exit /b 1
)

echo === Current status ===
git status --short
echo.

echo === Add all changes ===
git add -A
if errorlevel 1 (
  echo [ERROR] git add failed.
  pause
  exit /b 1
)

echo.
set /p COMMIT_MSG=Commit message [sync local changes]: 
if "%COMMIT_MSG%"=="" set COMMIT_MSG=sync local changes

echo.
echo === Commit ===
git commit -m "%COMMIT_MSG%"
if errorlevel 1 (
  echo [INFO] Nothing to commit or commit failed.
  echo If there are no changes, this is normal.
)

echo.
echo === Push ===
git push
if errorlevel 1 (
  echo [ERROR] git push failed.
  echo Check branch, remote, or GitHub authentication.
  pause
  exit /b 1
)

echo.
echo === Done ===
git status --short
pause
