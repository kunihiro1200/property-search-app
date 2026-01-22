import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

async function checkSellersSchema() {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  console.log('🔍 sellersテーブルのスキーマを確認します...\n');

  // visit関連のカラムを確認
  const { data, error } = await supabase
    .from('sellers')
    .select('*')
    .limit(1);

  if (error) {
    console.error('❌ エラー:', error);
    return;
  }

  if (data && data.length > 0) {
    const columns = Object.keys(data[0]);
    console.log('✅ sellersテーブルのカラム一覧:\n');
    
    // visit関連のカラムをフィルタ
    const visitColumns = columns.filter(col => 
      col.toLowerCase().includes('visit') || 
      col.toLowerCase().includes('acquisition')
    );
    
    console.log('📋 visit/acquisition関連のカラム:');
    visitColumns.forEach(col => {
      console.log(`  - ${col}`);
    });
    
    console.log('\n📋 全カラム数:', columns.length);
    
    // visit_acquisition_dateが存在するか確認
    if (columns.includes('visit_acquisition_date')) {
      console.log('\n✅ visit_acquisition_dateカラムは存在します');
    } else {
      console.log('\n❌ visit_acquisition_dateカラムが存在しません！');
      console.log('   類似のカラム:');
      const similar = columns.filter(col => 
        col.includes('visit') || col.includes('acquisition') || col.includes('date')
      );
      similar.forEach(col => console.log(`     - ${col}`));
    }
  }
}

checkSellersSchema();
