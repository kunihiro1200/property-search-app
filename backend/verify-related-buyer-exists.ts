import { supabase } from './src/config/supabase';

async function verifyRelatedBuyerExists() {
  console.log('🔍 Verifying Related Buyer Exists\n');

  // Test with the buyer IDs from the diagnosis
  const buyerIds = [
    'f749d262-eed4-4d9a-bc3f-673a06053ca9', // 6448
    '83a82406-3931-4f74-90b7-8603ec6a9e5e', // 6462
    'd5c0d7a2-c095-4fb8-abc9-5babd66104df', // 6446
  ];

  for (const buyerId of buyerIds) {
    console.log(`\nTesting buyer ID: ${buyerId}`);
    
    // Try to fetch the buyer
    const { data: buyer, error } = await supabase
      .from('buyers')
      .select('*')
      .eq('id', buyerId)
      .single();

    if (error) {
      console.log(`❌ ERROR: ${error.message}`);
      continue;
    }

    if (!buyer) {
      console.log(`❌ Buyer not found`);
      continue;
    }

    console.log(`✅ Buyer found:`);
    console.log(`   Buyer Number: ${buyer.buyer_number}`);
    console.log(`   Name: ${buyer.name}`);
    console.log(`   Property: ${buyer.property_number}`);

    // Test if we can fetch inquiry history for this buyer
    try {
      const response = await fetch(`http://localhost:3000/api/buyers/${buyerId}/inquiry-history`);
      if (response.ok) {
        const data: any = await response.json();
        console.log(`   ✅ Inquiry history API works (${data.inquiryHistory?.length || 0} items)`);
      } else {
        console.log(`   ❌ Inquiry history API failed: ${response.status}`);
      }
    } catch (error) {
      console.log(`   ❌ Inquiry history API error:`, error);
    }

    // Test if we can fetch the buyer detail
    try {
      const response = await fetch(`http://localhost:3000/api/buyers/${buyerId}`);
      if (response.ok) {
        console.log(`   ✅ Buyer detail API works`);
      } else {
        console.log(`   ❌ Buyer detail API failed: ${response.status}`);
      }
    } catch (error) {
      console.log(`   ❌ Buyer detail API error:`, error);
    }
  }
}

verifyRelatedBuyerExists()
  .then(() => {
    console.log('\n✅ Verification complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Verification failed:', error);
    process.exit(1);
  });
