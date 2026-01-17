import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkPropertyTypeConstraint() {
  console.log('🔍 property_typeカラムの制約を確認します\n');

  // PostgreSQLのチェック制約を確認
  const { data, error } = await supabase.rpc('exec_sql', {
    sql: `
      SELECT 
        conname AS constraint_name,
        pg_get_constraintdef(oid) AS constraint_definition
      FROM pg_constraint
      WHERE conrelid = 'properties'::regclass
        AND conname LIKE '%property_type%';
    `
  });

  if (error) {
    console.log('⚠️  RPCが使えないため、直接確認できません');
    console.log('Supabase SQL Editorで以下のクエリを実行してください:\n');
    console.log(`
SELECT 
  conname AS constraint_name,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'properties'::regclass
  AND conname LIKE '%property_type%';
    `);
    return;
  }

  console.log('✅ 制約情報:', JSON.stringify(data, null, 2));
}

checkPropertyTypeConstraint()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ エラー:', error);
    process.exit(1);
  });
