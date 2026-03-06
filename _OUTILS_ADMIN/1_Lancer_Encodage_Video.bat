@echo off
title GotReal - Encodage Video Automatique
color 0B
echo =========================================================
echo       BIENVENUE DANS L'OUTIL DE MAINTENANCE GOTREAL
echo =========================================================
echo.
echo Ce programme va scanner le site a la recherche de videos 
echo recentes (.mp4) qui doivent etre converties en HLS (Multi-qualite).
echo.
echo Ne fermez pas cette fenetre pendant l'operation.
echo ---------------------------------------------------------
echo.

cd /d "%~dp0\.."

echo Demarrage du moteur ...
call npx tsx scripts/admin-encoder.ts

echo.
echo =========================================================
echo.
pause
