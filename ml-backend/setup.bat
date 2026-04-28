@echo off
echo ============================================
echo   Ye-Ai Kornia Warp Engine - Setup Script
echo ============================================
echo.

REM Check Python version
python --version 2>NUL
if errorlevel 1 (
    echo [ERROR] Python not found. Install Python 3.11+ from https://python.org
    pause
    exit /b 1
)

REM Create virtual environment
if not exist "venv" (
    echo [1/4] Creating virtual environment...
    python -m venv venv
) else (
    echo [1/4] Virtual environment already exists, skipping...
)

REM Activate venv
echo [2/4] Activating virtual environment...
call venv\Scripts\activate.bat

REM Install PyTorch (CPU version — for CUDA, visit pytorch.org)
echo [3/4] Installing PyTorch (CPU)...
pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu

REM Install remaining dependencies
echo [4/4] Installing Kornia and other dependencies...
pip install -r requirements.txt

echo.
echo ============================================
echo   Setup Complete!
echo ============================================
echo.
echo To start the server, run:
echo   venv\Scripts\activate.bat
echo   uvicorn kornia_warp_engine:app --host 0.0.0.0 --port 8000
echo.
echo Or simply run:
echo   python kornia_warp_engine.py
echo.
pause
