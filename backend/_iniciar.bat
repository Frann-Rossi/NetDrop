@echo off
title NetDrop - Backend (NO CERRAR)
cd /d "%~dp0"
call venv\Scripts\activate.bat
python upload_server.py
pause
