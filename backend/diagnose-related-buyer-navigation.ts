import { supabase } from './src/config/supabase';

async function diagnoseRelatedBuyerNavigation() {
  console.log('🔍 Diagnosing Related Buyer Navigation Issue\n');

  // Test with a known buyer (石井明子さん - 6447)
  const testBuyerId = 'f06ec30b-2c19-4f76-a771-ea10bdf40199';
  
  console.log(`Testing with buyer ID: ${testBuyerId}\n`);

  // 1. Check if the buyer exists
  const { data: buyer, error: buyerError } = await supabase
    .from('buyers')
    .select('*')
    .eq('id', testBuyerId)
    .single();

  if (buyerError) {
    console.error('❌ Error fetching buyer:', buyerError);
    return;
  }

  console.log('✅ Current buyer found:');
  console.log(`   ID: ${buyer.id}`);
  console.log(`   Buyer Number: ${buyer.buyer_number}`);
  console.log(`   Name: ${buyer.name}`);
  console.log(`   Phone: ${buyer.phone_number}`);
  console.log(`   Email: ${buyer.email}\n`);

  // 2. Find related buyers
  const conditions = [];
  
  if (buyer.phone_number) {
    conditions.push(`phone_number.eq.${buyer.phone_number}`);
  }
  
  if (buyer.email) {
    conditions.push(`email.eq.${buyer.email}`);
  }

  if (conditions.length === 0) {
    console.log('⚠️  No phone or email to search for related buyers');
    return;
  }

  const { data: relatedBuyers, error: relatedError } = await supabase
    .from('buyers')
    .select('*')
    .neq('id', buyer.id)
    .or(conditions.join(','))
    .order('reception_date', { ascending: false, nullsFirst: false });

  if (relatedError) {
    console.error('❌ Error fetching related buyers:', relatedError);
    return;
  }

  console.log(`✅ Found ${relatedBuyers?.length || 0} related buyers:\n`);

  if (relatedBuyers && relatedBuyers.length > 0) {
    for (const rb of relatedBuyers) {
      console.log(`   Related Buyer:`);
      console.log(`   - ID: ${rb.id}`);
      console.log(`   - Buyer Number: ${rb.buyer_number}`);
      console.log(`   - Name: ${rb.name}`);
      console.log(`   - Phone: ${rb.phone_number}`);
      console.log(`   - Email: ${rb.email}`);
      console.log(`   - Property: ${rb.property_number}`);
      console.log(`   - Reception Date: ${rb.reception_date}`);
      
      // Test if this buyer can be fetched by ID
      const { error: testError } = await supabase
        .from('buyers')
        .select('id, buyer_number, name')
        .eq('id', rb.id)
        .single();

      if (testError) {
        console.log(`   ❌ ERROR: Cannot fetch this buyer by ID!`);
        console.log(`      Error: ${testError.message}`);
      } else {
        console.log(`   ✅ Can be fetched by ID successfully`);
      }
      
      console.log('');
    }
  }

  // 3. Test the API endpoint
  console.log('\n🌐 Testing API endpoint...\n');
  
  try {
    const response = await fetch(`http://localhost:3000/api/buyers/${testBuyerId}/related`);
    const data: any = await response.json();
    
    if (response.ok) {
      console.log('✅ API endpoint works!');
      console.log(`   Total count: ${data.total_count}`);
      console.log(`   Related buyers returned: ${data.related_buyers?.length || 0}\n`);
      
      if (data.related_buyers && data.related_buyers.length > 0) {
        console.log('   Related buyer IDs from API:');
        data.related_buyers.forEach((rb: any, index: number) => {
          console.log(`   ${index + 1}. ID: ${rb.id}, Buyer#: ${rb.buyer_number}, Name: ${rb.name}`);
        });
      }
    } else {
      console.error('❌ API endpoint failed:', data);
    }
  } catch (error) {
    console.error('❌ Error calling API:', error);
  }
}

diagnoseRelatedBuyerNavigation()
  .then(() => {
    console.log('\n✅ Diagnosis complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Diagnosis failed:', error);
    process.exit(1);
  });
