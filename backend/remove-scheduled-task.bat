@echo off
REM 予約値下げ通知の定期実行タスクを削除するスクリプト

echo ========================================
echo 予約値下げ通知の定期実行タスクを削除します
echo ========================================
echo.

REM タスク名
set TASK_NAME=SateituikyakuScheduledNotifications

REM タスクを削除
schtasks /Query /TN "%TASK_NAME%" >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo タスクを削除しています...
    schtasks /Delete /TN "%TASK_NAME%" /F
    
    if %ERRORLEVEL% EQU 0 (
        echo.
        echo ========================================
        echo ✅ タスクの削除に成功しました！
        echo ========================================
        echo.
    ) else (
        echo.
        echo ========================================
        echo ❌ タスクの削除に失敗しました
        echo ========================================
        echo.
        echo 管理者権限で実行してください：
        echo   1. このファイルを右クリック
        echo   2. 「管理者として実行」を選択
        echo.
    )
) else (
    echo.
    echo ========================================
    echo ⚠️ タスクが見つかりませんでした
    echo ========================================
    echo.
    echo タスク名: %TASK_NAME%
    echo.
)

pause
