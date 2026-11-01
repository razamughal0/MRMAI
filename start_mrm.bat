@echo off
setlocal
title MRM - Local Server Launcher
cd /d "%~dp0"

echo ============================================================
echo   MRM - PERSONAL AI ASSISTANT
echo   Muhammad Raza Mughal - 13 August 2026
echo ============================================================
echo.

REM ---------- 1) Python check ----------
where python >nul 2>nul
if errorlevel 1 (
    echo [ERROR] Python install nahi hai. https://python.org se Python 3.10+ install karein
    echo         Install karte waqt "Add Python to PATH" zaroor tick karein.
    pause
    exit /b 1
)
echo [OK] Python mil gaya:
python --version
echo.

REM ---------- 2) Packages (sirf pehli dafa) ----------
if not exist ".mrm_deps_installed" (
    echo [1/4] Python packages install ho rahe hain - pehli dafa time lagega...
    python -m pip install --upgrade pip
    python -m pip install -r backend\requirements.txt
    if errorlevel 1 (
        echo [ERROR] Bridge packages install nahi hue. Internet check karein.
        pause
        exit /b 1
    )
    echo [2/4] LiveKit Urdu voice agent ke packages...
    python -m pip install livekit-agents livekit-plugins-google livekit-plugins-ai-coustics numpy sounddevice
    if errorlevel 1 (
        echo [WARN] LiveKit packages nahi hue - voice agent skip hoga, bridge chalega.
    )
    echo done > .mrm_deps_installed
    echo [OK] Packages ready.
    echo.
)

REM ---------- 3) Frontend build (agar dist nahi hai) ----------
if not exist "dist\index.html" (
    echo [BUILD] dist\index.html nahi mila - frontend build ho raha hai...
    where npm >nul 2>nul
    if errorlevel 1 (
        echo [ERROR] npm nahi mila. Node.js install karein ya dist folder kahin se copy karein.
        pause
        exit /b 1
    )
    call npm install
    call npm run build
    if not exist "dist\index.html" (
        echo [ERROR] Build fail hua.
        pause
        exit /b 1
    )
)

REM ---------- 4) Sab kuch start ----------
echo [3/4] MRM Bridge start - ws://127.0.0.1:8765
start "MRM Bridge - band na karein" cmd /k python backend\mrm_bridge.py

echo [4/4] MRM Urdu Voice Agent start - LiveKit
start "MRM Urdu Agent - band na karein" cmd /k python backend\mrm_agent_urdu.py dev

echo.
echo ============================================================
echo   HUD browser mein khul raha hai:  http://localhost:8080
echo   (IMPORTANT: localhost hi use karein, 192.168.x.x nahi -
echo    warna mic / voice / clap block ho jati hai)
echo.
echo   Bridge aur Agent ki 2 windows khuli hain - unko band na karein.
echo   Ye window bhi khuli rehne dein - yahi web server hai.
echo ============================================================
echo.

start "" http://localhost:8080
python -m http.server 8080 --directory dist

pause