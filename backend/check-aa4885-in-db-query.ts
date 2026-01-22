// データベースクエリでAA4885が取得できるか確認
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config();

async function checkAA4885InDbQuery() {
  console.log('🔍 データベースクエリでAA4885を確認中...\n');
  console.log('='.repeat(80));
  
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );
    
    // 1. 全件取得（detectUpdatedPropertyListingsと同じ方法）
    console.log('📊 Step 1: 全件取得');
    console.log('-'.repeat(80));
    
    const { data: allData, error } = await supabase
      .from('property_listings')
      .select('*');
    
    if (error) {
      console.error('❌ エラー:', error.message);
      return;
    }
    
    console.log(`✅ 取得件数: ${allData?.length || 0}件`);
    
    // 2. AA4885が含まれているか確認
    console.log('\n📊 Step 2: AA4885が含まれているか確認');
    console.log('-'.repeat(80));
    
    const aa4885 = allData?.find(p => p.property_number === 'AA4885');
    
    if (aa4885) {
      console.log('✅ AA4885が見つかりました');
      console.log(`  atbb_status: ${aa4885.atbb_status || '(null)'}`);
      console.log(`  updated_at: ${aa4885.updated_at}`);
    } else {
      console.log('❌ AA4885が見つかりません');
      
      // AA48で始まる物件を検索
      const aa48Properties = allData?.filter(p => 
        p.property_number && p.property_number.startsWith('AA48')
      ) || [];
      
      console.log(`\n📋 AA48で始まる物件: ${aa48Properties.length}件`);
      aa48Properties.forEach(p => {
        console.log(`  - ${p.property_number}`);
      });
    }
    
    // 3. 直接クエリで確認
    console.log('\n📊 Step 3: 直接クエリで確認');
    console.log('-'.repeat(80));
    
    const { data: directData, error: directError } = await supabase
      .from('property_listings')
      .select('*')
      .eq('property_number', 'AA4885')
      .single();
    
    if (directError) {
      console.error('❌ エラー:', directError.message);
    } else if (directData) {
      console.log('✅ 直接クエリでAA4885が見つかりました');
      console.log(`  atbb_status: ${directData.atbb_status || '(null)'}`);
      console.log(`  updated_at: ${directData.updated_at}`);
    } else {
      console.log('❌ 直接クエリでもAA4885が見つかりません');
    }
    
    // 4. 結論
    console.log('\n📊 結論:');
    console.log('='.repeat(80));
    
    if (aa4885 && directData) {
      console.log('✅ AA4885はデータベースに存在し、両方のクエリで取得できます');
      console.log('💡 detectUpdatedPropertyListingsで検出されない理由を調査する必要があります');
    } else if (!aa4885 && directData) {
      console.log('⚠️  全件取得ではAA4885が含まれていませんが、直接クエリでは取得できます');
      console.log('💡 これは、全件取得に制限がある可能性があります（ページネーション等）');
    } else {
      console.log('❌ AA4885がデータベースに存在しません');
    }
    
  } catch (error: any) {
    console.error('❌ エラー:', error.message);
    if (error.stack) {
      console.error('\nスタックトレース:');
      console.error(error.stack);
    }
  }
}

checkAA4885InDbQuery()
  .then(() => {
    console.log('\n✅ 確認完了');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ 確認エラー:', error);
    process.exit(1);
  });
