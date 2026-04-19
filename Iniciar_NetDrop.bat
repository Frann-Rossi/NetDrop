@echo off
title Iniciar NetDrop
echo ========================================================
echo               Iniciando NetDrop...
echo ========================================================
echo.

set "NETDROP_DIR=%~dp0"

:: 1. Backend
echo [1/2] Iniciando Backend (Python)...
if not exist "%NETDROP_DIR%backend\venv\Scripts\activate.bat" (
    echo    - Creando entorno virtual por primera vez...
    python -m venv "%NETDROP_DIR%backend\venv"
    echo    - Instalando dependencias...
    call "%NETDROP_DIR%backend\venv\Scripts\activate.bat"
    pip install -r "%NETDROP_DIR%backend\requirements.txt"
)
start "" "%NETDROP_DIR%backend\_iniciar.bat"
echo    OK!

echo.

:: 2. Frontend
echo [2/2] Iniciando Frontend (Interfaz Web)...
if not exist "%NETDROP_DIR%frontend\node_modules\" (
    echo    - Instalando dependencias web por primera vez...
    cd /d "%NETDROP_DIR%frontend"
    call npm install
)
start "" "%NETDROP_DIR%frontend\_iniciar.bat"
echo    OK!

:: Detectar IP local del equipo
set "MI_IP="
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /i "IPv4"') do (
    for /f "tokens=1" %%b in ("%%a") do (
        if not "%%b"=="" set "MI_IP=%%b"
    )
)

:: Abrir navegador
echo.
echo  Esperando a que cargue la web...
timeout /t 8 /nobreak >nul
start "" http://localhost:4321

echo.
echo ========================================================
echo  NetDrop esta corriendo!
echo.
echo  Abrilo en ESTA PC:
echo    http://localhost:4321
echo.
if defined MI_IP (
echo  Para abrir desde OTRO celular o PC en tu WiFi:
echo    http://%MI_IP%:4321
echo.
)
echo  Se abrieron dos ventanas negras.
echo  Minimizalas pero NO las cierres.
echo  Para apagar NetDrop, cierra esas dos ventanas.
echo ========================================================
echo.
pause
