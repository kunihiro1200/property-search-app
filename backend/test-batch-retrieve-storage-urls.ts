import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { PropertyService } from './src/services/PropertyService';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testBatchRetrieveStorageUrls() {
  console.log('=== 格納先URL一括取得（テスト：最初の5件） ===\n');

  try {
    // 対象物件を取得（最初の5件のみ）
    const { data: properties, error } = await supabase
      .from('property_listings')
      .select('id, property_number, atbb_status')
      .is('storage_location', null)
      .not('atbb_status', 'ilike', '%非公開（専任）%')
      .not('atbb_status', 'ilike', '%非公開（一般）%')
      .not('atbb_status', 'ilike', '%E外し非公開%')
      .order('property_number', { ascending: true })
      .limit(5);

    if (error) {
      console.error('❌ エラー:', error);
      return;
    }

    if (!properties || properties.length === 0) {
      console.log('対象物件はありません。');
      return;
    }

    console.log(`📊 テスト対象物件数: ${properties.length}件\n`);
    console.log('処理を開始します...\n');

    const propertyService = new PropertyService();
    let successCount = 0;
    let notFoundCount = 0;
    let errorCount = 0;

    for (let i = 0; i < properties.length; i++) {
      const property = properties[i];
      
      try {
        console.log(`[${i + 1}/${properties.length}] ${property.property_number} (${property.atbb_status})...`);
        
        const storageUrl = await propertyService.retrieveStorageUrl(property.property_number);
        
        if (storageUrl) {
          console.log(`  ✅ 成功: ${storageUrl}`);
          successCount++;
        } else {
          console.log(`  ⚠️  見つかりません（Google Driveにフォルダが存在しない可能性）`);
          notFoundCount++;
        }
        
        // Google Drive API制限を避けるため、少し待機
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error: any) {
        console.log(`  ❌ エラー: ${error.message}`);
        errorCount++;
        
        // エラーが続く場合は少し長めに待機
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      console.log('');
    }

    console.log('=== テスト完了 ===');
    console.log(`✅ 成功: ${successCount}件`);
    console.log(`⚠️  見つからない: ${notFoundCount}件`);
    console.log(`❌ エラー: ${errorCount}件`);
    console.log(`📊 合計: ${properties.length}件`);
    
    if (successCount > 0) {
      console.log('\n✅ テストが成功しました！');
      console.log('全件処理を実行する場合は、以下のコマンドを実行してください：');
      console.log('  npx ts-node batch-retrieve-storage-urls.ts');
    }

  } catch (error: any) {
    console.error('❌ エラー:', error.message);
    console.error(error);
  }
}

testBatchRetrieveStorageUrls();
