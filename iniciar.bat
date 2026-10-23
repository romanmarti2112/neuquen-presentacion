@echo off
cd /d "%~dp0"
echo Presentacion: http://localhost:8000/index.html   Editor: http://localhost:8000/editar.html
python -m http.server 8000
