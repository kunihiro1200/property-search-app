@echo off
cd /d C:\Users\kunih\sateituikyaku\backend
call npx ts-node run-full-sync-once.ts >> logs\full-sync.log 2>&1
