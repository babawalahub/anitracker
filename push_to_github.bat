@echo off
title Upload AniTrack to GitHub
color 0B
echo ======================================================================
echo           UPLOADING ANITRACK TO GITHUB (babawalahub/anitracker)
echo ======================================================================
echo.
cd /d "%~dp0"

echo [Option 1] If you have a new GitHub Token (ghp_...), paste it below.
echo [Option 2] Or just press ENTER directly to sign in with your browser!
echo.
set /p USER_TOKEN="Enter Token (or press ENTER to use browser): "

if "%USER_TOKEN%"=="" (
  echo.
  echo Launching browser authentication...
  git push -u origin main --force
) else (
  echo.
  echo Pushing using your token...
  git push https://%USER_TOKEN%@github.com/babawalahub/anitracker.git main --force
)

echo.
if %errorlevel% equ 0 (
  color 0A
  echo ======================================================================
  echo SUCCESS! Your project has been uploaded to GitHub!
  echo URL: https://github.com/babawalahub/anitracker
  echo ======================================================================
) else (
  color 0C
  echo ======================================================================
  echo Upload failed. Please make sure:
  echo 1. Your token is valid and has 'repo' or 'Contents' write permissions.
  echo 2. You are logged into the 'babawalahub' account.
  echo ======================================================================
)
echo.
pause
