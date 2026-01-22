import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { decrypt } from './src/utils/encryption';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSeller() {
  console.log('🔍 Checking for seller AA12923...\n');

  // 売主番号で検索（大文字小文字を区別しない）
  const { data: sellers, error } = await supabase
    .from('sellers')
    .select('*')
    .ilike('seller_number', 'AA12923');

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  console.log(`Found ${sellers?.length || 0} sellers with number AA12923\n`);

  if (sellers && sellers.length > 0) {
    for (const seller of sellers) {
      console.log('📋 Seller details:');
      console.log('  ID:', seller.id);
      console.log('  Seller Number:', seller.seller_number);
      console.log('  Name (encrypted):', seller.name?.substring(0, 50) + '...');
      console.log('  Phone (encrypted):', seller.phone_number);
      console.log('  Address (encrypted):', seller.address?.substring(0, 50) + '...');
      console.log('  Created:', seller.created_at);
      console.log('  Status:', seller.status);
      console.log('  Inquiry Source:', seller.inquiry_source);
      console.log('  Inquiry Year:', seller.inquiry_year);
      console.log('  Inquiry Date:', seller.inquiry_date);
      
      try {
        if (seller.name) {
          const decryptedName = decrypt(seller.name);
          console.log('  Name (decrypted):', decryptedName);
        }
        if (seller.phone_number) {
          const decryptedPhone = decrypt(seller.phone_number);
          console.log('  Phone (decrypted):', decryptedPhone);
        }
        if (seller.address) {
          const decryptedAddress = decrypt(seller.address);
          console.log('  Address (decrypted):', decryptedAddress);
        }
      } catch (e: any) {
        console.log('  ⚠️ Could not decrypt:', e.message);
      }
      console.log('');
    }
  } else {
    console.log('❌ No seller found with number AA12923');
    
    // 全売主番号を確認（最新10件）
    console.log('\n🔍 Checking recent seller numbers...');
    const { data: allSellers, error: allError } = await supabase
      .from('sellers')
      .select('id, seller_number, created_at')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (allError) {
      console.error('❌ Error:', allError);
      return;
    }
    
    console.log(`\nRecent sellers:`);
    allSellers?.forEach(s => {
      console.log(`  ${s.seller_number} (ID: ${s.id}, Created: ${s.created_at})`);
    });
  }
}

checkSeller().catch(console.error);
