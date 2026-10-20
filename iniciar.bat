@echo off
cd /d "%~dp0"
python generar.py
echo Abrir http://localhost:8000/index.html
python -m http.server 8000
