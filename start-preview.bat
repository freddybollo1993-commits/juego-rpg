@echo off
set "PATH=C:\Program Files\nodejs;%PATH%"
title Isla Desconocida - Servidor de Produccion
echo =====================================================================
echo   Isla Desconocida - RPG de supervivencia por turnos
echo   Iniciando servidor de produccion optimizado...
echo =====================================================================
start http://localhost:4173/
call "C:\Program Files\nodejs\npm.cmd" run preview -- --host --port 4173
pause
