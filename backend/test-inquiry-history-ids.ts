import { supabase } from './src/config/supabase';

async function testInquiryHistoryIds() {
  console.log('🔍 Testing Inquiry History IDs\n');

  const testBuyerId = 'f06ec30b-2c19-4f76-a771-ea10bdf40199';
  
  // Fetch buyer
  const { data: buyer, error: buyerError } = await supabase
    .from('buyers')
    .select('*')
    .eq('id', testBuyerId)
    .single();

  if (buyerError || !buyer) {
    console.error('❌ Buyer not found');
    return;
  }

  console.log(`✅ Buyer: ${buyer.buyer_number} - ${buyer.name}`);
  console.log(`   Property Number: ${buyer.property_number}\n`);

  // Fetch property listings
  if (buyer.property_number) {
    const propertyNumbers = buyer.property_number
      .split(',')
      .map((n: string) => n.trim())
      .filter((n: string) => n);

    console.log(`📋 Property Numbers: ${propertyNumbers.join(', ')}\n`);

    const { data: properties, error: propError } = await supabase
      .from('property_listings')
      .select('id, property_number, address')
      .in('property_number', propertyNumbers);

    if (propError) {
      console.error('❌ Error fetching properties:', propError);
      return;
    }

    if (properties && properties.length > 0) {
      console.log(`✅ Found ${properties.length} properties:\n`);
      properties.forEach((prop, index) => {
        console.log(`${index + 1}. Property Number: ${prop.property_number}`);
        console.log(`   ID: ${prop.id}`);
        console.log(`   ID Length: ${prop.id.length} characters`);
        console.log(`   Address: ${prop.address}`);
        console.log('');
      });
    } else {
      console.log('⚠️  No properties found');
    }
  }

  // Test the API endpoint
  console.log('\n🌐 Testing API endpoint...\n');
  
  try {
    const response = await fetch(`http://localhost:3000/api/buyers/${testBuyerId}/inquiry-history`);
    const data: any = await response.json();
    
    if (response.ok && data.inquiryHistory) {
      console.log(`✅ API returned ${data.inquiryHistory.length} inquiry history items:\n`);
      data.inquiryHistory.forEach((item: any, index: number) => {
        console.log(`${index + 1}. Property: ${item.propertyNumber}`);
        console.log(`   propertyListingId: ${item.propertyListingId}`);
        console.log(`   propertyListingId Length: ${item.propertyListingId?.length || 0} characters`);
        console.log(`   Status: ${item.status}`);
        console.log('');
      });
    } else {
      console.error('❌ API failed:', data);
    }
  } catch (error) {
    console.error('❌ Error calling API:', error);
  }
}

testInquiryHistoryIds()
  .then(() => {
    console.log('\n✅ Test complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  });
