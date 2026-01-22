import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// .envファイルを読み込む
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function addHiddenImagesColumn() {
  console.log('=== Supabase REST API経由でhidden_imagesカラムを追加 ===\n');

  try {
    // SQLをRPC経由で実行
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: `
        DO $$ 
        BEGIN
          -- hidden_imagesカラムが存在しない場合のみ追加
          IF NOT EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'property_listings' 
            AND column_name = 'hidden_images'
          ) THEN
            ALTER TABLE public.property_listings 
            ADD COLUMN hidden_images TEXT[];
            
            RAISE NOTICE 'hidden_imagesカラムを追加しました';
          ELSE
            RAISE NOTICE 'hidden_imagesカラムは既に存在します';
          END IF;
        END $$;
      `
    });

    if (error) {
      console.error('❌ エラー:', error);
      return;
    }

    console.log('✅ 成功:', data);

    // 確認クエリ
    const { data: checkData, error: checkError } = await supabase
      .from('property_listings')
      .select('id, hidden_images')
      .limit(1);

    if (checkError) {
      console.error('❌ 確認エラー:', checkError);
    } else {
      console.log('✅ カラムが正常に追加されました');
      console.log('サンプルデータ:', checkData);
    }

  } catch (err) {
    console.error('❌ 予期しないエラー:', err);
  }
}

addHiddenImagesColumn();
