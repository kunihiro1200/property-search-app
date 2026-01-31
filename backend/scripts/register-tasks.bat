@echo off
echo タスクスケジューラにフル同期タスクを登録します...
echo 管理者権限が必要です。

:: PC起動時にフル同期
schtasks /create /tn "売主リストフル同期_起動時" /tr "C:\Users\kunih\sateituikyaku\backend\scripts\run-full-sync.bat" /sc onlogon /f

:: 1時間ごとにフル同期
schtasks /create /tn "売主リストフル同期_1時間毎" /tr "C:\Users\kunih\sateituikyaku\backend\scripts\run-full-sync.bat" /sc hourly /f

echo.
echo 登録完了！
echo.
echo 登録されたタスク:
schtasks /query /tn "売主リストフル同期_起動時"
schtasks /query /tn "売主リストフル同期_1時間毎"
schtasks /query /tn "売主リスト軽量同期"

pause
