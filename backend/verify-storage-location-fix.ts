import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function verifyFix() {
  console.log('=== AA13154 storage_location修正の検証 ===\n');

  // Check AA13154
  const { data: aa13154, error: error13154 } = await supabase
    .from('property_listings')
    .select('property_number, storage_location')
    .eq('property_number', 'AA13154')
    .single();

  if (error13154) {
    console.error('❌ AA13154の取得エラー:', error13154);
    return;
  }

  console.log('AA13154:');
  console.log(`  property_number: ${aa13154?.property_number}`);
  console.log(`  storage_location: ${aa13154?.storage_location || 'NULL'}`);
  
  const isValidUrl = aa13154?.storage_location?.startsWith('https://drive.google.com/');
  console.log(`  Status: ${isValidUrl ? '✅ 正しいURL' : '❌ URLではない'}\n`);

  // Summary
  if (isValidUrl) {
    console.log('✅ 修正完了！AA13154のstorage_locationが正しく設定されました。');
  } else {
    console.log('❌ 修正が必要です。storage_locationがまだ正しく設定されていません。');
  }
}

verifyFix();
