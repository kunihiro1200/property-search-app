

import { EnhancedBuyerDistributionService } from './src/services/EnhancedBuyerDistributionService';
import dotenv from 'dotenv';

dotenv.config();

async function testInquiryBasedDistribution() {
  const service = new EnhancedBuyerDistributionService();

  // テスト対象物件
  const propertyNumber = 'AA13129'; // 大分市田尻北3-14

  console.log(`\n=== Testing Inquiry-Based Distribution ===`);
  console.log(`Property: ${propertyNumber}\n`);

  try {
    const result = await service.getQualifiedBuyersWithAllCriteria({
      propertyNumber
    });

    console.log(`\n=== Results ===`);
    console.log(`Total Buyers: ${result.totalBuyers}`);
    console.log(`Qualified Buyers: ${result.count}`);
    console.log(`Unique Emails: ${result.emails.length}`);

    // マッチタイプ別の統計
    const matchTypes: Record<string, number> = {
      inquiry: 0,
      area: 0,
      both: 0,
      none: 0,
      radius: 0,
      'city-wide': 0
    };

    result.filteredBuyers.forEach(buyer => {
      if (buyer.geographicMatch) {
        const matchType = buyer.geographicMatch.matchType;
        if (matchType in matchTypes) {
          matchTypes[matchType]++;
        }
      }
    });

    console.log(`\n=== Match Type Statistics ===`);
    console.log(`Inquiry-Based Only: ${matchTypes.inquiry}`);
    console.log(`Area-Based Only: ${matchTypes.area}`);
    console.log(`Both: ${matchTypes.both}`);
    console.log(`None: ${matchTypes.none}`);

    // 合格した買主の詳細
    const qualified = result.filteredBuyers.filter(b => 
      b.filterResults.geography &&
      b.filterResults.distribution &&
      b.filterResults.status &&
      b.filterResults.priceRange
    );

    console.log(`\n=== Qualified Buyers Details ===`);
    qualified.forEach(buyer => {
      console.log(`\nBuyer ${buyer.buyer_number}:`);
      console.log(`  Match Type: ${buyer.geographicMatch?.matchType}`);
      if (buyer.geographicMatch?.matchType === 'inquiry' || buyer.geographicMatch?.matchType === 'both') {
        console.log(`  Matched Inquiries:`);
        buyer.geographicMatch.matchedInquiries?.forEach(inq => {
          console.log(`    - ${inq.propertyNumber}: ${inq.distance.toFixed(2)}km`);
        });
      }
      if (buyer.geographicMatch?.matchType === 'area' || buyer.geographicMatch?.matchType === 'both') {
        console.log(`  Matched Areas: ${buyer.geographicMatch.matchedAreas?.join(', ')}`);
      }
    });

  } catch (error) {
    console.error('Error:', error);
  }
}

testInquiryBasedDistribution();
