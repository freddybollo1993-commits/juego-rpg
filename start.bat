@echo off
set "PATH=C:\Program Files\nodejs;%PATH%"
title RPG Medieval de Supervivencia Movil - Servidor de Desarrollo
echo =====================================================================
echo   RPG Medieval de Supervivencia Movil (GDD v1.0)
echo   Iniciando servidor de desarrollo...
echo =====================================================================
start http://localhost:5173/
call "C:\Program Files\nodejs\npm.cmd" run dev -- --host --port 5173
pause
