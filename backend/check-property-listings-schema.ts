// property_listingsテーブルのスキーマを確認
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config();

async function checkSchema() {
  console.log('🔍 property_listingsテーブルのスキーマを確認中...\n');
  console.log('='.repeat(80));
  
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );
    
    // AA4885のデータを取得
    const { data, error } = await supabase
      .from('property_listings')
      .select('*')
      .eq('property_number', 'AA4885')
      .single();
    
    if (error) {
      console.error('❌ エラー:', error.message);
      return;
    }
    
    if (!data) {
      console.log('❌ AA4885が見つかりません');
      return;
    }
    
    console.log('✅ AA4885のデータを取得しました\n');
    
    // ATBB関連のカラムを検索
    console.log('📊 ATBB関連のカラム:');
    console.log('-'.repeat(80));
    
    const atbbColumns = Object.keys(data).filter(key => 
      key.toLowerCase().includes('atbb') || 
      key.toLowerCase().includes('athome')
    );
    
    if (atbbColumns.length === 0) {
      console.log('❌ ATBB関連のカラムが見つかりません');
    } else {
      for (const column of atbbColumns) {
        console.log(`  ${column}: ${data[column] || '(null)'}`);
      }
    }
    
    // すべてのカラム名を表示
    console.log('\n📋 すべてのカラム名:');
    console.log('-'.repeat(80));
    const allColumns = Object.keys(data).sort();
    for (let i = 0; i < allColumns.length; i += 3) {
      const cols = allColumns.slice(i, i + 3);
      console.log(`  ${cols.join(', ')}`);
    }
    
  } catch (error: any) {
    console.error('❌ エラー:', error.message);
  }
}

checkSchema()
  .then(() => {
    console.log('\n✅ スクリプト完了');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ スクリプトエラー:', error);
    process.exit(1);
  });
