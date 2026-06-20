import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });
dotenv.config();

async function checkAA13501Complete() {
  console.log('🔍 Checking AA13501 complete data...\n');
  
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );
  
  // AA13501を検索（存在するカラムのみ）
  const { data: seller, error } = await supabase
    .from('sellers')
    .select(`
      seller_number,
      name,
      address,
      phone_number,
      email,
      unreachable_status,
      is_unreachable,
      property_address,
      comments,
      site,
      inquiry_site
    `)
    .eq('seller_number', 'AA13501')
    .single();
  
  if (error) {
    console.log('❌ Error:', error.message);
    return;
  }
  
  if (!seller) {
    console.log('❌ AA13501 not found');
    return;
  }
  
  console.log('✅ AA13501 found in database\n');
  console.log('📋 Database data:');
  console.log('  seller_number:', seller.seller_number);
  console.log('  name:', seller.name);
  console.log('  address:', seller.address);
  console.log('  phone_number:', seller.phone_number);
  console.log('  email:', seller.email);
  console.log('');
  console.log('  unreachable_status:', seller.unreachable_status);
  console.log('  is_unreachable:', seller.is_unreachable);
  console.log('');
  console.log('  property_address:', seller.property_address);
  console.log('');
  console.log('  comments:', seller.comments);
  console.log('  site:', seller.site);
  console.log('  inquiry_site:', seller.inquiry_site);
}

checkAA13501Complete().catch(console.error);
