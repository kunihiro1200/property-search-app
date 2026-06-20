// 全物件のパノラマURLを一括更新（AthomeDataServiceを使用）
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { AthomeDataService } from './src/services/AthomeDataService';
import { GyomuListService } from './src/services/GyomuListService';

dotenv.config();

async function syncAllPanoramaUrls() {
  try {
    console.log('\n========================================');
    console.log('全物件のパノラマURL一括更新');
    console.log('========================================\n');
    
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );
    
    // 1. 業務リストから全物件を取得
    console.log('📋 業務リストから物件を取得中...\n');
    const gyomuListService = new GyomuListService();
    
    // ダミーの物件番号で呼び出してキャッシュをリフレッシュ
    await gyomuListService.getByPropertyNumber('DUMMY');
    
    // キャッシュから全物件を取得（privateプロパティにアクセス）
    const cache = (gyomuListService as any).cache;
    const allProperties: Array<{ propertyNumber: string; spreadsheetUrl: string }> = [];
    
    for (const [propertyNumber, data] of cache.entries()) {
      if (data.spreadsheetUrl) {
        allProperties.push({
          propertyNumber,
          spreadsheetUrl: data.spreadsheetUrl,
        });
      }
    }
    
    console.log(`✅ スプシURLがある物件: ${allProperties.length}件\n`);
    
    if (allProperties.length === 0) {
      console.log('⚠️ 更新対象の物件がありません');
      return;
    }
    
    // 2. AthomeDataServiceを初期化
    const athomeDataService = new AthomeDataService();
    
    // 3. バッチ処理（10件ずつ）
    const BATCH_SIZE = 10;
    const totalBatches = Math.ceil(allProperties.length / BATCH_SIZE);
    
    console.log(`📦 バッチ数: ${totalBatches}（${BATCH_SIZE}件ずつ）\n`);
    
    let totalSuccess = 0;
    let totalFail = 0;
    let totalSkip = 0;
    
    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      const start = batchIndex * BATCH_SIZE;
      const end = Math.min(start + BATCH_SIZE, allProperties.length);
      const batch = allProperties.slice(start, end);
      
      console.log(`\n========================================`);
      console.log(`📦 バッチ ${batchIndex + 1}/${totalBatches} (${start + 1}-${end}件目)`);
      console.log(`時刻: ${new Date().toLocaleString('ja-JP')}`);
      console.log(`========================================\n`);
      
      let batchSuccess = 0;
      let batchFail = 0;
      let batchSkip = 0;
      
      // バッチ内の物件を並列処理
      const batchPromises = batch.map(async ({ propertyNumber }, i) => {
        const index = start + i + 1;
        console.log(`[${index}/${allProperties.length}] ${propertyNumber}`);
        
        try {
          // property_detailsから現在のデータを取得（property_typeカラムは参照しない）
          const { data: currentDetails, error: fetchError } = await supabase
            .from('property_details')
            .select('athome_data')
            .eq('property_number', propertyNumber)
            .single();
          
          // レコードが存在しない場合もエラーではない（新規作成する）
          const currentAthomeData = currentDetails?.athome_data || [];
          const currentPanoramaUrl = currentAthomeData[1] || '';
          
          // AthomeDataServiceでパノラマURLを取得（property_typeはデフォルト値を使用）
          const result = await athomeDataService.getAthomeData(
            propertyNumber,
            'detached_house', // デフォルト値
            null
          );
          
          if (!result.data || result.data.length < 2 || !result.data[1]) {
            console.log(`  ⚠️ パノラマURLが取得できません（スキップ）`);
            return { status: 'skip' };
          }
          
          const [folderUrl, panoramaUrl] = result.data;
          
          // 既存のパノラマURLと比較
          if (currentPanoramaUrl === panoramaUrl) {
            console.log(`  ✅ パノラマURL既に最新（スキップ）`);
            return { status: 'skip' };
          }
          
          // データベースを更新（upsert: レコードがない場合は新規作成）
          const { error: updateError } = await supabase
            .from('property_details')
            .upsert({
              property_number: propertyNumber,
              athome_data: [folderUrl, panoramaUrl],
              updated_at: new Date().toISOString(),
            }, {
              onConflict: 'property_number'
            });
          
          if (updateError) {
            console.log(`  ❌ 更新エラー: ${updateError.message}`);
            return { status: 'fail' };
          }
          
          console.log(`  ✅ パノラマURL更新成功`);
          return { status: 'success' };
          
        } catch (error: any) {
          console.log(`  ❌ エラー: ${error.message}`);
          return { status: 'fail' };
        }
      });
      
      // バッチ内の全処理を待機
      const batchResults = await Promise.all(batchPromises);
      
      // 結果を集計
      batchSuccess = batchResults.filter(r => r.status === 'success').length;
      batchFail = batchResults.filter(r => r.status === 'fail').length;
      batchSkip = batchResults.filter(r => r.status === 'skip').length;
      
      totalSuccess += batchSuccess;
      totalFail += batchFail;
      totalSkip += batchSkip;
      
      console.log(`\n📊 バッチ結果: 成功=${batchSuccess}, 失敗=${batchFail}, スキップ=${batchSkip}`);
      console.log(`📊 累計: 成功=${totalSuccess}, 失敗=${totalFail}, スキップ=${totalSkip}`);
      
      // 次のバッチまで2秒待機（Google Sheets APIのレート制限対策）
      if (batchIndex < totalBatches - 1) {
        console.log(`\n⏳ 次のバッチまで2秒待機中...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
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

syncAllPanoramaUrls()
  .then(() => {
    console.log(`スクリプト実行完了: ${new Date().toLocaleString('ja-JP')}`);
    process.exit(0);
  })
  .catch((error) => {
    console.error('スクリプト実行エラー:', error);
    console.error(`エラー発生時刻: ${new Date().toLocaleString('ja-JP')}`);
    process.exit(1);
  });
