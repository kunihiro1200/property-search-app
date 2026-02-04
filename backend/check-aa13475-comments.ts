import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function checkAA13475() {
  console.log('=== AA13475 コメント同期状況確認 ===\n');
  
  // 1. データベースの状態を確認
  const { data: seller, error: sellerError } = await supabase
    .from('sellers')
    .select('seller_number, name, comments')
    .eq('seller_number', 'AA13475')
    .single();
  
  if (sellerError) {
    console.error('❌ データベースエラー:', sellerError);
    return;
  }
  
  console.log('📊 データベースの状態:');
  console.log('売主番号:', seller.seller_number);
  console.log('名前:', seller.name);
  console.log('コメント:', seller.comments || '(空)');
  console.log('コメント長:', seller.comments?.length || 0);
  console.log('');
  
  // 2. property_detailsの状態を確認
  const { data: details, error: detailsError } = await supabase
    .from('property_details')
    .select('property_number, favorite_comment, recommended_comment')
    .eq('property_number', 'AA13475')
    .single();
  
  if (detailsError) {
    console.log('⚠️ property_detailsにデータなし:', detailsError.message);
  } else {
    console.log('📋 property_detailsの状態:');
    console.log('物件番号:', details.property_number);
    console.log('お気に入りコメント:', details.favorite_comment || '(空)');
    console.log('おすすめコメント:', details.recommended_comment || '(空)');
    console.log('');
  }
  
  // 3. property_listingsの状態を確認（スプレッドシートURL）
  const { data: listing, error: listingError } = await supabase
    .from('property_listings')
    .select('property_number, spreadsheet_url')
    .eq('property_number', 'AA13475')
    .single();
  
  if (listingError) {
    console.log('⚠️ property_listingsにデータなし:', listingError.message);
    console.log('');
    console.log('🔍 原因: property_listingsテーブルに物件が登録されていない');
    console.log('→ コメント同期の対象外（Phase 4.7の条件を満たさない）');
  } else {
    console.log('📁 property_listingsの状態:');
    console.log('物件番号:', listing.property_number);
    console.log('スプレッドシートURL:', listing.spreadsheet_url || '(空)');
    console.log('');
    
    if (!listing.spreadsheet_url) {
      console.log('🔍 原因: スプレッドシートURLが空');
      console.log('→ コメント同期の対象外（Phase 4.7の条件を満たさない）');
    } else {
      console.log('✅ スプレッドシートURLあり → コメント同期の対象');
      console.log('');
      console.log('🔍 次のステップ:');
      console.log('1. 個別物件スプレッドシートのathomeシートを確認');
      console.log('2. 手動同期を実行: npx ts-node backend/sync-aa13475-comments.ts');
    }
  }
}

checkAA13475().catch(console.error);
