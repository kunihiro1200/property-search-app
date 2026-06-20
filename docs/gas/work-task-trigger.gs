/**
 * 業務リストスプレッドシート用 Google Apps Script
 * 
 * 設置先: 業務リストスプレッドシート（ID: 1MO2vs0mDUFCgM-rjXXPRIy3pKKdfIFvUDwacM-2174g）
 * シート名: 業務依頼
 * 
 * トリガー設定:
 * 1. onEdit → 編集時に同期
 * 2. onChange → 行追加時に同期（新規案件追加を検知）
 */

// バックエンドAPIのURL
var BACKEND_URL = 'https://baikyaku-property-site3.vercel.app';

// デバウンス用（連続編集時に同期が何度も走らないようにする）
var DEBOUNCE_SECONDS = 5;

// 業務リストの物件番号が入っている列番号（A列=1）
// 実際のスプレッドシートの列に合わせて変更してください
var PROPERTY_NUMBER_COLUMN = 1;

/**
 * セル編集時のトリガー
 * トリガー: onEdit（スプレッドシートから）
 */
function onWorkTaskEdit(e) {
  try {
    var sheet = e.source.getActiveSheet();
    
    // 「業務依頼」シート以外は無視
    if (sheet.getName() !== '業務依頼') {
      return;
    }
    
    var range = e.range;
    var row = range.getRow();
    
    // ヘッダー行（1行目）の編集は無視
    if (row <= 1) {
      return;
    }
    
    // 物件番号を取得
    var propertyNumber = sheet.getRange(row, PROPERTY_NUMBER_COLUMN).getValue();
    if (!propertyNumber) {
      return;
    }
    
    console.log('業務リスト編集検知: ' + propertyNumber + ' (行: ' + row + ')');
    
    // デバウンス
    var cacheKey = 'worktask_sync_' + propertyNumber;
    var cache = CacheService.getScriptCache();
    if (cache.get(cacheKey)) {
      console.log('デバウンス中のためスキップ: ' + propertyNumber);
      return;
    }
    cache.put(cacheKey, '1', DEBOUNCE_SECONDS);
    
    // 特定の物件のみ同期
    syncWorkTask(String(propertyNumber));
    
  } catch (error) {
    console.error('onWorkTaskEdit エラー:', error.toString());
  }
}

/**
 * 行追加時のトリガー
 * トリガー: onChange（スプレッドシートから）
 */
function onWorkTaskChange(e) {
  try {
    if (e.changeType !== 'INSERT_ROW') {
      return;
    }
    
    var sheet = e.source.getActiveSheet();
    
    if (sheet.getName() !== '業務依頼') {
      return;
    }
    
    console.log('業務リスト新規行追加検知 - フル同期を実行');
    syncAllWorkTasks();
    
  } catch (error) {
    console.error('onWorkTaskChange エラー:', error.toString());
  }
}

/**
 * 特定の物件番号の業務リストを同期
 * @param {string} propertyNumber - 同期する物件番号
 */
function syncWorkTask(propertyNumber) {
  try {
    var url = BACKEND_URL + '/api/work-tasks/sync/' + encodeURIComponent(propertyNumber);
    
    var options = {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify({}),
      muteHttpExceptions: true,
    };
    
    console.log('業務リスト同期API呼び出し:', url);
    
    var response = UrlFetchApp.fetch(url, options);
    var statusCode = response.getResponseCode();
    var responseText = response.getContentText();
    
    if (statusCode === 200) {
      console.log('✅ 業務リスト同期成功 (' + propertyNumber + '):', responseText);
    } else {
      console.error('❌ 業務リスト同期失敗 (' + propertyNumber + ') HTTP ' + statusCode + ':', responseText);
    }
    
  } catch (error) {
    console.error('syncWorkTask エラー:', error.toString());
  }
}

/**
 * 全業務リストをフル同期
 */
function syncAllWorkTasks() {
  try {
    var url = BACKEND_URL + '/api/work-tasks/sync';
    
    var options = {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify({}),
      muteHttpExceptions: true,
    };
    
    console.log('業務リスト全件同期API呼び出し:', url);
    
    var response = UrlFetchApp.fetch(url, options);
    var statusCode = response.getResponseCode();
    var responseText = response.getContentText();
    
    if (statusCode === 200) {
      console.log('✅ 業務リスト全件同期成功:', responseText);
    } else {
      console.error('❌ 業務リスト全件同期失敗 HTTP ' + statusCode + ':', responseText);
    }
    
  } catch (error) {
    console.error('syncAllWorkTasks エラー:', error.toString());
  }
}

/**
 * テスト用: 手動でフル同期を実行
 */
function testFullSync() {
  console.log('テスト: 業務リスト全件同期を実行');
  syncAllWorkTasks();
}
