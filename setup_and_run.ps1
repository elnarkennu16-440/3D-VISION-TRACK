# PowerShell Setup & Run Script for RetroLens 3D
Write-Host "============================================================" -ForegroundColor Yellow
Write-Host "   RetroLens 3D Hand Tracking Portal Setup (Python 3.11)    " -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Yellow

# 1. Check if Python 3.11 is available
$py311 = Get-Command "py" -ErrorAction SilentlyContinue
$has311 = $false

if ($py311) {
    $versionOutput = py -3.11 --version 2>&1
    if ($versionOutput -match "Python 3\.11") {
        $has311 = $true
        Write-Host "[OK] Python 3.11 detected via py launcher ($versionOutput)" -ForegroundColor Green
    }
}

if (-not $has311) {
    Write-Host "[!] Python 3.11 is required for MediaPipe hand tracking (Python 3.14 lacks prebuilt C++ wheels)." -ForegroundColor Yellow
    Write-Host "[*] Attempting to install Python 3.11 via winget..." -ForegroundColor Cyan
    try {
        winget install Python.Python.3.11 --silent --accept-package-agreements --accept-source-agreements
        Write-Host "[OK] Python 3.11 installed successfully! Please restart this script." -ForegroundColor Green
        exit
    } catch {
        Write-Host "[ERROR] Could not run winget. Please download Python 3.11 manually:" -ForegroundColor Red
        Write-Host "https://www.python.org/downloads/release/python-3119/" -ForegroundColor White
        exit
    }
}

# 2. Create Virtual Environment with Python 3.11
if (-not (Test-Path "venv_py311\Scripts\activate.ps1")) {
    Write-Host "[*] Creating virtual environment 'venv_py311' using Python 3.11..." -ForegroundColor Cyan
    py -3.11 -m venv venv_py311
}

# 3. Activate
Write-Host "[*] Activating Python 3.11 environment..." -ForegroundColor Cyan
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force
& ".\venv_py311\Scripts\Activate.ps1"

# 4. Install requirements
Write-Host "[*] Installing/verifying dependencies (opencv-python, mediapipe, numpy)..." -ForegroundColor Cyan
pip install --upgrade pip -q
pip install -r requirements.txt -q

# 5. Run 3d.py
Write-Host "[*] Starting 3D Hand Tracking Portal..." -ForegroundColor Green
python 3d.py
