/**
 * AA13527の is_hidden 状態を確認・修正するスクリプト
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function main() {
  console.log('=== AA13527 診断スクリプト ===\n');

  // 1. is_hidden カラムが存在するか確認
  console.log('1. is_hidden カラムの存在確認...');
  const { data: columnCheck, error: columnError } = await supabase
    .from('property_listings')
    .select('property_number, is_hidden')
    .eq('property_number', 'AA13527')
    .single();

  if (columnError) {
    if (columnError.message.includes('is_hidden')) {
      console.error('❌ is_hidden カラムが存在しません！マイグレーションが未適用です。');
      console.log('\n→ Supabase ダッシュボードで以下のSQLを実行してください:');
      console.log(`
ALTER TABLE property_listings
  ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_property_listings_is_hidden
  ON property_listings (is_hidden);
      `);
      return;
    }
    console.error('❌ クエリエラー:', columnError.message);
    return;
  }

  if (!columnCheck) {
    console.log('⚠️  AA13527 がDBに存在しません');
    return;
  }

  console.log(`✅ is_hidden カラム存在確認OK`);
  console.log(`   AA13527.is_hidden = ${columnCheck.is_hidden}`);

  // 2. is_hidden が false の場合、手動で true に設定
  if (!columnCheck.is_hidden) {
    console.log('\n2. AA13527 を is_hidden = true に設定...');
    const { error: updateError } = await supabase
      .from('property_listings')
      .update({ is_hidden: true })
      .eq('property_number', 'AA13527');

    if (updateError) {
      console.error('❌ 更新失敗:', updateError.message);
    } else {
      console.log('✅ AA13527 を is_hidden = true に設定しました');
    }
  } else {
    console.log('\n2. AA13527 は既に is_hidden = true です');
  }

  // 3. 確認
  const { data: verify } = await supabase
    .from('property_listings')
    .select('property_number, is_hidden')
    .eq('property_number', 'AA13527')
    .single();

  console.log(`\n=== 最終状態 ===`);
  console.log(`AA13527.is_hidden = ${verify?.is_hidden}`);
  
  if (verify?.is_hidden) {
    console.log('✅ 次のVercelデプロイ後、公開サイトからAA13527が消えます');
  }
}

main().catch(console.error);
