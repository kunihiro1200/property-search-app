import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { decrypt, encrypt } from './src/utils/encryption';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixDoubleEncryption() {
  console.log('🔍 Checking AA12923 for double encryption...\n');

  const { data: sellers, error } = await supabase
    .from('sellers')
    .select('*')
    .eq('seller_number', 'AA12923');

  if (error || !sellers || sellers.length === 0) {
    console.error('❌ Error or no seller found:', error);
    return;
  }

  const seller = sellers[0];
  console.log('📋 Current data:');
  console.log('  ID:', seller.id);
  console.log('  Seller Number:', seller.seller_number);
  console.log('  Name (encrypted):', seller.name?.substring(0, 50) + '...');
  
  try {
    // 一度復号化
    const firstDecrypt = decrypt(seller.name);
    console.log('\n🔓 First decrypt:', firstDecrypt.substring(0, 50) + '...');
    
    // もう一度復号化を試みる
    try {
      const secondDecrypt = decrypt(firstDecrypt);
      console.log('🔓 Second decrypt:', secondDecrypt.substring(0, 50) + '...');
      
      // 三度目の復号化を試みる
      try {
        const thirdDecrypt = decrypt(secondDecrypt);
        console.log('🔓 Third decrypt (actual name):', thirdDecrypt);
        
        console.log('\n✅ This is triple-encrypted data!');
        console.log('💾 The actual name is:', thirdDecrypt);
        
        // 正しく一度だけ暗号化し直す
        const correctlyEncrypted = encrypt(thirdDecrypt);
        
        console.log('\n🔄 Updating database with correctly encrypted data...');
        const { error: updateError } = await supabase
          .from('sellers')
          .update({ name: correctlyEncrypted })
          .eq('id', seller.id);
        
        if (updateError) {
          console.error('❌ Update error:', updateError);
        } else {
          console.log('✅ Successfully fixed triple encryption!');
          console.log('🎉 AA12923 should now be searchable!');
        }
      } catch (e) {
        console.log('❌ Third decrypt failed - only double encrypted');
        console.log('💾 The actual name is:', secondDecrypt);
        
        // 正しく一度だけ暗号化し直す
        const correctlyEncrypted = encrypt(secondDecrypt);
        
        console.log('\n🔄 Updating database with correctly encrypted data...');
        const { error: updateError } = await supabase
          .from('sellers')
          .update({ name: correctlyEncrypted })
          .eq('id', seller.id);
        
        if (updateError) {
          console.error('❌ Update error:', updateError);
        } else {
          console.log('✅ Successfully fixed double encryption!');
          console.log('🎉 AA12923 should now be searchable!');
        }
      }
    } catch (e) {
      console.log('❌ Second decrypt failed - not double encrypted');
      console.log('   First decrypt result:', firstDecrypt);
    }
  } catch (e: any) {
    console.error('❌ First decrypt failed:', e.message);
  }
}

fixDoubleEncryption().catch(console.error);
