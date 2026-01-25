// パノラマURL自動同期（60秒待機してから開始）
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';

dotenv.config();

async function syncPanoramaAuto() {
  try {
    console.log('\n========================================');
    console.log('パノラマURL自動同期');
    console.log('========================================\n');
    
    // 最初に60秒待機（クォータをリセット）
    console.log('⏳ Google Sheets APIクォータをリセットするため、60秒待機中...');
    console.log(`開始時刻: ${new Date().toLocaleString('ja-JP')}`);
    await new Promise(resolve => setTimeout(resolve, 60000));
    console.log(`再開時刻: ${new Date().toLocaleString('ja-JP')}\n`);
    
    const supabaseUrl = process.env.SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // 業務依頼シートから全物件を取得（リトライ機能付き）
    console.log('📋 業務依頼シートから物件を取得中...\n');
    
    const gyomuListClient = new GoogleSheetsClient({
      spreadsheetId: '1MO2vs0mDUFCgM-rjXXPRIy3pKKdfIFvUDwacM-2174g',
      sheetName: '業務依頼',
      serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || 'google-service-account.json',
    });
    
    await gyomuListClient.authenticate();
    
    let allData: any[] = [];
    let retryCount = 0;
    const maxRetries = 10;
    
    while (retryCount < maxRetries) {
      try {
        allData = await gyomuListClient.readRange('A2:ZZ1000');
        break;
      } catch (error: any) {
        if (error.message?.includes('Quota exceeded')) {
          retryCount++;
          console.log(`⏳ クォータ超過（${retryCount}/${maxRetries}回目）。60秒待機中...`);
          console.log(`待機開始: ${new Date().toLocaleString('ja-JP')}`);
          await new Promise(resolve => setTimeout(resolve, 60000));
          console.log(`再試行: ${new Date().toLocaleString('ja-JP')}\n`);
        } else {
          throw error;
        }
      }
    }
    
    if (allData.length === 0) {
      throw new Error('業務依頼シートの取得に失敗しました');
    }
    
    // スプシURLがある物件をフィルタリング
    const propertiesWithSpreadsheet: Array<{ propertyNumber: string; spreadsheetUrl: string }> = [];
    
    for (const row of allData) {
      const propertyNumber = row['物件番号'];
      const spreadsheetUrl = row['スプシURL'];
      
      if (propertyNumber && spreadsheetUrl) {
        propertiesWithSpreadsheet.push({
          propertyNumber: String(propertyNumber),
          spreadsheetUrl: String(spreadsheetUrl),
        });
      }
    }
    
    console.log(`✅ スプシURLがある物件: ${propertiesWithSpreadsheet.length}件\n`);
    
    // バッチサイズ（10件ずつ処理）
    const batchSize = 10;
    const totalBatches = Math.ceil(propertiesWithSpreadsheet.length / batchSize);
    
    console.log(`📦 バッチ数: ${totalBatches}（${batchSize}件ずつ）\n`);
    
    const { google } = require('googleapis');
    const auth = new google.auth.GoogleAuth({
      keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || 'google-service-account.json',
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });
    
    const sheets = google.sheets({ version: 'v4', auth });
    
    let totalSuccess = 0;
    let totalFail = 0;
    let totalSkip = 0;
    
    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      const start = batchIndex * batchSize;
      const end = Math.min(start + batchSize, propertiesWithSpreadsheet.length);
      const batch = propertiesWithSpreadsheet.slice(start, end);
      
      console.log(`\n========================================`);
      console.log(`📦 バッチ ${batchIndex + 1}/${totalBatches} (${start + 1}-${end}件目)`);
      console.log(`時刻: ${new Date().toLocaleString('ja-JP')}`);
      console.log(`========================================\n`);
      
      let batchSuccess = 0;
      let batchFail = 0;
      let batchSkip = 0;
      
      for (let i = 0; i < batch.length; i++) {
        const { propertyNumber, spreadsheetUrl } = batch[i];
        
        console.log(`[${start + i + 1}/${propertiesWithSpreadsheet.length}] ${propertyNumber}`);
        
        try {
          const spreadsheetIdMatch = spreadsheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
          if (!spreadsheetIdMatch) {
            console.log(`  ⚠️ スプレッドシートIDを抽出できません（スキップ）`);
            batchSkip++;
            continue;
          }
          
          const spreadsheetId = spreadsheetIdMatch[1];
          
          // N1セル取得（リトライ機能付き）
          let response: any = null;
          let cellRetryCount = 0;
          const cellMaxRetries = 10;
          
          while (cellRetryCount < cellMaxRetries) {
            try {
              response = await sheets.spreadsheets.values.get({
                spreadsheetId: spreadsheetId,
                range: 'athome!N1',
                valueRenderOption: 'UNFORMATTED_VALUE',
              });
              break;
            } catch (error: any) {
              if (error.message?.includes('Quota exceeded')) {
                cellRetryCount++;
                console.log(`  ⏳ クォータ超過（${cellRetryCount}/${cellMaxRetries}回目）。60秒待機中...`);
                await new Promise(resolve => setTimeout(resolve, 60000));
              } else {
                throw error;
              }
            }
          }
          
          if (!response) {
            console.log(`  ❌ N1セル取得失敗（スキップ）`);
            batchSkip++;
            continue;
          }
          
          const values = response.data.values;
          
          if (!values || values.length === 0 || values[0].length === 0) {
            console.log(`  ⚠️ N1セルが空です（スキップ）`);
            batchSkip++;
            continue;
          }
          
          const panoramaUrl = String(values[0][0]);
          console.log(`  ✅ パノラマURL取得`);
          
          const { data: currentDetails } = await supabase
            .from('property_details')
            .select('athome_data')
            .eq('property_number', propertyNumber)
            .single();
          
          let folderUrl = '';
          if (currentDetails?.athome_data && Array.isArray(currentDetails.athome_data) && currentDetails.athome_data.length > 0) {
            folderUrl = currentDetails.athome_data[0] || '';
          }
          
          if (folderUrl && folderUrl.includes('vrpanorama.athome.jp')) {
            folderUrl = '';
          }
          
          const athomeDataArray = [folderUrl, panoramaUrl];
          
          await supabase
            .from('property_details')
            .update({
              athome_data: athomeDataArray,
              updated_at: new Date().toISOString(),
            })
            .eq('property_number', propertyNumber);
          
          console.log(`  ✅ 保存成功`);
          batchSuccess++;
          
          await new Promise(resolve => setTimeout(resolve, 1000));
          
        } catch (error: any) {
          console.log(`  ❌ エラー: ${error.message}`);
          batchFail++;
        }
      }
      
      totalSuccess += batchSuccess;
      totalFail += batchFail;
      totalSkip += batchSkip;
      
      console.log(`\n📊 バッチ結果: 成功=${batchSuccess}, 失敗=${batchFail}, スキップ=${batchSkip}`);
      console.log(`📊 累計: 成功=${totalSuccess}, 失敗=${totalFail}, スキップ=${totalSkip}`);
      
      // 次のバッチまで60秒待機
      if (batchIndex < totalBatches - 1) {
        console.log(`\n⏳ 次のバッチまで60秒待機中...`);
        console.log(`待機開始: ${new Date().toLocaleString('ja-JP')}`);
        await new Promise(resolve => setTimeout(resolve, 60000));
      }
    }
    
    console.log('\n========================================');
    console.log('✅ 全バッチ完了');
    console.log(`完了時刻: ${new Date().toLocaleString('ja-JP')}`);
    console.log(`成功: ${totalSuccess}件`);
    console.log(`失敗: ${totalFail}件`);
    console.log(`スキップ: ${totalSkip}件`);
    console.log('========================================\n');
    
  } catch (error: any) {
    console.error('\n❌ エラー:', error.message);
    console.error(`エラー発生時刻: ${new Date().toLocaleString('ja-JP')}`);
  }
}

syncPanoramaAuto()
  .then(() => {
    console.log(`スクリプト実行完了: ${new Date().toLocaleString('ja-JP')}`);
    process.exit(0);
  })
  .catch((error) => {
    console.error('スクリプト実行エラー:', error);
    console.error(`エラー発生時刻: ${new Date().toLocaleString('ja-JP')}`);
    process.exit(1);
  });
