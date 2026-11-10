/**
 * 物件同期を依頼するための参考GASコード（本番の設置済みGASではありません）。
 *
 * この旧APIは同期リクエストを「受け付ける」だけです。
 * HTTP 200は同期完了を意味しません。同期完了の検証は
 * GitHub Actionsの Scheduled Property Sync (protected) に任せてください。
 *
 * 注意:
 * - このコードを既存のGASプロジェクトに無条件で貼り付けないでください。
 * - 稼働中のトリガーや別の呼び出し元が移行済みと確認するまで、
 *   本番の LEGACY_SYNC_TRIGGER_AUTH_REQUIRED を変更しないでください。
 * - CRON_SECRETの値はGAS Script Propertiesだけに保存します。
 */
var BACKEND_URL = 'https://property-site-frontend-kappa.vercel.app';

/** 認証付きで同期要求を1回だけ送ります。同期自体は完了確認しません。 */
function syncAllNow() {
  var result = triggerFullSync();
  if (result.accepted) {
    console.log('同期要求を受け付けました（同期完了は未確認）。');
  } else {
    console.error('同期要求を受け付けられませんでした。HTTP ' + result.status);
  }
  return result;
}

/**
 * 旧APIへの1回限りの認証付き要求。
 * 応答本文・Authorizationヘッダー・認証情報はログに出しません。
 */
function triggerFullSync() {
  var cronSecret = PropertiesService.getScriptProperties().getProperty('CRON_SECRET');
  if (!cronSecret || !String(cronSecret).trim()) {
    throw new Error('GAS Script PropertiesにCRON_SECRETが設定されていません。');
  }

  var options = {
    method: 'post',
    contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + cronSecret },
    payload: JSON.stringify({}),
    muteHttpExceptions: true
  };

  try {
    var response = UrlFetchApp.fetch(BACKEND_URL + '/api/sync/trigger', options);
    var status = response.getResponseCode();
    // HTTP 200 means accepted only; it is not proof of completed synchronization.
    return { accepted: status === 200, complete: false, status: status };
  } catch (error) {
    // Keep exception details out of logs: they may contain request metadata.
    return { accepted: false, complete: false, status: 'network-error' };
  }
}
