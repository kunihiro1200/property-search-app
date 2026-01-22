@echo off
echo ポート3000を使用しているプロセスを停止します...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000 ^| findstr LISTENING') do (
    echo プロセスID %%a を停止中...
    taskkill /F /PID %%a 2>nul
)
echo 完了しました。
