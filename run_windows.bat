@echo off
title RETROLENS Putra Python - MediaPipe 3D Hand Tracking
echo ======================================================================
echo    RETROLENS Putra Python - Exact Demo Video Launcher
echo    Using Google MediaPipe Neural Network Hand Tracking
echo ======================================================================
echo.

cd /d "%~dp0"

:: 1. Check if venv_py311 already exists and is ready
if exist "venv_py311\Scripts\python.exe" (
    echo [*] Found existing MediaPipe environment in venv_py311.
    echo [*] Starting RetroLens with MediaPipe...
    "venv_py311\Scripts\python.exe" 3d.py
    if %errorlevel% equ 0 goto :eof
)

:: 2. Check for Python 3.11 via py launcher
echo [*] Checking for Python 3.11 on your system...
py -3.11 --version >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo [!] Python 3.11 is required for Google MediaPipe C++ tracking.
    echo [*] Installing Python 3.11 automatically via Windows Package Manager (winget)...
    winget install Python.Python.3.11 --silent --accept-package-agreements --accept-source-agreements
    echo.
    echo [*] Python 3.11 installed. Creating MediaPipe environment...
)

:: 3. Create venv with Python 3.11
if not exist "venv_py311\Scripts\python.exe" (
    echo [*] Creating virtual environment 'venv_py311' with Python 3.11...
    py -3.11 -m venv venv_py311
)

:: 4. Install MediaPipe, OpenCV, and NumPy
echo [*] Installing Google MediaPipe, OpenCV, and NumPy...
"venv_py311\Scripts\python.exe" -m pip install --upgrade pip -q
"venv_py311\Scripts\python.exe" -m pip install opencv-python mediapipe numpy -q

:: 5. Launch
echo.
echo ======================================================================
echo  [OK] Launching RETROLENS with Google MediaPipe (60 FPS Tracking)
echo ======================================================================
"venv_py311\Scripts\python.exe" 3d.py
pause
