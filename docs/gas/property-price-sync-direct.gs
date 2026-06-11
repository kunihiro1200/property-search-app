/**
 * 公開物件サイト 価格直接同期用 Google Apps Script
 *
 * 【概要】
 *   Vercelを経由せず、スプレッドシートから直接Supabaseに価格を書き込む
 *   → Vercelのタイムアウト問題を完全に回避
 *   → 全件を確実に同期できる
 *
 * 【設置先】
 *   買主リストスプレッドシート（シート名「物件」）
 *   スクリプトエディタ: 拡張機能 > Apps Script
 *
 * 【スクリプトプロパティの設定】
 *   プロジェクトの設定 > スクリプトプロパティ に以下を追加:
 *     SUPABASE_URL  : https://krxhrbtlgfjzsseegaqq.supabase.co
 *     SUPABASE_KEY  : (Supabaseのservice_role key)
 *
 * 【使用方法】
 *   - 今すぐ全件同期: syncAllPrices() を実行
 *   - トリガー設定:   runPeriodicPriceSync を10分ごとに実行
 */

// ============================================================
// 設定
// ============================================================
var SHEET_NAME = '物件';

var SUPABASE_URL = PropertiesService.getScriptProperties().getProperty('SUPABASE_URL')
                  || 'https://krxhrbtlgfjzsseegaqq.supabase.co';
var SUPABASE_KEY = PropertiesService.getScriptProperties().getProperty('SUPABASE_KEY');

// ============================================================
// メイン関数
// ============================================================

/**
 * 全件の価格を今すぐ同期（手動実行用）
 * 価格の優先順位: BS列（価格）→ J列（売買価格）
 */
function syncAllPrices() {
  Logger.log('🔄 全件価格同期を開始します...');
  Logger.log('  シート名: ' + SHEET_NAME);

  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  if (!sheet) {
    Logger.log('❌ シート「' + SHEET_NAME + '」が見つかりません');
    return;
  }

  var data = sheet.getDataRange().getValues();
  var headers = data[0];

  // カラムインデックスを取得
  var idx = {};
  for (var i = 0; i < headers.length; i++) {
    idx[headers[i]] = i;
  }

  // カラム確認ログ
  Logger.log('📋 カラム確認:');
  Logger.log('  物件番号: ' + idx['物件番号'] + '列');
  Logger.log('  価格(BS列): ' + idx['価格'] + '列');
  Logger.log('  売買価格(J列): ' + idx['売買価格'] + '列');
  Logger.log('  売出価格(e列): ' + idx['売出価格'] + '列');
  Logger.log('  atbb成約済み/非公開: ' + idx['atbb成約済み/非公開'] + '列');

  var batch = [];
  var totalRows = 0;
  var totalUpdated = 0;
  var totalErrors = 0;

  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var propertyNumber = row[idx['物件番号']];

    // 物件番号が空の行はスキップ
    if (!propertyNumber || propertyNumber.toString().trim() === '') continue;

    totalRows++;

    // 価格の優先順位: BS列（価格）→ J列（売買価格）
    var salesPrice = null;
    var priceBS = row[idx['価格']];
    var priceJ  = row[idx['売買価格']];

    if (priceBS !== '' && priceBS !== null && priceBS !== undefined) {
      salesPrice = parseFloat(String(priceBS).replace(/,/g, ''));
    } else if (priceJ !== '' && priceJ !== null && priceJ !== undefined) {
      salesPrice = parseFloat(String(priceJ).replace(/,/g, ''));
    }

    // NaNチェック
    if (isNaN(salesPrice)) salesPrice = null;

    // 売出価格
    var listingPrice = null;
    var priceE = row[idx['売出価格']];
    if (priceE !== '' && priceE !== null && priceE !== undefined) {
      listingPrice = parseFloat(String(priceE).replace(/,/g, ''));
      if (isNaN(listingPrice)) listingPrice = null;
    }

    // atbb_status
    var atbbStatus = String(row[idx['atbb成約済み/非公開']] || '');

    batch.push({
      property_number: propertyNumber.toString().trim(),
      sales_price: salesPrice,
      listing_price: listingPrice,
      atbb_status: atbbStatus,
      updated_at: new Date().toISOString()
    });

    // 500件ごとにSupabaseへ送信
    if (batch.length >= 500) {
      var result = upsertToSupabase(batch);
      totalUpdated += result.success;
      totalErrors  += result.error;
      Logger.log('進捗: ' + totalRows + '行処理済み（更新: ' + totalUpdated + '件）');
      batch = [];
      Utilities.sleep(500); // 0.5秒待機
    }
  }

  // 残りを送信
  if (batch.length > 0) {
    var result = upsertToSupabase(batch);
    totalUpdated += result.success;
    totalErrors  += result.error;
  }

  Logger.log('');
  Logger.log('✅ 全件価格同期が完了しました！');
  Logger.log('  総行数: ' + totalRows + ' 件');
  Logger.log('  更新成功: ' + totalUpdated + ' 件');
  Logger.log('  エラー: ' + totalErrors + ' 件');
}

/**
 * 定期実行用（トリガーから呼び出す）
 */
function runPeriodicPriceSync() {
  Logger.log('⏰ 定期価格同期開始: ' + new Date().toISOString());
  syncAllPrices();
}

// ============================================================
// Supabase upsert
// ============================================================

/**
 * Supabaseにバッチupsert
 * property_numberをキーにして更新（なければ挿入）
 */
function upsertToSupabase(rows) {
  if (!SUPABASE_KEY) {
    Logger.log('❌ SUPABASE_KEYが設定されていません');
    Logger.log('   プロジェクトの設定 > スクリプトプロパティ に SUPABASE_KEY を追加してください');
    return { success: 0, error: rows.length };
  }

  var url = SUPABASE_URL + '/rest/v1/property_listings';

  var options = {
    method: 'post',
    contentType: 'application/json',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': 'Bearer ' + SUPABASE_KEY,
      'Prefer': 'resolution=merge-duplicates'
    },
    payload: JSON.stringify(rows),
    muteHttpExceptions: true
  };

  try {
    var response = UrlFetchApp.fetch(url, options);
    var status = response.getResponseCode();

    if (status === 200 || status === 201) {
      return { success: rows.length, error: 0 };
    } else {
      Logger.log('❌ Supabase upsert失敗 HTTP ' + status + ': ' + response.getContentText());
      return { success: 0, error: rows.length };
    }
  } catch (e) {
    Logger.log('❌ upsertエラー: ' + e.toString());
    return { success: 0, error: rows.length };
  }
}

// ============================================================
// 初期設定
// ============================================================

/**
 * スクリプトプロパティを設定（初回のみ実行）
 * SUPABASE_KEYを実際の値に書き換えてから実行してください
 */
function setupProperties() {
  PropertiesService.getScriptProperties().setProperties({
    'SUPABASE_URL': 'https://krxhrbtlgfjzsseegaqq.supabase.co',
    'SUPABASE_KEY': 'ここにSUPABASE_SERVICE_KEYを貼り付ける'
  });
  Logger.log('✅ スクリプトプロパティを設定しました');
}
