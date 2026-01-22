import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function checkOscarDetails() {
  console.log('Checking oscar.yag74@gmail.com buyer details...\n');

  // Get all buyers with this email
  const { data: buyers, error } = await supabase
    .from('buyers')
    .select('*')
    .eq('email', 'oscar.yag74@gmail.com');

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log(`Found ${buyers?.length || 0} buyer records\n`);

  buyers?.forEach((buyer, i) => {
    console.log(`Record ${i + 1}:`);
    console.log(`  ID: ${buyer.id}`);
    console.log(`  Buyer Number: ${buyer.buyer_number}`);
    console.log(`  Email: ${buyer.email}`);
    console.log(`  Desired Area: ${buyer.desired_area}`);
    console.log(`  Distribution Type: "${buyer.distribution_type}"`);
    console.log(`  Latest Status: "${buyer.latest_status}"`);
    console.log(`  Desired Property Type: ${buyer.desired_property_type}`);
    console.log(`  Price Range (Apartment): ${buyer.price_range_apartment}`);
    console.log(`  Price Range (House): ${buyer.price_range_house}`);
    console.log(`  Price Range (Land): ${buyer.price_range_land}`);
    console.log('');
  });

  // Get AA5852 property details
  const { data: property } = await supabase
    .from('property_listings')
    .select('*')
    .eq('property_number', 'AA5852')
    .single();

  if (property) {
    console.log('AA5852 Property Details:');
    console.log(`  Property Type: ${property.property_type}`);
    console.log(`  Price: ${property.price?.toLocaleString()} yen`);
    console.log(`  Distribution Areas: ${property.distribution_areas}`);
    console.log('');
  }

  // Analyze each filter
  if (buyers && buyers.length > 0 && property) {
    console.log('Filter Analysis:');
    console.log('================\n');

    for (const buyer of buyers) {
      console.log(`Buyer ${buyer.buyer_number}:`);

      // 1. Geography Filter
      const propertyAreas = extractAreas(property.distribution_areas);
      const buyerAreas = extractAreas(buyer.desired_area);
      const matchedAreas = buyerAreas.filter(a => propertyAreas.includes(a));
      
      console.log(`  Geography:`);
      console.log(`    Property Areas: ${propertyAreas.join(', ')}`);
      console.log(`    Buyer Areas: ${buyerAreas.join(', ')}`);
      console.log(`    Matched: ${matchedAreas.join(', ') || 'NONE'}`);
      console.log(`    Result: ${matchedAreas.length > 0 ? 'PASS' : 'FAIL'}`);

      // 2. Distribution Type Filter
      const distType = buyer.distribution_type?.trim() || '';
      const distPass = distType === '要' || distType === 'mail' || distType.includes('LINE→mail');
      console.log(`  Distribution Type: "${distType}"`);
      console.log(`    Result: ${distPass ? 'PASS' : 'FAIL'}`);

      // 3. Status Filter
      const status = buyer.latest_status || '';
      const statusPass = !status.includes('買付') && !status.includes('D');
      console.log(`  Status: "${status}"`);
      console.log(`    Result: ${statusPass ? 'PASS' : 'FAIL'}`);

      // 4. Price/Type Filter
      const propertyType = property.property_type;
      const desiredType = buyer.desired_property_type;
      
      let priceRange = '';
      if (propertyType === '土地') {
        priceRange = buyer.price_range_land || '';
      } else if (propertyType === 'マンション' || propertyType === 'アパート') {
        priceRange = buyer.price_range_apartment || '';
      } else if (propertyType === '戸建' || propertyType === '戸建て') {
        priceRange = buyer.price_range_house || '';
      }

      const typeMatch = checkTypeMatch(desiredType, propertyType);
      console.log(`  Property Type Match:`);
      console.log(`    Desired: ${desiredType}`);
      console.log(`    Actual: ${propertyType}`);
      console.log(`    Match: ${typeMatch ? 'YES' : 'NO'}`);

      if (!priceRange || priceRange.includes('指定なし')) {
        console.log(`  Price Range: Not specified`);
        console.log(`    Result: ${typeMatch ? 'PASS' : 'FAIL (type mismatch)'}`);
      } else {
        const priceMatch = checkPriceMatch(property.price, priceRange);
        console.log(`  Price Range: ${priceRange}`);
        console.log(`    Property Price: ${property.price?.toLocaleString()} yen`);
        console.log(`    Match: ${priceMatch ? 'YES' : 'NO'}`);
        console.log(`    Result: ${priceMatch ? 'PASS' : 'FAIL'}`);
      }

      const overallPass = matchedAreas.length > 0 && distPass && statusPass && 
                         (typeMatch || (!priceRange || priceRange.includes('指定なし')));
      console.log(`\n  OVERALL: ${overallPass ? 'QUALIFIED' : 'NOT QUALIFIED'}\n`);
    }
  }
}

function extractAreas(areaString: string | null): string[] {
  if (!areaString) return [];
  const matches = areaString.match(/[①-⑳㉑-㊿]/g);
  return matches || [];
}

function checkTypeMatch(desired: string | null, actual: string | null): boolean {
  if (!desired || !actual) return false;
  
  const normalizedActual = actual.toLowerCase().trim();
  const desiredTypes = desired.split(/[、・\/,]/).map(t => t.toLowerCase().trim());

  for (const d of desiredTypes) {
    if (d === normalizedActual) return true;
    if ((d === 'マンション' || d === 'アパート') && 
        (normalizedActual === 'マンション' || normalizedActual === 'アパート')) return true;
    if ((d === '戸建' || d === '戸建て') && 
        (normalizedActual === '戸建' || normalizedActual === '戸建て')) return true;
  }
  
  return false;
}

function checkPriceMatch(price: number | null, rangeText: string): boolean {
  if (!price) return true;
  
  // X万円以上
  const minMatch = rangeText.match(/(\d+)万円以上/);
  if (minMatch) {
    return price >= parseInt(minMatch[1]) * 10000;
  }

  // X万円以下
  const maxMatch = rangeText.match(/(?:~|～)?(\d+)万円(?:以下)?$/);
  if (maxMatch && !rangeText.includes('以上') && !rangeText.includes('～') && !rangeText.match(/(\d+)万円～(\d+)万円/)) {
    return price <= parseInt(maxMatch[1]) * 10000;
  }

  // X万円～Y万円
  const rangeMatch = rangeText.match(/(\d+)(?:万円)?[～~](\d+)万円/);
  if (rangeMatch) {
    const min = parseInt(rangeMatch[1]) * 10000;
    const max = parseInt(rangeMatch[2]) * 10000;
    return price >= min && price <= max;
  }

  return false;
}

checkOscarDetails().catch(console.error);
