@echo off
title GotReal - Nettoyage du Cache
color 0C

echo =========================================================
echo       NETTOYEUR PROFOND DU SITE (CACHE .NEXT)
echo =========================================================
echo.
echo Utilisez ce programme si les nouveaux projets / videos n'apparaissent pas. 
echo Il va forcer la re-creation complete du code au prochain lancement.
echo ---------------------------------------------------------
echo.

cd /d "%~dp0\.."

echo Suppression du dossier .next ...
if exist ".next" (
    rmdir /S /Q ".next"
    echo L'historique du site a bien ete efface. Relancez le serveur Localhost (Batch #2).
) else (
    echo Le cache etait deja vide ! Reessayez d'allumer le site.
)

echo.
pause
