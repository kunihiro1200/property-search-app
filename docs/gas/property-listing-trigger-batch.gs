/**
 * 公開物件サイト 物件同期用 Google Apps Script（移行用サンプル）
 *
 * 注意：このファイルはGitHub上のサンプルであり、稼働中GASへの変更ではありません。
 * 事前に稼働中の全呼び出し元を確認してから適用してください。
 *
 * Script Properties に CRON_SECRET を設定してください。
 * 秘密情報をコードに直接書かず、ログにも出さないでください。
 *
 * /api/sync/trigger はHTTP 200で「受付」を返します。
 * 同期が最後まで完了したという意味ではありません。
 */

var BACKEND_URL = 'https://property-site-frontend-kappa.vercel.app';

/**
 * 同期リクエストを1回だけ送信します。
 * 旧サンプルの50回連続呼び出しは、同一の全件同期を重複起動するおそれがあるため廃止。
 */
function syncAllNow() {
  var result = triggerFullSync();
  if (result.accepted) {
    console.log('✅ 物件同期リクエストを受け付けました。完了はVercelログ等で別途確認してください。');
  } else {
    console.error('❌ 同期の受付に失敗しました: ' + (result.error || 'HTTP ' + result.status));
  }
  return result;
}

/**
 * 認証されたフル同期APIの受付を要求します。実行の完了確認は別途必要です。
 */
function triggerFullSync() {
  var secret = PropertiesService.getScriptProperties().getProperty('CRON_SECRET');
  if (!secret || !secret.trim()) {
    console.error('CRON_SECRET is not configured in Script Properties; no sync request was sent.');
    return { accepted: false, error: 'CRON_SECRET is not configured' };
  }

  var url = BACKEND_URL + '/api/sync/trigger';
  var options = {
    method: 'post',
    headers: { 'Authorization': 'Bearer ' + secret.trim() },
    contentType: 'application/json',
    payload: JSON.stringify({}),
    muteHttpExceptions: true
  };

  try {
    var response = UrlFetchApp.fetch(url, options);
    var status = response.getResponseCode();
    if (status === 200) {
      return { accepted: true, status: status, checkedAt: new Date().toISOString() };
    }
    console.error('Sync trigger rejected: HTTP ' + status);
    return { accepted: false, status: status, error: 'HTTP ' + status };
  } catch (error) {
    console.error('Sync trigger request failed: ' + String(error));
    return { accepted: false, error: 'Request failed' };
  }
}
