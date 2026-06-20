import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// backend/.envファイルを読み込む
dotenv.config({ path: path.resolve(__dirname, '.env') });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function investigateBB16() {
  console.log('🔍 BB16物件の同期状況を調査中...\n');
  
  // 1. property_listingsテーブルの情報
  console.log('=== 1. property_listingsテーブル ===');
  const { data: listing, error: listingError } = await supabase
    .from('property_listings')
    .select('*')
    .eq('property_number', 'BB16')
    .single();
  
  if (listingError) {
    console.error('❌ エラー:', listingError);
  } else if (listing) {
    console.log('✅ 物件が見つかりました:');
    console.log(`  物件番号: ${listing.property_number}`);
    console.log(`  ID: ${listing.id}`);
    console.log(`  格納先: ${listing.storage_location || '未設定'}`);
    console.log(`  サイト表示: ${listing.site_display || '未設定'}`);
    console.log(`  作成日: ${listing.created_at}`);
    console.log(`  更新日: ${listing.updated_at}`);
    console.log(`  最終同期日: ${listing.last_synced_at || '未同期'}`);
  }
  
  console.log('\n=== 2. 他のBB物件の状況（比較用） ===');
  const { data: otherBB, error: otherError } = await supabase
    .from('property_listings')
    .select('property_number, storage_location, site_display')
    .ilike('property_number', 'BB%')
    .order('property_number')
    .limit(10);
  
  if (otherError) {
    console.error('❌ エラー:', otherError);
  } else if (otherBB && otherBB.length > 0) {
    console.log(`✅ ${otherBB.length}件のBB物件が見つかりました:`);
    otherBB.forEach((prop: any) => {
      const hasStorage = prop.storage_location ? '✅' : '❌';
      console.log(`  ${hasStorage} ${prop.property_number}: ${prop.storage_location || '未設定'}`);
    });
  }
  
  console.log('\n=== 3. Google Driveでフォルダを検索 ===');
  console.log('物件番号「BB16」でフォルダを検索します...');
  
  // Google Drive検索は別途実行
}

investigateBB16().catch(console.error);
