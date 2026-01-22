/**
 * マイグレーション077: property_listingsテーブルにhidden_imagesカラムを追加
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  console.log('=== マイグレーション077: hidden_imagesカラム追加 ===\n');
  
  try {
    // 1. カラムが既に存在するか確認
    console.log('1. 現在のカラム状態を確認...');
    const { data: sample, error: sampleError } = await supabase
      .from('property_listings')
      .select('*')
      .limit(1)
      .single();
    
    if (sampleError && sampleError.code !== 'PGRST116') {
      console.log('サンプルデータ取得エラー:', sampleError.message);
    }
    
    if (sample && 'hidden_images' in sample) {
      console.log('✅ hidden_imagesカラムは既に存在します');
      return;
    }
    
    console.log('hidden_imagesカラムが存在しません。追加が必要です。');
    
    // 2. Supabase REST APIではALTER TABLEを直接実行できないため、
    //    SQLエディタで実行する必要があることを通知
    console.log('\n=== 手動実行が必要 ===');
    console.log('以下のSQLをSupabaseのSQLエディタで実行してください:\n');
    console.log(`
-- hidden_imagesカラムを追加
ALTER TABLE property_listings 
ADD COLUMN IF NOT EXISTS hidden_images TEXT[] DEFAULT '{}';

-- コメントを追加
COMMENT ON COLUMN property_listings.hidden_images IS '非表示にした画像のファイルIDリスト';

-- インデックスを追加（配列検索用）
CREATE INDEX IF NOT EXISTS idx_property_listings_hidden_images 
ON property_listings USING GIN (hidden_images);
    `);
    
    console.log('\n実行後、このスクリプトを再度実行して確認してください。');
    
  } catch (error: any) {
    console.error('エラー:', error.message);
  }
}

runMigration().catch(console.error);
