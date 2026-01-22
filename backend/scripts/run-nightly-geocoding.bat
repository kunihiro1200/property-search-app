@echo off
REM 夜間ジオコーディングバッチ実行スクリプト
REM Windowsタスクスケジューラから実行されます

echo ========================================
echo 夜間ジオコーディングバッチ
echo ========================================
echo.

REM スクリプトのディレクトリに移動
cd /d %~dp0..

REM ログファイル名（日付付き）
set LOG_DIR=logs\geocoding
set LOG_FILE=%LOG_DIR%\nightly-geocoding-%date:~0,4%%date:~5,2%%date:~8,2%.log

REM ログディレクトリを作成
if not exist "%LOG_DIR%" mkdir "%LOG_DIR%"

echo ログファイル: %LOG_FILE%
echo.

REM TypeScriptスクリプトを実行（ログに出力）
npx ts-node scripts/geocode-nightly-batch.ts >> "%LOG_FILE%" 2>&1

REM 終了コードを確認
if %ERRORLEVEL% EQU 0 (
    echo.
    echo ✅ バッチ処理が正常に完了しました
    echo.
) else (
    echo.
    echo ❌ バッチ処理でエラーが発生しました（終了コード: %ERRORLEVEL%）
    echo.
)

REM ログファイルの場所を表示
echo ログファイル: %CD%\%LOG_FILE%
echo.

pause
