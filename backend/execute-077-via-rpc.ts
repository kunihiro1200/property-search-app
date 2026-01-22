/**
 * マイグレーション077をRPC経由で実行
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ SUPABASE_URLまたはSUPABASE_SERVICE_ROLE_KEYが設定されていません');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function executeMigration() {
  console.log('=== マイグレーション077: hidden_imagesカラム追加 ===\n');

  try {
    // 1. カラムが既に存在するか確認
    console.log('1. 現在のカラム状態を確認中...');
    const { data: testData, error: testError } = await supabase
      .from('property_listings')
      .select('id, property_number, hidden_images')
      .limit(1);

    if (testError) {
      if (testError.message.includes('column') && testError.message.includes('does not exist')) {
        console.log('hidden_imagesカラムが存在しません。追加が必要です。\n');
      } else {
        console.error('❌ エラー:', testError.message);
        throw testError;
      }
    } else {
      console.log('✅ hidden_imagesカラムは既に存在します');
      console.log('サンプルデータ:', testData);
      return;
    }

    // 2. SQLを実行（RPCを使用）
    console.log('2. マイグレーションSQLを実行中...\n');
    
    const migrationSQL = `
-- hidden_imagesカラムを追加
ALTER TABLE property_listings 
ADD COLUMN IF NOT EXISTS hidden_images TEXT[] DEFAULT '{}';

-- コメントを追加
COMMENT ON COLUMN property_listings.hidden_images IS '非表示にした画像のファイルIDリスト';

-- インデックスを追加（配列検索用）
CREATE INDEX IF NOT EXISTS idx_property_listings_hidden_images 
ON property_listings USING GIN (hidden_images);

-- PostgRESTスキーマキャッシュをリロード
NOTIFY pgrst, 'reload schema';
    `.trim();

    console.log('実行するSQL:');
    console.log('---');
    console.log(migrationSQL);
    console.log('---\n');

    // Supabase SQL Editorで実行する必要があることを通知
    console.log('⚠️  Supabase REST APIではDDL文を直接実行できません。');
    console.log('以下の手順で手動実行してください:\n');
    console.log('1. Supabase Dashboard (https://supabase.com/dashboard) にアクセス');
    console.log('2. プロジェクトを選択');
    console.log('3. 左メニューから "SQL Editor" を選択');
    console.log('4. "New query" をクリック');
    console.log('5. 上記のSQLをコピー&ペースト');
    console.log('6. "Run" をクリックして実行\n');
    
    console.log('実行後、以下のコマンドで確認してください:');
    console.log('npx ts-node check-hidden-images-data.ts\n');

  } catch (error: any) {
    console.error('❌ エラーが発生しました:', error.message);
    process.exit(1);
  }
}

executeMigration().catch(console.error);
