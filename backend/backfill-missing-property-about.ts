import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { PropertyListingSyncService } from './src/services/PropertyListingSyncService';
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';

dotenv.config();

async function backfillMissingPropertyAbout() {
  console.log('🔍 property_aboutが空の物件を検出して再同期します...\n');
  
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );
  
  try {
    // 1. property_aboutが空の物件を検出
    console.log('📊 1. property_aboutが空の物件を検出中...');
    const { data: properties, error } = await supabase
      .from('property_details')
      .select('property_number, property_about, recommended_comments, favorite_comment')
      .or('property_about.is.null,property_about.eq.');
    
    if (error) {
      console.error('❌ エラー:', error.message);
      return;
    }
    
    if (!properties || properties.length === 0) {
      console.log('✅ すべての物件にproperty_aboutがあります');
      return;
    }
    
    console.log(`📊 property_aboutが空の物件: ${properties.length}件\n`);
    console.log('   最初の10件:');
    properties.slice(0, 10).forEach(p => {
      console.log(`   - ${p.property_number}`);
    });
    
    // 2. GoogleSheetsClientを初期化
    console.log('\n📊 2. GoogleSheetsClientを初期化中...');
    const sheetsClient = new GoogleSheetsClient({
      spreadsheetId: process.env.PROPERTY_LISTING_SPREADSHEET_ID!,
      sheetName: process.env.PROPERTY_LISTING_SHEET_NAME || '物件',
      serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json',
    });
    
    await sheetsClient.authenticate();
    console.log('✅ GoogleSheetsClient初期化完了');
    
    // 3. PropertyListingSyncServiceを初期化
    const syncService = new PropertyListingSyncService(sheetsClient);
    
    // 4. 各物件のコメントデータを再取得
    console.log('\n📊 3. 各物件のコメントデータを再取得中...\n');
    let success = 0;
    let failed = 0;
    const errors: Array<{ property_number: string; error: string }> = [];
    
    for (let i = 0; i < properties.length; i++) {
      const property = properties[i];
      const progress = `[${i + 1}/${properties.length}]`;
      
      try {
        console.log(`${progress} ${property.property_number}: 再同期中...`);
        
        // updatePropertyDetailsFromSheetsを呼び出す
        // privateメソッドなので、anyでキャスト
        await (syncService as any).updatePropertyDetailsFromSheets(property.property_number);
        
        success++;
        console.log(`${progress} ✅ ${property.property_number}: 成功`);
        
      } catch (error: any) {
        failed++;
        errors.push({
          property_number: property.property_number,
          error: error.message
        });
        console.error(`${progress} ❌ ${property.property_number}: ${error.message}`);
      }
      
      // レート制限を考慮して2秒待機（1秒から2秒に変更）
      if (i < properties.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    // 5. 結果サマリー
    console.log('\n\n📊 再同期完了:');
    console.log('─────────────────────────────────────────────────────');
    console.log(`  対象物件: ${properties.length}件`);
    console.log(`  成功: ${success}件`);
    console.log(`  失敗: ${failed}件`);
    console.log('─────────────────────────────────────────────────────');
    
    if (failed > 0) {
      console.log('\n❌ 失敗した物件:');
      errors.forEach(err => {
        console.log(`  - ${err.property_number}: ${err.error}`);
      });
    }
    
    // 6. AA12608の確認
    if (properties.some(p => p.property_number === 'AA12608')) {
      console.log('\n📊 AA12608の確認:');
      const { data: aa12608Details } = await supabase
        .from('property_details')
        .select('property_about, recommended_comments, favorite_comment')
        .eq('property_number', 'AA12608')
        .single();
      
      if (aa12608Details) {
        console.log('   - property_about:', aa12608Details.property_about ? '✅ あり' : '❌ なし');
        console.log('   - recommended_comments:', aa12608Details.recommended_comments ? '✅ あり' : '❌ なし');
        console.log('   - favorite_comment:', aa12608Details.favorite_comment ? '✅ あり' : '❌ なし');
      }
    }
    
  } catch (error: any) {
    console.error('❌ エラー:', error.message);
    console.error(error.stack);
  }
}

backfillMissingPropertyAbout();
