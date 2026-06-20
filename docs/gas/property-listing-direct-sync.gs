/**
 * 物件リスト直接同期用 Google Apps Script
 *
 * 【設置先】
 *   買主リストスプレッドシート（シート名「物件」）
 *   スプレッドシートID: 1tI_iXaiLuWBggs5y0RH7qzkbHs9wnLLdRekAmjkhcLY
 *   スクリプトエディタ: 拡張機能 > Apps Script
 *
 * 【設定】
 *   1. スクリプトプロパティに以下を設定:
 *      - SUPABASE_URL: https://krxhrbtlgfjzsseegaqq.supabase.co
 *      - SUPABASE_SERVICE_KEY: (Supabaseのサービスキー)
 *
 *   2. トリガー設定（任意）:
 *      関数名: syncAllProperties
 *      イベント種類: 時間ベースのタイマー
 *      間隔: 1時間ごと（または任意の間隔）
 *
 * 【機能】
 *   - スプレッドシートの物件データを直接Supabaseに書き込む
 *   - 価格の優先順位: BS列（価格）→ J列（売買価格）
 *   - 100件ずつバッチ処理（Supabase APIの制限対策）
 *
 * 【使用方法】
 *   1. 手動実行: syncAllProperties() を実行
 *   2. 自動実行: トリガーを設定
 */

// スクリプトプロパティから取得
var SUPABASE_URL = PropertiesService.getScriptProperties().getProperty('SUPABASE_URL');
var SUPABASE_SERVICE_KEY = PropertiesService.getScriptProperties().getProperty('SUPABASE_SERVICE_KEY');

/**
 * 全物件を同期（手動実行用）
 */
function syncAllProperties() {
  Logger.log('🔄 全物件同期を開始します...');
  
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('物件');
  if (!sheet) {
    Logger.log('❌ 「物件」シートが見つかりません');
    return;
  }
  
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  
  // ヘッダー行のインデックスを取得
  var colIndex = {};
  for (var i = 0; i < headers.length; i++) {
    colIndex[headers[i]] = i;
  }
  
  Logger.log('📋 ヘッダー確認:');
  Logger.log('  物件番号: ' + colIndex['物件番号']);
  Logger.log('  価格 (BS列): ' + colIndex['価格']);
  Logger.log('  売買価格 (J列): ' + colIndex['売買価格']);
  Logger.log('  売出価格 (e列): ' + colIndex['売出価格']);
  
  var properties = [];
  var totalRows = data.length;
  var processedCount = 0;
  var updatedCount = 0;
  var errorCount = 0;
  
  // データ行を処理（1行目はヘッダーなのでスキップ）
  for (var i = 1; i < totalRows; i++) {
    var row = data[i];
    var propertyNumber = row[colIndex['物件番号']];
    
    // 物件番号が空の場合はスキップ
    if (!propertyNumber || propertyNumber.toString().trim() === '') {
      continue;
    }
    
    processedCount++;
    
    // 価格の優先順位: BS列（価格）→ J列（売買価格）
    var salesPrice = null;
    if (colIndex['価格'] !== undefined && row[colIndex['価格']]) {
      salesPrice = parseFloat(String(row[colIndex['価格']]).replace(/,/g, ''));
    } else if (colIndex['売買価格'] !== undefined && row[colIndex['売買価格']]) {
      salesPrice = parseFloat(String(row[colIndex['売買価格']]).replace(/,/g, ''));
    }
    
    var listingPrice = null;
    if (colIndex['売出価格'] !== undefined && row[colIndex['売出価格']]) {
      listingPrice = parseFloat(String(row[colIndex['売出価格']]).replace(/,/g, ''));
    }
    
    var propertyData = {
      property_number: propertyNumber.toString().trim(),
      address: row[colIndex['所在地']] ? row[colIndex['所在地']].toString() : '',
      display_address: row[colIndex['住居表示（ATBB登録住所）']] ? row[colIndex['住居表示（ATBB登録住所）']].toString() : '',
      property_type: row[colIndex['種別']] ? row[colIndex['種別']].toString() : '',
      sales_price: salesPrice,
      listing_price: listingPrice,
      buyer_name: row[colIndex['名前（買主）']] ? row[colIndex['名前（買主）']].toString() : '',
      seller_name: row[colIndex['名前(売主）']] ? row[colIndex['名前(売主）']].toString() : '',
      land_area: row[colIndex['土地面積']] ? parseFloat(row[colIndex['土地面積']]) : null,
      building_area: row[colIndex['建物面積']] ? parseFloat(row[colIndex['建物面積']]) : null,
      atbb_status: row[colIndex['atbb成約済み/非公開']] ? row[colIndex['atbb成約済み/非公開']].toString() : '',
      status: row[colIndex['状況']] ? row[colIndex['状況']].toString() : '',
      google_map_url: row[colIndex['GoogleMap']] ? row[colIndex['GoogleMap']].toString() : '',
      current_status: row[colIndex['●現況']] ? row[colIndex['●現況']].toString() : '',
      delivery: row[colIndex['引渡し']] ? row[colIndex['引渡し']].toString() : '',
      updated_at: new Date().toISOString()
    };
    
    properties.push(propertyData);
    
    // 100件ごとにバッチ処理
    if (properties.length >= 100) {
      var result = upsertPropertiesToSupabase(properties);
      updatedCount += result.success;
      errorCount += result.error;
      properties = [];
      
      // 進捗表示
      Logger.log('進捗: ' + processedCount + '/' + (totalRows - 1) + ' 件処理済み');
      
      // API制限対策（少し待機）
      Utilities.sleep(1000);
    }
  }
  
  // 残りのデータを処理
  if (properties.length > 0) {
    var result = upsertPropertiesToSupabase(properties);
    updatedCount += result.success;
    errorCount += result.error;
  }
  
  Logger.log('');
  Logger.log('✅ 全物件同期が完了しました！');
  Logger.log('  処理件数: ' + processedCount + ' 件');
  Logger.log('  更新成功: ' + updatedCount + ' 件');
  Logger.log('  エラー: ' + errorCount + ' 件');
}

