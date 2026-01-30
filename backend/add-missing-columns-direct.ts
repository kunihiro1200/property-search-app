import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env.local') });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function addMissingColumns() {
  console.log('🔄 不足しているカラムを追加中...\n');

  const columns = [
    { name: 'property_type', type: 'VARCHAR(50)', comment: '物件種別（スプレッドシートの「種別」）' },
    { name: 'land_area', type: 'NUMERIC', comment: '土地面積（㎡）（スプレッドシートの「土（㎡）」）' },
    { name: 'building_area', type: 'NUMERIC', comment: '建物面積（㎡）（スプレッドシートの「建（㎡）」）' },
    { name: 'build_year', type: 'INTEGER', comment: '築年（スプレッドシートの「築年」）' },
    { name: 'structure', type: 'VARCHAR(100)', comment: '建物構造（スプレッドシートの「構造」）' },
    { name: 'floor_plan', type: 'VARCHAR(100)', comment: '間取り（スプレッドシートの「間取り」）' },
    { name: 'current_status', type: 'VARCHAR(50)', comment: '売主の状況（スプレッドシートの「状況（売主）」）' },
  ];

  for (const column of columns) {
    console.log(`📝 ${column.name}カラムを追加中...`);
    
    try {
      // カラムを追加（IF NOT EXISTSは使えないので、エラーを無視）
      const { error } = await supabase.rpc('exec_sql', {
        sql: `ALTER TABLE sellers ADD COLUMN ${column.name} ${column.type};`
      });

      if (error) {
        if (error.message.includes('already exists')) {
          console.log(`  ⚠️ ${column.name}は既に存在します`);
        } else {
          console.error(`  ❌ エラー: ${error.message}`);
        }
      } else {
        console.log(`  ✅ ${column.name}を追加しました`);
      }
    } catch (err: any) {
      if (err.message && err.message.includes('already exists')) {
        console.log(`  ⚠️ ${column.name}は既に存在します`);
      } else {
        console.error(`  ❌ エラー:`, err);
      }
    }
  }

  console.log('\n✅ カラム追加完了！');
  
  // 確認
  console.log('\n🔍 sellersテーブルのスキーマを確認中...');
  const { data, error } = await supabase
    .from('sellers')
    .select('*')
    .limit(1);

  if (error) {
    console.error('❌ エラー:', error);
    return;
  }

  if (data && data.length > 0) {
    const existingColumns = Object.keys(data[0]);
    console.log('\n📋 追加されたカラムの確認:');
    columns.forEach(column => {
      if (existingColumns.includes(column.name)) {
        console.log(`  ✅ ${column.name}`);
      } else {
        console.log(`  ❌ ${column.name} - まだ存在しません`);
      }
    });
  }
}

addMissingColumns().catch(console.error);
