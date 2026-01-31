@echo off
cd /d C:\Users\kunih\sateituikyaku\backend
if not exist logs mkdir logs
call npx ts-node run-full-sync-once.ts >> logs\full-sync.log 2>&1
