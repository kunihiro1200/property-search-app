/**
 * 公開物件サイト 物件同期用 Google Apps Script
 *
 * 【設置先】
 *   買主リストスプレッドシート（シート名「物件」）
 *
 * 【トリガー設定】
 *   時間ベーストリガーを設定してください：
 *     関数名: runPeriodicSync
 *     イベント種類: 時間ベースのタイマー
 *     間隔: 10分ごと（または任意の間隔）
 *
 * 【仕組み】
 *   Vercelを経由せず、スプレッドシートから直接Supabaseに書き込む
 *   → Vercelのタイムアウト問題を回避
 *   → 1428行全件を確実に同期
 *
 * 【価格の優先順位】
 *   BS列（価格）→ J列（売買価格）
 *
 * 【スクリプトプロパティの設定】
 *   プロジェクトの設定 > スクリプトプロパティ に以下を追加:
 *     SUPABASE_URL : https://krxhrbtlgfjzsseegaqq.supabase.co
 *     SUPABASE_KEY : (Supabaseのservice_role key)
 */

var SHEET_NAME = '物件';
var SUPABASE_URL = PropertiesService.getScriptProperties().getProperty('SUPABASE_URL')
                  || 'https://krxhrbtlgfjzsseegaqq.supabase.co';
var SUPABASE_KEY = PropertiesService.getScriptProperties().getProperty('SUPABASE_KEY');

/**
 * 時間ベーストリガーから呼び出す関数（10分ごと）
 */
function runPeriodicSync() {
  console.log('⏰ 定期同期開始: ' + new Date().toISOString());
  syncAllPrices();
}

/**
 * 全件の価格を直接Supabaseに同期
 * 価格の優先順位: BS列（価格）→ J列（売買価格）
 */
function syncAllPrices() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  if (!sheet) {
    console.log('❌ シート「' + SHEET_NAME + '」が見つかりません');
    return;
  }

  var data = sheet.getDataRange().getValues();
  var headers = data[0];

  // カラムインデックスを取得
  var idx = {};
  for (var i = 0; i < headers.length; i++) {
    idx[headers[i]] = i;
  }

  var batch = [];
  var totalRows = 0;
  var totalUpdated = 0;
  var totalErrors = 0;

  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var propertyNumber = row[idx['物件番号']];
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
      var deduped = deduplicateBatch(batch);
      var result = upsertToSupabase(deduped);
      totalUpdated += result.success;
      totalErrors  += result.error;
      console.log('進捗: ' + totalRows + '行処理済み（更新: ' + totalUpdated + '件）');
      batch = [];
      Utilities.sleep(500);
    }
  }

  // 残りを送信
  if (batch.length > 0) {
    var deduped = deduplicateBatch(batch);
    var result = upsertToSupabase(deduped);
    totalUpdated += result.success;
    totalErrors  += result.error;
  }

  console.log('✅ 同期完了 総行数:' + totalRows + ' 更新:' + totalUpdated + ' エラー:' + totalErrors);
}

/**
 * バッチ内の重複property_numberを除去（最後の行を優先）
 */
function deduplicateBatch(batch) {
  var seen = {};
  var result = [];
  // 後ろから処理して最後の行を優先
  for (var i = batch.length - 1; i >= 0; i--) {
    var pn = batch[i].property_number;
    if (!seen[pn]) {
      seen[pn] = true;
      result.unshift(batch[i]);
    }
  }
  return result;
}

/**
 * Supabaseにバッチupsert
 */
function upsertToSupabase(rows) {
  if (!SUPABASE_KEY) {
    console.log('❌ SUPABASE_KEYが未設定です。スクリプトプロパティに SUPABASE_KEY を追加してください');
    return { success: 0, error: rows.length };
  }

  var url = SUPABASE_URL + '/rest/v1/property_listings?on_conflict=property_number';
  var options = {
    method: 'post',
    contentType: 'application/json',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': 'Bearer ' + SUPABASE_KEY,
      'Prefer': 'resolution=merge-duplicates,return=minimal'
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
      console.log('❌ Supabase upsert失敗 HTTP ' + status + ': ' + response.getContentText());
      return { success: 0, error: rows.length };
    }
  } catch (e) {
    console.log('❌ upsertエラー: ' + e.toString());
    return { success: 0, error: rows.length };
  }
}

// --- テスト用（手動実行で動作確認） ---
function testFullSync() { syncAllPrices(); }
