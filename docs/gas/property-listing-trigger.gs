/**
 * 物件同期用 Google Apps Script
 *
 * 【設置先】
 *   任意のスプレッドシート（または独立したGASプロジェクト）
 *
 * 【トリガー設定】
 *   時間ベーストリガーを設定してください：
 *     関数名: runPeriodicSync
 *     イベント種類: 時間ベースのタイマー
 *     間隔: 10分ごと（または任意の間隔）
 *
 * 【呼び出し先】
 *   baikyaku-property-site3.vercel.app の /api/sync/trigger
 *   → EnhancedAutoSyncService.runFullSync() を実行
 *   → 物件同期 Phase4.5/4.6/4.7 を含む
 *
 * 【注意】
 *   property-site-frontend-kappa.vercel.app ではなく
 *   baikyaku-property-site3.vercel.app を使用すること
 *   （物件同期は backend/src/ 側で実装されているため）
 */

var BACKEND_URL = 'https://baikyaku-property-site3.vercel.app';

/**
 * 時間ベーストリガーから呼び出す関数
 * GASのトリガー設定でこの関数を10分ごとに実行する
 */
function runPeriodicSync() {
  console.log('⏰ 定期同期開始: ' + new Date().toISOString());
  triggerFullSync();
}

/**
 * フル同期APIを呼び出す
 * EnhancedAutoSyncService.runFullSync() を実行する
 * （物件同期 Phase4.5/4.6/4.7 を含む）
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
      console.log('✅ フル同期成功:', body);
    } else {
      console.error('❌ フル同期失敗 HTTP ' + status + ':', body);
    }
  } catch (error) {
    console.error('triggerFullSync エラー:', error.toString());
  }
}

// --- テスト用（手動実行で動作確認） ---
function testFullSync() { triggerFullSync(); }
