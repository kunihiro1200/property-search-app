# Buyer Distribution Column Naming Guide

## Overview
This guide clarifies the column naming convention used in the buyer distribution system to prevent confusion between similar column names in different tables.

## Column Naming Convention

### Buyers Table
**Column**: `desired_area`  
**Type**: TEXT  
**Purpose**: Stores the areas where the buyer wants to receive property notifications  
**Example Values**: "㊵㊶⑫", "①②③④⑥⑦"

### Property Listings Table
**Column**: `distribution_areas`  
**Type**: TEXT  
**Purpose**: Stores the areas where the property should be distributed  
**Example Values**: "㊵㊶", "⑩㊶㊸"

## Why Different Names?

The column names differ to clearly distinguish between:

1. **Buyer Perspective** (`desired_area`)
   - What areas the buyer WANTS to receive notifications for
   - Represents buyer preferences and interests
   - Used for filtering and matching buyers to properties

2. **Property Perspective** (`distribution_areas`)
   - What areas the property SHOULD BE distributed to
   - Calculated based on property location and address
   - Used for determining which buyers should receive notifications

## Code Examples

### ✅ Correct Usage - Buyers

```typescript
// Interface definition
interface BuyerRecord {
  buyer_number: string;
  email: string;
  desired_area: string | null;  // ✅ Correct
  distribution_type: string | null;
  latest_status: string | null;
}

// Database query
const { data: buyers, error } = await supabase
  .from('buyers')
  .select('buyer_number, email, desired_area, distribution_type')  // ✅ Correct
  .not('email', 'is', null);

// Accessing the field
const buyerAreas = buyer.desired_area;  // ✅ Correct
```

### ✅ Correct Usage - Property Listings

```typescript
// Database query
const { data: property, error } = await supabase
  .from('property_listings')
  .select('property_number, address, distribution_areas')  // ✅ Correct
  .eq('property_number', propertyNumber)
  .single();

// Accessing the field
const propertyAreas = property.distribution_areas;  // ✅ Correct
```

### ❌ Incorrect Usage

```typescript
// ❌ WRONG - buyers table doesn't have distribution_areas
const buyerAreas = buyer.distribution_areas;  // ❌ Column doesn't exist

// ❌ WRONG - property_listings table doesn't have desired_area
const propertyAreas = property.desired_area;  // ❌ Column doesn't exist
```

## Database Schema

### Buyers Table Schema
```sql
CREATE TABLE buyers (
  id UUID PRIMARY KEY,
  buyer_number VARCHAR(10),
  email TEXT,
  desired_area TEXT,  -- ✅ Buyer's desired areas
  distribution_type VARCHAR(50),
  latest_status VARCHAR(50),
  -- ... other columns
);
```

### Property Listings Table Schema
```sql
CREATE TABLE property_listings (
  id UUID PRIMARY KEY,
  property_number VARCHAR(10),
  address TEXT,
  distribution_areas TEXT,  -- ✅ Property's distribution areas
  price NUMERIC,
  property_type VARCHAR(50),
  -- ... other columns
);
```

## Matching Logic

When matching buyers to properties, the system:

1. Gets property's `distribution_areas` (e.g., "㊵㊶")
2. Gets buyer's `desired_area` (e.g., "㊵㊶⑫")
3. Checks if any character in property's areas exists in buyer's areas
4. If match found, buyer is qualified to receive notification

```typescript
function hasCommonArea(
  propertyAreas: string,  // distribution_areas from property_listings
  buyerAreas: string      // desired_area from buyers
): boolean {
  const propertySet = new Set(propertyAreas.split(''));
  const buyerSet = new Set(buyerAreas.split(''));
  
  for (const area of propertySet) {
    if (buyerSet.has(area)) {
      return true;  // Found common area
    }
  }
  
  return false;  // No common areas
}
```

## Verification

To verify the correct column names are being used:

```bash
# Run schema verification script
cd backend
npx ts-node check-buyers-schema.ts
```

Expected output:
```
✓ desired_area column exists: true
✗ distribution_areas column exists: false (should be false)
```

## Common Mistakes to Avoid

1. ❌ Using `distribution_areas` when querying buyers table
2. ❌ Using `desired_area` when querying property_listings table
3. ❌ Mixing up the column names in documentation
4. ❌ Creating new code that references non-existent columns

## Best Practices

1. ✅ Always use `desired_area` for buyer preferences
2. ✅ Always use `distribution_areas` for property distribution
3. ✅ Add TypeScript interfaces to catch column name errors at compile time
4. ✅ Use descriptive variable names that indicate which table the data comes from
5. ✅ Add JSDoc comments to clarify which column is being used

## Related Documentation

- [Task 10 Complete Report](./TASK_10_COMPLETE.md)
- [Design Document](./design.md#7-distribution-areas-column-clarification)
- [Requirements Document](./requirements.md#requirement-8-distribution-areas-column-references)

## Questions?

If you're unsure which column name to use:
1. Ask yourself: "Is this data about a buyer or a property?"
2. Buyer data → use `desired_area`
3. Property data → use `distribution_areas`
4. When in doubt, check the database schema or run the verification script
