# 全件同期スクリプト（cron jobを繰り返し呼び出し）

$url = "https://property-site-frontend-kappa.vercel.app/api/cron/sync-property-listings"
$totalUpdated = 0
$batchCount = 0

Write-Host "🔄 全件同期を開始します...`n"

while ($true) {
    $batchCount++
    Write-Host "バッチ $batchCount を実行中..."
    
    try {
        $response = Invoke-WebRequest -Uri $url -UseBasicParsing
        $json = $response.Content | ConvertFrom-Json
        
        $totalUpdated += $json.successfullyUpdated
        
        Write-Host "  更新: $($json.successfullyUpdated)件"
        Write-Host "  処理: $($json.totalProcessed)件"
        Write-Host "  累計: $totalUpdated 件`n"
        
        # 処理件数が0になったら終了
        if ($json.totalProcessed -eq 0) {
            Write-Host "✅ 全件同期が完了しました！"
            Write-Host "   合計更新件数: $totalUpdated 件"
            Write-Host "   実行バッチ数: $batchCount 回"
            break
        }
        
        # 5秒待機
        Start-Sleep -Seconds 5
        
    } catch {
        Write-Host "❌ エラーが発生しました: $_"
        break
    }
}
