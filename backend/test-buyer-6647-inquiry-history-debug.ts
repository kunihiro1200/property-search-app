import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function testInquiryHistory() {
  console.log('=== Testing Buyer 6647 Inquiry History (FIXED) ===\n');

  const buyerId = 'c37a9fd1-f123-4833-80c5-18c65ff6a3f0';

  try {
    // Step 1: Get buyer data
    console.log('Step 1: Fetching buyer data...');
    const { data: buyer, error: buyerError } = await supabase
      .from('buyers')
      .select('*')
      .eq('id', buyerId)
      .single();

    if (buyerError) {
      console.error('Error fetching buyer:', buyerError);
      return;
    }

    console.log('Buyer found:');
    console.log('- Buyer Number:', buyer.buyer_number);
    console.log('- Name:', buyer.name);
    console.log('- Property Number:', buyer.property_number);
    console.log('- Reception Date:', buyer.reception_date);
    console.log('- Past Buyer List:', buyer.past_buyer_list);
    console.log('');

    // Step 2: Parse property numbers
    console.log('Step 2: Parsing property numbers...');
    const allPropertyNumbers: string[] = [];
    const propertyToBuyerMap = new Map<string, { 
      buyerNumber: string; 
      status: 'current' | 'past';
      inquiryDate: string;
    }>();
    
    if (buyer.property_number) {
      const currentPropertyNumbers = buyer.property_number
        .split(',')
        .map((n: string) => n.trim())
        .filter((n: string) => n);
      console.log('Current property numbers:', currentPropertyNumbers);
      
      currentPropertyNumbers.forEach((propNum: string) => {
        allPropertyNumbers.push(propNum);
        propertyToBuyerMap.set(propNum, {
          buyerNumber: buyer.buyer_number,
          status: 'current',
          inquiryDate: buyer.reception_date || ''
        });
      });
    }

    // Step 3: Get past buyer numbers
    console.log('\nStep 3: Getting past buyer numbers...');
    const pastBuyerNumbers = buyer.past_buyer_list
      ? buyer.past_buyer_list.split(',').map((n: string) => n.trim()).filter((n: string) => n)
      : [];
    console.log('Past buyer numbers:', pastBuyerNumbers);

    // Step 4: Get property numbers from past buyers
    if (pastBuyerNumbers.length > 0) {
      console.log('\nStep 4: Fetching property numbers from past buyers...');
      for (const pastBuyerNumber of pastBuyerNumbers) {
        const { data: pastBuyer, error: pastBuyerError } = await supabase
          .from('buyers')
          .select('buyer_number, property_number, reception_date')
          .eq('buyer_number', pastBuyerNumber)
          .single();

        if (pastBuyerError) {
          console.log(`  - Past buyer ${pastBuyerNumber}: NOT FOUND`);
          continue;
        }

        console.log(`  - Past buyer ${pastBuyerNumber}:`);
        console.log(`    Property numbers: ${pastBuyer.property_number}`);
        console.log(`    Reception date: ${pastBuyer.reception_date}`);

        if (pastBuyer.property_number) {
          const pastPropertyNumbers = pastBuyer.property_number
            .split(',')
            .map((n: string) => n.trim())
            .filter((n: string) => n);
          
          pastPropertyNumbers.forEach((propNum: string) => {
            allPropertyNumbers.push(propNum);
            propertyToBuyerMap.set(propNum, {
              buyerNumber: pastBuyer.buyer_number,
              status: 'past',
              inquiryDate: pastBuyer.reception_date || ''
            });
          });
        }
      }
    }

    // Step 5: Remove duplicates
    const uniquePropertyNumbers = Array.from(new Set(allPropertyNumbers));
    console.log('\nStep 5: Unique property numbers:', uniquePropertyNumbers);

    if (uniquePropertyNumbers.length === 0) {
      console.log('\nNo property numbers found!');
      return;
    }

    // Step 6: Fetch property listings (WITHOUT reception_date)
    console.log('\nStep 6: Fetching property listings...');
    const { data: properties, error: propertiesError } = await supabase
      .from('property_listings')
      .select(`
        id,
        property_number,
        address
      `)
      .in('property_number', uniquePropertyNumbers);

    if (propertiesError) {
      console.error('Error fetching properties:', propertiesError);
      return;
    }

    console.log(`Found ${properties?.length || 0} properties:`);
    properties?.forEach(prop => {
      console.log(`  - ${prop.property_number}: ${prop.address}`);
    });

    // Step 7: Build inquiry history
    console.log('\nStep 7: Building inquiry history...');
    const history = properties?.map(property => {
      const buyerInfo = propertyToBuyerMap.get(property.property_number);
      return {
        buyerNumber: buyerInfo?.buyerNumber || buyer.buyer_number,
        propertyNumber: property.property_number,
        propertyAddress: property.address || '',
        inquiryDate: buyerInfo?.inquiryDate || '',
        status: buyerInfo?.status || 'current',
        propertyId: property.id,
        propertyListingId: property.id,
      };
    }) || [];

    // Sort by inquiry date
    history.sort((a, b) => {
      if (!a.inquiryDate) return 1;
      if (!b.inquiryDate) return -1;
      return new Date(b.inquiryDate).getTime() - new Date(a.inquiryDate).getTime();
    });

    console.log('\nFinal inquiry history:');
    console.log(JSON.stringify(history, null, 2));

    console.log('\n✅ SUCCESS! Inquiry history retrieved correctly.');

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

testInquiryHistory();
