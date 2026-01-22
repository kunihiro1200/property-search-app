import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkHiddenImagesColumn() {
  console.log('=== hidden_images カラム確認 ===\n');

  // Check if hidden_images column exists
  const { data, error } = await supabase
    .from('property_listings')
    .select('id, hidden_images')
    .limit(1);
  
  if (error) {
    console.log('❌ エラー:', error.message);
    console.log('\nhidden_images カラムが存在しません。');
    console.log('\n以下のSQLをSupabase Dashboardで実行してください:');
    console.log('https://supabase.com/dashboard/project/fzcuexscuwhoywcicdqq/sql\n');
    console.log(`
-- hidden_images カラムを追加
ALTER TABLE property_listings
ADD COLUMN IF NOT EXISTS hidden_images TEXT[] DEFAULT '{}';

-- コメント追加
COMMENT ON COLUMN property_listings.hidden_images IS 'Array of Google Drive file IDs that should be hidden from public display';
    `);
  } else {
    console.log('✅ hidden_images カラムは存在します');
    console.log('データ:', data);
  }
}

checkHiddenImagesColumn().catch(console.error);
