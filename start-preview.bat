@echo off
set "PATH=C:\Program Files\nodejs;%PATH%"
title RPG Medieval de Supervivencia Movil - Servidor de Produccion
echo =====================================================================
echo   RPG Medieval de Supervivencia Movil (GDD v1.0)
echo   Iniciando servidor de produccion optimizado...
echo =====================================================================
start http://localhost:4173/
call "C:\Program Files\nodejs\npm.cmd" run preview -- --host --port 4173
pause
