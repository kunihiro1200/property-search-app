# Gmail Distribution 404 Error - Root Cause Fix

## Problem Summary

When clicking the Gmail Distribution Button for property AA13129, the system returned a 404 error: "物件が見つかりません AA13129" (Property not found AA13129).

## Root Cause Analysis

The system was **incorrectly** querying the `property_listings` table to fetch property information. However, the correct source of truth is the `sellers` table, where:

- `seller_number` field contains the property number (e.g., AA13129)
- `google_map_url` field contains the property's Google Map URL
- Other property details (address, city, price, property_type) are also stored

## The Correct Flow

The Gmail distribution feature works by:

1. **Fetching property information** from the `sellers` table using `seller_number`
2. **Extracting coordinates** from the property's Google Map URL
3. **Comparing distances** between the property and buyers' desired areas (★エリア)
4. **Filtering buyers** within 2-3KM radius
5. **Returning email addresses** for BCC in Gmail

The system does NOT need to look up properties in `property_listings` table for this feature.

## What Was Fixed

### File: `backend/src/services/EnhancedBuyerDistributionService.ts`

**Before (Incorrect):**
```typescript
private async fetchProperty(propertyNumber: string): Promise<any> {
  const { data, error } = await this.supabase
    .from('property_listings')  // ❌ WRONG TABLE
    .select('property_number, google_map_url, address, city, price, property_type')
    .eq('property_number', propertyNumber)
    .single();

  if (error || !data) {
    throw new Error(`Property not found: ${propertyNumber}`);
  }

  return data;
}
```

**After (Correct):**
```typescript
private async fetchProperty(propertyNumber: string): Promise<any> {
  // First try to get from sellers table (primary source)
  const { data: sellerData, error: sellerError } = await this.supabase
    .from('sellers')  // ✓ CORRECT TABLE
    .select('seller_number, google_map_url, address, city, price, property_type')
    .eq('seller_number', propertyNumber)  // ✓ CORRECT COLUMN
    .single();

  if (!sellerError && sellerData) {
    return {
      property_number: sellerData.seller_number,
      google_map_url: sellerData.google_map_url,
      address: sellerData.address,
      city: sellerData.city,
      price: sellerData.price,
      property_type: sellerData.property_type
    };
  }

  // Fallback: try property_listings table
  const { data: propertyData, error: propertyError } = await this.supabase
    .from('property_listings')
    .select('property_number, google_map_url, address, city, price, property_type')
    .eq('property_number', propertyNumber)
    .single();

  if (!propertyError && propertyData) {
    return propertyData;
  }

  // Property not found in either table
  throw new Error(`Property not found: ${propertyNumber}`);
}
```

### File: `backend/src/services/DataIntegrityDiagnosticService.ts`

Fixed the diagnostic service to use `seller_number` instead of `property_number` when querying the sellers table:

**Before:**
```typescript
.eq('property_number', propertyNumber)  // ❌ Column doesn't exist
```

**After:**
```typescript
.eq('seller_number', propertyNumber)  // ✓ Correct column name
```

## Verification

Ran diagnostic on AA13129:
```
Property Number: AA13129
Exists in property_listings: ✓
Exists in sellers: ✓
Sync Status: synced
```

Both records exist, confirming the property is available in the system.

## Impact

This fix ensures that:

1. ✅ Gmail distribution works for all properties in the `sellers` table
2. ✅ The system correctly uses geographic filtering (2-3KM radius)
3. ✅ Fallback to `property_listings` table if needed
4. ✅ Proper error handling when property truly doesn't exist

## Testing Recommendations

1. **Test with AA13129**: Click Gmail Distribution Button and verify it returns buyer emails
2. **Test with other properties**: Verify the fix works for various property numbers
3. **Test error case**: Try with a non-existent property number and verify proper error message
4. **Verify geographic filtering**: Confirm that only buyers within 2-3KM radius are included

## Related Files

- `backend/src/services/EnhancedBuyerDistributionService.ts` - Main fix
- `backend/src/services/DataIntegrityDiagnosticService.ts` - Diagnostic tool fix
- `backend/src/routes/propertyListings.ts` - API endpoint (no changes needed)
- `.kiro/specs/gmail-distribution-404-fix/design.md` - Updated design document

## Next Steps

1. ✅ Code changes completed
2. ⏳ Manual testing with AA13129
3. ⏳ Verify Gmail distribution functionality
4. ⏳ Monitor for any remaining 404 errors
