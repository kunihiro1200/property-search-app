@echo off
echo フロントエンドのキャッシュをクリアして再ビルドします...
echo.

echo 1. node_modules/.cacheを削除...
if exist node_modules\.cache (
    rmdir /s /q node_modules\.cache
    echo    ✅ キャッシュを削除しました
) else (
    echo    ℹ️  キャッシュフォルダが存在しません
)

echo.
echo 2. distフォルダを削除...
if exist dist (
    rmdir /s /q dist
    echo    ✅ distフォルダを削除しました
) else (
    echo    ℹ️  distフォルダが存在しません
)

echo.
echo 3. npm run devを実行します...
echo    フロントエンドが起動したら、ブラウザでハードリフレッシュ（Ctrl+Shift+R）してください
echo.
npm run dev
