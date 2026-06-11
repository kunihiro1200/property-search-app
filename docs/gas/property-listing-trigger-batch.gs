/**
 * 公開物件サイト 物件同期用 Google Apps Script（バッチ実行版）
 *
 * 【使用方法】
 *   関数 syncAllNow() を実行すると、全件同期が完了するまで繰り返し実行します
 */

var BACKEND_URL = 'https://property-site-frontend-kappa.vercel.app';

/**
 * 全件を今すぐ同期（50回実行 = 5000件）
 * GASの実行時間制限（6分）内で完了するように調整
 */
function syncAllNow() {
  console.log('🔄 全件同期を開始します...');
  
  var maxIterations = 50; // 最大50回（5000件）
  var successCount = 0;
  var errorCount = 0;
  
  for (var i = 1; i <= maxIterations; i++) {
    console.log('バッチ ' + i + '/' + maxIterations + ' を実行中...');
    
    try {
      var result = triggerFullSync();
      if (result.success) {
        successCount++;
        console.log('  ✅ 成功');
      } else {
        errorCount++;
        console.log('  ❌ 失敗');
      }
    } catch (error) {
      errorCount++;
      console.log('  ❌ エラー: ' + error.toString());
    }
    
    // 少し待機（API制限対策）
    Utilities.sleep(2000); // 2秒待機
  }
  
  console.log('');
  console.log('✅ 全件同期が完了しました！');
  console.log('  成功: ' + successCount + ' 回');
  console.log('  失敗: ' + errorCount + ' 回');
  console.log('  推定同期件数: ' + (successCount * 100) + ' 件');
}

/**
 * フル同期APIを呼び出す
 */
function triggerFullSync() {
  var url = BACKEND_URL + '/api/sync/trigger';

  var options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({}),
    muteHttpExceptions: true,
  };

  try {
    var response = UrlFetchApp.fetch(url, options);
    var status = response.getResponseCode();
    var body = response.getContentText();

    if (status === 200) {
      return { success: true, body: body };
    } else {
      console.error('❌ HTTP ' + status + ': ' + body);
      return { success: false, body: body };
    }
  } catch (error) {
    console.error('triggerFullSync エラー:', error.toString());
    return { success: false, error: error.toString() };
  }
}
