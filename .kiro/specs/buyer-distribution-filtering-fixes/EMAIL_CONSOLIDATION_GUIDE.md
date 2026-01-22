# Email Consolidation Implementation Guide

## Overview

This guide provides detailed instructions for implementing email-based buyer consolidation in the distribution system. This feature addresses the critical architectural issue where multiple buyer records with the same email address are treated independently, causing incorrect distribution decisions.

## Problem Statement

### Current Behavior
- Each buyer record is evaluated independently
- Multiple records with the same email are not consolidated
- Example: kouten0909@icloud.com has 2 records (1811 and 4782)
  - Both have desired_area "①②③④⑥⑦"
  - System treats them as separate buyers
  - No consolidation of preferences

### Expected Behavior
- All buyer records with the same email should be consolidated
- Desired areas should be merged across all records
- Most permissive status should be used (C over D)
- Only one email should be sent per unique email address

## Architecture

### Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│  1. Fetch all buyers from database                          │
│     SELECT * FROM buyers WHERE ...                          │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  2. Group buyers by email address (case-insensitive)        │
│     Map<email, Buyer[]>                                     │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  3. For each email group:                                   │
│     - Merge desired_area values                             │
│     - Select most permissive status                         │
│     - Combine property types                                │
│     - Merge price ranges                                    │
│     - Track all buyer numbers                               │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  4. Apply distribution filters to consolidated buyers       │
│     - Geography filter (using merged areas)                 │
│     - Distribution flag filter                              │
│     - Status filter (using most permissive)                 │
│     - Price range filter                                    │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  5. Return unique email addresses                           │
│     One email per unique address                            │
└─────────────────────────────────────────────────────────────┘
```

## Implementation Steps

### Step 1: Define ConsolidatedBuyer Interface

```typescript
interface ConsolidatedBuyer {
  email: string;                    // Primary email address
  buyerNumbers: number[];           // All buyer numbers with this email
  allDesiredAreas: string;          // Merged desired areas (e.g., "①②③④⑥⑦")
  mostPermissiveStatus: string;     // C over D
  propertyTypes: string[];          // All unique property types
  priceRanges: {
    apartment: string[];            // All apartment price ranges
    house: string[];                // All house price ranges
    land: string[];                 // All land price ranges
  };
  distributionType: string;         // Distribution flag (要/mail/LINE→mail)
  originalRecords: any[];           // Keep original records for reference
}
```

### Step 2: Implement consolidateBuyersByEmail()

```typescript
private consolidateBuyersByEmail(buyers: any[]): Map<string, ConsolidatedBuyer> {
  const emailMap = new Map<string, ConsolidatedBuyer>();
  
  for (const buyer of buyers) {
    // Normalize email (lowercase, trim)
    const email = buyer.email?.trim().toLowerCase();
    if (!email) {
      console.warn(`Buyer ${buyer.buyer_number} has no email, skipping`);
      continue;
    }
    
    if (!emailMap.has(email)) {
      // First record for this email - initialize
      emailMap.set(email, {
        email: buyer.email, // Use original casing
        buyerNumbers: [buyer.buyer_number],
        allDesiredAreas: buyer.desired_area || '',
        mostPermissiveStatus: buyer.latest_status || '',
        propertyTypes: buyer.desired_property_type ? [buyer.desired_property_type] : [],
        priceRanges: {
          apartment: buyer.price_range_apartment ? [buyer.price_range_apartment] : [],
          house: buyer.price_range_house ? [buyer.price_range_house] : [],
          land: buyer.price_range_land ? [buyer.price_range_land] : []
        },
        distributionType: buyer.distribution_type || '',
        originalRecords: [buyer]
      });
    } else {
      // Additional record for this email - merge
      const consolidated = emailMap.get(email)!;
      
      // Add buyer number
      consolidated.buyerNumbers.push(buyer.buyer_number);
      
      // Merge desired areas (remove duplicates)
      const existingAreas = new Set(consolidated.allDesiredAreas.split(''));
      const newAreas = (buyer.desired_area || '').split('');
      newAreas.forEach(area => {
        if (area.trim()) existingAreas.add(area);
      });
      consolidated.allDesiredAreas = Array.from(existingAreas).join('');
      
      // Use most permissive status
      if (this.isMorePermissiveStatus(buyer.latest_status, consolidated.mostPermissiveStatus)) {
        consolidated.mostPermissiveStatus = buyer.latest_status;
      }
      
      // Merge property types (unique)
      if (buyer.desired_property_type && 
          !consolidated.propertyTypes.includes(buyer.desired_property_type)) {
        consolidated.propertyTypes.push(buyer.desired_property_type);
      }
      
      // Merge price ranges (unique)
      if (buyer.price_range_apartment && 
          !consolidated.priceRanges.apartment.includes(buyer.price_range_apartment)) {
        consolidated.priceRanges.apartment.push(buyer.price_range_apartment);
      }
      if (buyer.price_range_house && 
          !consolidated.priceRanges.house.includes(buyer.price_range_house)) {
        consolidated.priceRanges.house.push(buyer.price_range_house);
      }
      if (buyer.price_range_land && 
          !consolidated.priceRanges.land.includes(buyer.price_range_land)) {
        consolidated.priceRanges.land.push(buyer.price_range_land);
      }
      
      // Use most permissive distribution type (要 > mail > others)
      if (this.isMorePermissiveDistributionType(buyer.distribution_type, consolidated.distributionType)) {
        consolidated.distributionType = buyer.distribution_type;
      }
      
      // Keep original record
      consolidated.originalRecords.push(buyer);
    }
  }
  
  console.log(`[Email Consolidation] Consolidated ${buyers.length} buyer records into ${emailMap.size} unique emails`);
  
  return emailMap;
}
```

### Step 3: Implement Helper Methods

```typescript
private isMorePermissiveStatus(status1: string, status2: string): boolean {
  // Status priority: C (active) > others > D (inactive)
  const priority: { [key: string]: number } = {
    'C': 3,  // Active - highest priority
    'B': 2,  // Medium priority
    'A': 2,  // Medium priority
    'D': 1   // Inactive - lowest priority
  };
  
  const p1 = priority[status1] || 2;
  const p2 = priority[status2] || 2;
  
  return p1 > p2;
}

