@echo off
title GotReal - Serveur de Developpement (Localhost)
color 0E

echo =========================================================
echo       SERVEUR GOTREAL LOCAL 
echo =========================================================
echo.
echo 1. Fermeture des anciennes instances du site (Nettoyage du Port 3000)...
for /f "tokens=5" %%a in ('netstat -aon ^| find ":3000" ^| find "LISTENING"') do taskkill /F /PID %%a >nul 2>&1

echo 2. Ouverture de votre navigateur web vers http://localhost:3000
start http://localhost:3000

echo 3. Lancement du code Next.js... (Ne fermez pas cette fenetre noire !)
echo ---------------------------------------------------------
echo.

cd /d "%~dp0\.."

call npm run dev

echo.
pause
