// buyer_numberにユニーク制約を直接追加
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

async function addUniqueConstraint() {
  console.log('=== buyer_numberにユニーク制約を追加 ===\n');

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    // 制約が既に存在するか確認
    const { data: existingConstraints, error: checkError } = await supabase
      .from('information_schema.table_constraints')
      .select('constraint_name')
      .eq('table_name', 'buyers')
      .eq('constraint_name', 'buyers_buyer_number_unique')
      .single();

    if (!checkError && existingConstraints) {
      console.log('✅ ユニーク制約は既に存在します');
      return;
    }

    console.log('ユニーク制約を追加中...\n');

    // ALTER TABLE文を実行
    const sql = `
      ALTER TABLE buyers
      ADD CONSTRAINT buyers_buyer_number_unique UNIQUE (buyer_number);
    `;

    // Supabase REST APIでは直接DDLを実行できないため、
    // pg-promise または psql を使用する必要があります
    
    console.log('以下のSQLをSupabase SQL Editorで実行してください:\n');
    console.log('----------------------------------------');
    console.log(sql);
    console.log('----------------------------------------\n');

    console.log('または、以下のコマンドでpsqlを使用して実行できます:');
    console.log(`psql "${process.env.DATABASE_URL}" -c "${sql.replace(/\n/g, ' ')}"`);

  } catch (error: any) {
    console.error('❌ エラーが発生しました:', error.message);
  }
}

addUniqueConstraint();