/**
 * Supabaseにバッチupsert
 */
function upsertPropertiesToSupabase(properties) {
  var url = SUPABASE_URL + '/rest/v1/property_listings';
  
  var options = {
    method: 'post',
    contentType: 'application/json',
    headers: {
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY,
      'Prefer': 'resolution=merge-duplicates'
    },
    payload: JSON.stringify(properties),
    muteHttpExceptions: true
  };
  
  try {
    var response = UrlFetchApp.fetch(url, options);
    var status = response.getResponseCode();
    
    if (status === 201 || status === 200) {
      return { success: properties.length, error: 0 };
    } else {
      Logger.log('❌ Supabase upsert失敗 HTTP ' + status + ': ' + response.getContentText());
      return { success: 0, error: properties.length };
    }
  } catch (error) {
    Logger.log('❌ upsertエラー: ' + error.toString());
    return { success: 0, error: properties.length };
  }
}

/**
 * スクリプトプロパティを設定（初回のみ実行）
 */
function setupScriptProperties() {
  var properties = PropertiesService.getScriptProperties();
  
  // 以下の値を実際の値に置き換えてください
  properties.setProperty('SUPABASE_URL', 'https://krxhrbtlgfjzsseegaqq.supabase.co');
  properties.setProperty('SUPABASE_SERVICE_KEY', 'YOUR_SUPABASE_SERVICE_KEY_HERE');
  
  Logger.log('✅ スクリプトプロパティを設定しました');
}

/**
 * テスト用（最初の10件のみ同期）
 */
function testSync() {
  Logger.log('🧪 テスト同期を開始します（最初の10件のみ）...');
  
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('物件');
  if (!sheet) {
    Logger.log('❌ 「物件」シートが見つかりません');
    return;
  }
  
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  
  // ヘッダー行のインデックスを取得
  var colIndex = {};
  for (var i = 0; i < headers.length; i++) {
    colIndex[headers[i]] = i;
  }
  
  var properties = [];
  var count = 0;
  
  // 最初の10件を処理
  for (var i = 1; i < data.length && count < 10; i++) {
    var row = data[i];
    var propertyNumber = row[colIndex['物件番号']];
    
    if (!propertyNumber || propertyNumber.toString().trim() === '') {
      continue;
    }
    
    count++;
    
    // 価格の優先順位: BS列（価格）→ J列（売買価格）
    var salesPrice = null;
    if (colIndex['価格'] !== undefined && row[colIndex['価格']]) {
      salesPrice = parseFloat(String(row[colIndex['価格']]).replace(/,/g, ''));
    } else if (colIndex['売買価格'] !== undefined && row[colIndex['売買価格']]) {
      salesPrice = parseFloat(String(row[colIndex['売買価格']]).replace(/,/g, ''));
    }
    
    Logger.log('物件番号: ' + propertyNumber + ', 価格: ' + salesPrice);
    
    var propertyData = {
      property_number: propertyNumber.toString().trim(),
      sales_price: salesPrice,
      updated_at: new Date().toISOString()
    };
    
    properties.push(propertyData);
  }
  
  Logger.log('');
  Logger.log('📊 テストデータ: ' + properties.length + ' 件');
  Logger.log(JSON.stringify(properties, null, 2));
}
