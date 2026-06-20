import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function checkSchema() {
  console.log('🔍 Checking property_details schema...\n');

  // PostgreSQLのinformation_schemaから直接カラム情報を取得
  const { data, error } = await supabase
    .rpc('exec_sql', {
      query: `
        SELECT 
          column_name,
          data_type,
          is_nullable,
          column_default
        FROM information_schema.columns
        WHERE table_name = 'property_details'
        ORDER BY ordinal_position;
      `
    });

  if (error) {
    console.error('❌ Error fetching schema:', error);
    
    // 代替方法: テーブルから1行取得してカラムを確認
    console.log('\n📋 Trying alternative method...');
    const { data: sampleData, error: sampleError } = await supabase
      .from('property_details')
      .select('*')
      .limit(1);
    
    if (sampleError) {
      console.error('❌ Error fetching sample data:', sampleError);
    } else if (sampleData && sampleData.length > 0) {
      console.log('✅ Sample row columns:');
      Object.keys(sampleData[0]).forEach(key => {
        console.log(`  - ${key}: ${typeof sampleData[0][key]}`);
      });
    } else {
      console.log('⚠️  No data in property_details table');
    }
    return;
  }

  console.log('✅ property_details schema:');
  data.forEach((col: any) => {
    console.log(`  - ${col.column_name} (${col.data_type}) ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
  });
}

checkSchema().catch(console.error);
