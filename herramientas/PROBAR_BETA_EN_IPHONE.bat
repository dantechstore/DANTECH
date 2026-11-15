@echo off
chcp 65001 >nul
cd /d "%~dp0.."
echo Iniciando el servidor de prueba de la beta de DANTESTORE...
where py >nul 2>nul && (py herramientas\servir_beta.py & goto fin)
where python >nul 2>nul && (python herramientas\servir_beta.py & goto fin)
echo No se encontro Python. Instalalo desde https://www.python.org/downloads/ (marca "Add python.exe to PATH") y vuelve a abrir este archivo.
:fin
pause
