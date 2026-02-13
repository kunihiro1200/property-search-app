@echo off
REM 予約値下げ通知の定期実行タスクを設定するスクリプト

echo ========================================
echo 予約値下げ通知の定期実行タスクを設定します
echo ========================================
echo.

REM タスク名
set TASK_NAME=SateituikyakuScheduledNotifications

REM 既存のタスクを削除（存在する場合）
schtasks /Query /TN "%TASK_NAME%" >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo 既存のタスクを削除しています...
    schtasks /Delete /TN "%TASK_NAME%" /F
    echo.
)

REM 現在のディレクトリを取得
set CURRENT_DIR=%~dp0
set PROJECT_DIR=%CURRENT_DIR:~0,-9%

echo プロジェクトディレクトリ: %PROJECT_DIR%
echo.

REM タスクを作成（1分ごとに実行）
echo タスクを作成しています...
schtasks /Create /TN "%TASK_NAME%" /TR "cmd /c cd /d \"%PROJECT_DIR%backend\" && npx ts-node process-scheduled-notifications.ts >> \"%PROJECT_DIR%backend\logs\scheduled-notifications.log\" 2>&1" /SC MINUTE /MO 1 /F

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo ✅ タスクの作成に成功しました！
    echo ========================================
    echo.
    echo タスク名: %TASK_NAME%
    echo 実行間隔: 1分ごと
    echo ログファイル: %PROJECT_DIR%backend\logs\scheduled-notifications.log
    echo.
    echo タスクの確認:
    echo   schtasks /Query /TN "%TASK_NAME%" /V /FO LIST
    echo.
    echo タスクの削除:
    echo   schtasks /Delete /TN "%TASK_NAME%" /F
    echo.
) else (
    echo.
    echo ========================================
    echo ❌ タスクの作成に失敗しました
    echo ========================================
    echo.
    echo 管理者権限で実行してください：
    echo   1. このファイルを右クリック
    echo   2. 「管理者として実行」を選択
    echo.
)

pause
