// AA13290のパノラマ同期テスト
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { AthomeDataService } from './src/services/AthomeDataService';
import { GyomuListService } from './src/services/GyomuListService';

dotenv.config();

async function testAA13290PanoramaSync() {
  try {
    console.log('🔍 AA13290のパノラマ同期テスト開始\n');
    
    const propertyNumber = 'AA13290';
    
    // 1. 業務リストからデータを取得
    console.log('📋 業務リストからデータを取得中...');
    const gyomuListService = new GyomuListService();
    const gyomuData = await gyomuListService.getByPropertyNumber(propertyNumber);
    
    if (!gyomuData) {
      console.log('❌ 業務リストにデータが見つかりません');
      return;
    }
    
    console.log('✅ 業務リストデータ:');
    console.log('  - 格納先URL:', gyomuData.storageUrl || '(なし)');
    console.log('  - スプシURL:', gyomuData.spreadsheetUrl || '(なし)');
    console.log('');
    
    // 2. AthomeDataServiceでパノラマURLを取得
    console.log('🔄 AthomeDataServiceでパノラマURLを取得中...');
    const athomeDataService = new AthomeDataService();
    const result = await athomeDataService.getAthomeData(propertyNumber, 'detached_house', null);
    
    console.log('✅ AthomeDataService結果:');
    console.log('  - athome_data:', result.data);
    console.log('  - フォルダURL:', result.data[0] || '(なし)');
    console.log('  - パノラマURL:', result.data[1] || '(なし)');
    console.log('  - キャッシュ:', result.cached);
    console.log('');
    
    // 3. データベースの現在の状態を確認
    console.log('📊 データベースの現在の状態を確認中...');
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );
    
    const { data: dbData, error: dbError } = await supabase
      .from('property_details')
      .select('property_number, athome_data, updated_at')
      .eq('property_number', propertyNumber)
      .single();
    
    if (dbError) {
      console.log('❌ データベースエラー:', dbError.message);
    } else if (!dbData) {
      console.log('⚠️ property_detailsにレコードが存在しません');
    } else {
      console.log('✅ データベースの状態:');
      console.log('  - athome_data:', dbData.athome_data);
      console.log('  - updated_at:', dbData.updated_at);
    }
    console.log('');
    
    // 4. データベースを更新
    if (result.data.length > 0 && result.data[1]) {
      console.log('🔄 データベースを更新中...');
      
      const { error: updateError } = await supabase
        .from('property_details')
        .upsert({
          property_number: propertyNumber,
          athome_data: result.data,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'property_number'
        });
      
      if (updateError) {
        console.log('❌ 更新エラー:', updateError.message);
      } else {
        console.log('✅ データベース更新成功');
        console.log('  - 新しいathome_data:', result.data);
      }
    } else {
      console.log('⚠️ パノラマURLが取得できなかったため、更新をスキップします');
    }
    
  } catch (error: any) {
    console.error('\n❌ エラー:', error.message);
    console.error(error.stack);
  }
}

testAA13290PanoramaSync()
  .then(() => {
    console.log('\n✅ テスト完了');
    process.exit(0);
  })
  .catch((error) => {
    console.error('テスト実行エラー:', error);
    process.exit(1);
  });
