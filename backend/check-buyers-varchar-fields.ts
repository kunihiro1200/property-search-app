/**
 * 買主テーブルのVARCHAR(50)フィールドを確認
 */
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

async function checkBuyersVarcharFields() {
  console.log('🔍 Checking buyers table schema for VARCHAR(50) fields...\n');

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  // テーブルのカラム情報を取得
  const { data, error } = await supabase
    .rpc('get_table_columns', { table_name: 'buyers' })
    .select('*');

  if (error) {
    // RPCが存在しない場合は、直接SQLで取得
    const { data: columns, error: sqlError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, character_maximum_length')
      .eq('table_name', 'buyers')
      .eq('table_schema', 'public');

    if (sqlError) {
      console.error('❌ Error:', sqlError.message);
      
      // 代替方法: 直接クエリ
      console.log('\n📋 Using alternative method...');
      const query = `
        SELECT column_name, data_type, character_maximum_length
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'buyers'
        ORDER BY ordinal_position;
      `;
      
      const { data: altColumns, error: altError } = await supabase.rpc('exec_sql', { sql: query });
      
      if (altError) {
        console.error('❌ Alternative method failed:', altError.message);
        console.log('\n💡 Please run this SQL query directly in Supabase:');
        console.log(query);
        process.exit(1);
      }
      
      displayColumns(altColumns);
    } else {
      displayColumns(columns);
    }
  } else {
    displayColumns(data);
  }

  console.log('\n🎉 Check complete!');
  process.exit(0);
}

function displayColumns(columns: any[]) {
  if (!columns || columns.length === 0) {
    console.log('❌ No columns found');
    return;
  }

  console.log(`✅ Found ${columns.length} columns\n`);

  // VARCHAR(50)のフィールドを抽出
  const varchar50Fields = columns.filter((col: any) => 
    col.data_type === 'character varying' && col.character_maximum_length === 50
  );

  if (varchar50Fields.length > 0) {
    console.log(`⚠️  Found ${varchar50Fields.length} VARCHAR(50) fields:\n`);
    varchar50Fields.forEach((col: any) => {
      console.log(`   - ${col.column_name}`);
    });
  } else {
    console.log('✅ No VARCHAR(50) fields found');
  }

  // TEXTフィールドも表示
  const textFields = columns.filter((col: any) => col.data_type === 'text');
  console.log(`\n📝 TEXT fields: ${textFields.length}`);
  
  // その他のVARCHARフィールド
  const otherVarcharFields = columns.filter((col: any) => 
    col.data_type === 'character varying' && col.character_maximum_length !== 50
  );
  console.log(`📝 Other VARCHAR fields: ${otherVarcharFields.length}`);
}

checkBuyersVarcharFields().catch(console.error);
