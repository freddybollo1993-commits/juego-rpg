@echo off
set "PATH=C:\Program Files\nodejs;%PATH%"
title Isla Desconocida - Servidor de Desarrollo
echo =====================================================================
echo   Isla Desconocida - RPG de supervivencia por turnos
echo   Iniciando servidor de desarrollo...
echo =====================================================================
start http://localhost:5173/
call "C:\Program Files\nodejs\npm.cmd" run dev -- --host --port 5173
pause
