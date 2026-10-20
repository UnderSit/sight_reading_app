@echo off
setlocal
title Sightline
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js was not found.
  echo Install Node.js from https://nodejs.org/ and run this file again.
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo Installing Sightline dependencies. This only happens once...
  call npm install
  if errorlevel 1 (
    echo.
    echo Dependency installation failed.
    pause
    exit /b 1
  )
)

echo Starting Sightline...
call npm start
if errorlevel 1 (
  echo.
  echo Sightline stopped with an error.
  pause
)
