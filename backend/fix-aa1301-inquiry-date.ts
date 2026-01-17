/**
 * AA1301の反響日付を修正
 * 2026/2/28 → 2022/2/28
 */
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

async function fixAA1301InquiryDate() {
  console.log('🔧 Fixing AA1301 inquiry date...\n');

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  // 現在の値を確認
  console.log('📊 Current value:');
  const { data: before, error: beforeError } = await supabase
    .from('sellers')
    .select('seller_number, inquiry_date, inquiry_year')
    .eq('seller_number', 'AA1301')
    .single();

  if (beforeError) {
    console.error('❌ Error:', beforeError.message);
    process.exit(1);
  }

  console.log('  Seller Number:', before.seller_number);
  console.log('  Inquiry Date:', before.inquiry_date);
  console.log('  Inquiry Year:', before.inquiry_year);

  // 修正
  console.log('\n🔄 Updating...');
  const { error: updateError } = await supabase
    .from('sellers')
    .update({
      inquiry_date: '2022-02-28',
      inquiry_year: '2022',
    })
    .eq('seller_number', 'AA1301');

  if (updateError) {
    console.error('❌ Update Error:', updateError.message);
    process.exit(1);
  }

  // 修正後の値を確認
  console.log('\n✅ Updated value:');
  const { data: after, error: afterError } = await supabase
    .from('sellers')
    .select('seller_number, inquiry_date, inquiry_year')
    .eq('seller_number', 'AA1301')
    .single();

  if (afterError) {
    console.error('❌ Error:', afterError.message);
    process.exit(1);
  }

  console.log('  Seller Number:', after.seller_number);
  console.log('  Inquiry Date:', after.inquiry_date);
  console.log('  Inquiry Year:', after.inquiry_year);

  console.log('\n🎉 Fix complete!');
  process.exit(0);
}

fixAA1301InquiryDate().catch(console.error);
