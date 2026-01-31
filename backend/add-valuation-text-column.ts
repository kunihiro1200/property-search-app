/**
 * sellersテーブルにvaluation_textカラムを追加
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '.env') });

async function addColumn() {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  // カラムが存在するか確認
  const { data, error } = await supabase
    .from('sellers')
    .select('valuation_text')
    .limit(1);

  if (error) {
    if (error.message.includes('does not exist')) {
      console.log('❌ valuation_textカラムが存在しません');
      console.log('');
      console.log('Supabase Dashboardで以下のSQLを実行してください:');
      console.log('');
      console.log('ALTER TABLE sellers ADD COLUMN IF NOT EXISTS valuation_text TEXT;');
    } else {
      console.log('エラー:', error.message);
    }
  } else {
    console.log('✅ valuation_textカラムは既に存在します');
  }
}

addColumn().catch(console.error);
