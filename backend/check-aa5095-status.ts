import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// backend/.envファイルを読み込む
dotenv.config({ path: path.resolve(__dirname, '.env') });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function checkAA5095Status() {
  console.log('🔍 Checking AA5095 status...\n');

  // property_listingsテーブルから取得
  const { data: property, error } = await supabase
    .from('property_listings')
    .select('property_number, atbb_status, storage_location')
    .eq('property_number', 'AA5095')
    .single();

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  if (!property) {
    console.log('❌ AA5095 not found in database');
    return;
  }

  console.log('📋 AA5095 Property Data:');
  console.log('  Property Number:', property.property_number);
  console.log('  atbb_status:', property.atbb_status);
  console.log('  storage_location:', property.storage_location);
  console.log('');

  // 公開中かどうかを判定
  const isPublic = property.atbb_status?.includes('公開中') ||
                   property.atbb_status?.includes('公開前') ||
                   property.atbb_status?.includes('非公開（配信メールのみ）');

  console.log('✅ Is Public?', isPublic);
  console.log('');

  if (!isPublic) {
    console.log('⚠️ AA5095 is NOT public (not 公開中/公開前/非公開（配信メールのみ）)');
    console.log('   → This property was NOT included in the sync');
  } else {
    console.log('✅ AA5095 is public');
    if (!property.storage_location) {
      console.log('⚠️ storage_location is NULL → Should have been synced');
    } else {
      console.log('✅ storage_location is set:', property.storage_location);
    }
  }
}

checkAA5095Status().catch(console.error);
