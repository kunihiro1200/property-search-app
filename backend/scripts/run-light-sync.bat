@echo off
cd /d C:\Users\kunih\sateituikyaku\backend
call npx ts-node scripts/light-sync.ts >> logs\light-sync.log 2>&1
