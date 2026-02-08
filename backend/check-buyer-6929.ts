import { config } from 'dotenv';
import { resolve } from 'path';

// .envファイルを読み込み
config({ path: resolve(__dirname, '.env') });

import { createClient } from '@supabase/supabase-js';

async function checkBuyer6929() {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  console.log('🔍 Checking buyer 6929...\n');

  // 買主6929を取得（削除済みを含む）
  const { data, error } = await supabase
    .from('buyers')
    .select('buyer_number, name, deleted_at, updated_at')
    .eq('buyer_number', '6929')
    .single();

  if (error) {
    console.error('❌ Error:', error.message);
    return;
  }

  if (!data) {
    console.log('❌ Buyer 6929 not found in database');
    return;
  }

  console.log('✅ Buyer 6929 found:');
  console.log(JSON.stringify(data, null, 2));
  console.log('');

  if (data.deleted_at) {
    console.log('🗑️  Buyer 6929 is DELETED');
    console.log(`   Deleted at: ${data.deleted_at}`);
  } else {
    console.log('✅ Buyer 6929 is ACTIVE (not deleted)');
  }
}

checkBuyer6929()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
