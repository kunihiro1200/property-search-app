import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function diagnoseCC105() {
  console.log('🔍 Diagnosing CC105 current state...\n');

  // 1. データベースから現在の状態を取得
  console.log('📊 Step 1: Check current database state');
  const { data: dbData, error: dbError } = await supabase
    .from('property_listings')
    .select('*')
    .eq('property_number', 'CC105')
    .single();

  if (dbError) {
    console.error('❌ Database error:', dbError);
    return;
  }

  console.log('Current database state:');
  console.log('  property_number:', dbData.property_number);
  console.log('  atbb_status:', dbData.atbb_status);
  console.log('  sales_price:', dbData.sales_price);
  console.log('  listing_price:', dbData.listing_price);
  console.log('  property_type:', dbData.property_type);
  console.log('  address:', dbData.address);

  // 2. atbb_statusの判定
  console.log('\n🎯 Step 2: Check atbb_status classification');
  const atbbStatus = dbData.atbb_status || '';
  
  const isPublic = atbbStatus.includes('公開中') || 
                   atbbStatus.includes('公開前') || 
                   atbbStatus.includes('非公開（配信メールのみ）');
  
  console.log('  atbb_status:', atbbStatus);
  console.log('  Is public?:', isPublic ? '✅ YES' : '❌ NO');
  
  if (isPublic) {
    if (atbbStatus.includes('公開前')) {
      console.log('  Expected badge: 「公開前」');
    } else if (atbbStatus.includes('非公開（配信メールのみ）')) {
      console.log('  Expected badge: 「配信限定」');
    } else {
      console.log('  Expected badge: なし（公開中）');
    }
  } else {
    console.log('  Expected badge: 「成約済み」');
  }

  // 3. 価格の計算
  console.log('\n💰 Step 3: Check price calculation');
  const price = dbData.sales_price || dbData.listing_price || 0;
  console.log('  sales_price:', dbData.sales_price?.toLocaleString('ja-JP') || 'null');
  console.log('  listing_price:', dbData.listing_price?.toLocaleString('ja-JP') || 'null');
  console.log('  Calculated price:', price.toLocaleString('ja-JP'), '円');
  console.log('  Expected display:', price > 0 ? `${(price / 10000).toFixed(0)}万円` : '価格応談');

  // 4. クリック可能かどうか
  console.log('\n🖱️ Step 4: Check if clickable');
  const isClickable = atbbStatus.includes('公開中') || 
                      atbbStatus.includes('公開前') || 
                      atbbStatus.includes('非公開（配信メールのみ）');
  console.log('  Is clickable?:', isClickable ? '✅ YES' : '❌ NO');

  // 5. 問題の診断
  console.log('\n🔧 Step 5: Diagnosis');
  if (!isPublic) {
    console.log('  ⚠️ PROBLEM: atbb_status is not public!');
    console.log('  ⚠️ This will show "成約済み" badge and property will not be clickable');
    console.log('  ⚠️ Need to fix atbb_status in database');
  } else if (price === 0) {
    console.log('  ⚠️ PROBLEM: price is 0!');
    console.log('  ⚠️ This will show "価格応談"');
    console.log('  ⚠️ Need to fix sales_price or listing_price in database');
  } else {
    console.log('  ✅ Everything looks good!');
    console.log('  ✅ Should display:', `${(price / 10000).toFixed(0)}万円`);
    console.log('  ✅ Badge:', atbbStatus.includes('公開前') ? '「公開前」' : 'なし');
  }

  console.log('\n✨ Diagnosis completed!');
}

diagnoseCC105().catch(console.error);