private isMorePermissiveDistributionType(type1: string, type2: string): boolean {
  // Distribution type priority: 要 > mail > LINE→mail > others
  const priority: { [key: string]: number } = {
    '要': 3,
    'mail': 2,
    'LINE→mail': 1
  };
  
  const p1 = priority[type1] || 0;
  const p2 = priority[type2] || 0;
  
  return p1 > p2;
}
```

### Step 4: Update getQualifiedBuyersWithAllCriteria()

```typescript
async getQualifiedBuyersWithAllCriteria(criteria: {
  propertyNumber: string;
  includeGeography?: boolean;
  includeDistributionFlag?: boolean;
  includeStatus?: boolean;
  includePriceRange?: boolean;
}): Promise<QualifiedBuyersResult> {
  
  // ... existing property fetch and validation ...
  
  // Fetch all buyers
  const { data: allBuyers, error: buyersError } = await supabase
    .from('buyers')
    .select('*');
  
  if (buyersError) throw buyersError;
  
  console.log(`[Distribution] Fetched ${allBuyers.length} total buyer records`);
  
  // **NEW: Consolidate buyers by email**
  const consolidatedBuyersMap = this.consolidateBuyersByEmail(allBuyers);
  const consolidatedBuyers = Array.from(consolidatedBuyersMap.values());
  
  console.log(`[Distribution] Consolidated into ${consolidatedBuyers.length} unique emails`);
  
  // Log consolidation details
  for (const [email, consolidated] of consolidatedBuyersMap.entries()) {
    if (consolidated.buyerNumbers.length > 1) {
      console.log(`[Email Consolidation] ${email}: ${consolidated.buyerNumbers.length} records (${consolidated.buyerNumbers.join(', ')})`);
      console.log(`  - Merged areas: ${consolidated.allDesiredAreas}`);
      console.log(`  - Status: ${consolidated.mostPermissiveStatus}`);
    }
  }
  
  // ... continue with existing filter logic, but use consolidatedBuyers ...
  
  // Apply filters to consolidated buyers
  let filteredBuyers = consolidatedBuyers;
  
  if (criteria.includeGeography !== false) {
    filteredBuyers = filteredBuyers.filter(buyer => 
      this.filterByGeography(property, buyer, inquiryMap)
    );
  }
  
  // ... rest of filtering logic ...
}
```

### Step 5: Update Filter Methods to Work with ConsolidatedBuyer

```typescript
private filterByGeography(
  property: any,
  consolidatedBuyer: ConsolidatedBuyer,
  inquiryMap: Map<number, any[]>
): boolean {
  // Check if ANY of the buyer's records have inquired about this property
  for (const buyerNumber of consolidatedBuyer.buyerNumbers) {
    const inquiries = inquiryMap.get(buyerNumber) || [];
    if (inquiries.some(inq => inq.property_number === property.property_number)) {
      console.log(`[Geography Filter] Buyer ${consolidatedBuyer.email} (${buyerNumber}) has inquired - PASS`);
      return true;
    }
  }
  
  // Check area-based matching using merged areas
  const propertyAreas = property.distribution_areas?.split('') || [];
  const buyerAreas = consolidatedBuyer.allDesiredAreas.split('');
  
  const commonAreas = propertyAreas.filter(area => buyerAreas.includes(area));
  
  if (commonAreas.length > 0) {
    console.log(`[Geography Filter] Buyer ${consolidatedBuyer.email} matches areas: ${commonAreas.join('')} - PASS`);
    return true;
  }
  
  console.log(`[Geography Filter] Buyer ${consolidatedBuyer.email} - no match - FAIL`);
  return false;
}
```

## Testing Strategy

### Test Case 1: Same Email, Same Areas
```typescript
// backend/test-email-consolidation-same-areas.ts
// Test: kouten0909@icloud.com with 2 records, both have "①②③④⑥⑦"
// Expected: Areas consolidated to "①②③④⑥⑦" (no duplicates)
// Expected: Property AA4160 (⑩㊶㊸) does NOT match
```

### Test Case 2: Same Email, Different Areas
```typescript
// backend/test-email-consolidation-different-areas.ts
// Test: Create test email with 2 records
//   - Record 1: "①②③"
//   - Record 2: "④⑤⑥"
// Expected: Areas consolidated to "①②③④⑤⑥"
// Expected: Property with "⑤" DOES match
```

### Test Case 3: Same Email, Different Statuses
```typescript
// backend/test-email-consolidation-status-priority.ts
// Test: Create test email with 2 records
//   - Record 1: Status "C" (active)
//   - Record 2: Status "D" (inactive)
// Expected: Status "C" is used (more permissive)
// Expected: Buyer is included in distribution
```

## Rollout Plan

### Phase 1: Implementation (Week 1)
1. Implement `ConsolidatedBuyer` interface
2. Implement `consolidateBuyersByEmail()` method
3. Implement helper methods
4. Update `getQualifiedBuyersWithAllCriteria()`
5. Update filter methods

### Phase 2: Testing (Week 1-2)
1. Create test scripts for all scenarios
2. Test with real data (kouten0909@icloud.com)
3. Test with synthetic data
4. Verify AA4160 case is fixed
5. Performance testing with large buyer lists

### Phase 3: Deployment (Week 2)
1. Deploy to staging environment
2. Run comprehensive tests
3. Monitor logs for consolidation details
4. Deploy to production
5. Monitor distribution results

### Phase 4: Validation (Week 3)
1. Verify distribution emails are correct
2. Check that no duplicate emails are sent
3. Confirm buyer satisfaction
4. Gather feedback from agents

## Monitoring

### Key Metrics to Track
- Number of buyer records vs unique emails
- Average records per email address
- Consolidation success rate
- Distribution accuracy improvement
- Email delivery rate

### Logging
```typescript
console.log(`[Email Consolidation] Consolidated ${buyers.length} records into ${emailMap.size} unique emails`);
console.log(`[Email Consolidation] ${email}: ${buyerNumbers.length} records (${buyerNumbers.join(', ')})`);
console.log(`[Email Consolidation] Merged areas: ${allDesiredAreas}`);
console.log(`[Email Consolidation] Status: ${mostPermissiveStatus}`);
```

## Troubleshooting

### Issue: Buyer not receiving expected properties
**Check:**
1. Are there multiple records for this email?
2. Are the desired areas correctly merged?
3. Is the most permissive status being used?
4. Check logs for consolidation details

### Issue: Duplicate emails being sent
**Check:**
1. Is consolidation happening before email extraction?
2. Are emails being normalized (lowercase, trim)?
3. Check email extraction logic

### Issue: Performance degradation
**Check:**
1. Is consolidation happening only once per request?
2. Are maps being used efficiently?
3. Consider caching consolidated buyers

## Related Files

- `backend/src/services/EnhancedBuyerDistributionService.ts` - Main implementation
- `backend/check-all-buyers-by-email.ts` - Investigation script
- `backend/AA4160_BUYER_2064_INVESTIGATION.md` - Problem documentation
- `.kiro/specs/buyer-distribution-filtering-fixes/` - Specification directory

## Success Criteria

✅ Multiple buyer records with same email are consolidated  
✅ Desired areas are merged without duplicates  
✅ Most permissive status is used  
✅ Only one email sent per unique address  
✅ AA4160 correctly excludes kouten0909@icloud.com  
✅ All tests pass  
✅ No performance degradation  
✅ Clear logging for debugging  

## Next Steps

1. Review this guide with the team
2. Implement the consolidation logic
3. Create comprehensive tests
4. Deploy to staging
5. Validate with real data
6. Deploy to production
7. Monitor and iterate
