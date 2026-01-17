/**
 * マイグレーション077をSupabase RPC経由で実行
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function runMigration() {
  console.log('=== マイグレーション077: hidden_imagesカラム追加 ===\n');

  try {
    // まず現在の状態を確認
    console.log('1. 現在のカラム状態を確認中...');

    // hidden_imagesカラムを含めて取得してみる
    const { data: checkData, error: checkError } = await supabase
      .from('property_listings')
      .select('id, hidden_images')
      .limit(1)
      .single();

    if (!checkError) {
      console.log('✅ hidden_imagesカラムは既に存在します');
      console.log('   サンプルデータ:', checkData);
      return;
    }

    if (checkError.code === '42703') {
      console.log('⚠️  hidden_imagesカラムが存在しません\n');
      console.log('=== 手動実行が必要です ===\n');
      console.log('Supabaseダッシュボードで以下の手順を実行してください:\n');
      console.log('1. https://supabase.com/dashboard/project/fzcuexscuwhoywcicdqq/sql/new にアクセス');
      console.log('2. 以下のSQLを貼り付けて実行:\n');
      console.log('```sql');
      console.log('-- hidden_imagesカラムを追加');
      console.log("ALTER TABLE property_listings ADD COLUMN IF NOT EXISTS hidden_images TEXT[] DEFAULT '{}';");
      console.log('');
      console.log('-- コメントを追加');
      console.log("COMMENT ON COLUMN property_listings.hidden_images IS '非表示にした画像のファイルIDリスト';");
      console.log('');
      console.log('-- インデックスを追加（配列検索用）');
      console.log('CREATE INDEX IF NOT EXISTS idx_property_listings_hidden_images ON property_listings USING GIN (hidden_images);');
      console.log('```\n');
      console.log('3. 実行後、このスクリプトを再度実行して確認してください');
    } else {
      console.error('❌ 予期しないエラー:', checkError);
    }

  } catch (error: any) {
    console.error('❌ エラーが発生しました:', error.message);
  }
}

runMigration().catch(console.error);
