@echo off
title Launch Nikhil Milk ERP
echo Starting PostgreSQL Backend and Milk Distribution ERP...

cd /d "%~dp0"
start "" /b python "backend\server.py"
timeout /t 2 /nobreak >nul

start "" "index.html"
echo Milk ERP is now running in your browser!
exit
