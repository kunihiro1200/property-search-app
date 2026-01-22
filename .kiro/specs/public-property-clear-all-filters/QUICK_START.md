# Quick Start: Clear All Filters Button

## Overview

This spec adds a "すべての条件をクリア" (Clear All Filters) button to the public property listing page's filter section. The button allows users to reset all active filters with a single click.

## Current State

The `PublicPropertiesPage.tsx` currently has:
- ✅ Property type filter (PropertyTypeFilterButtons)
- ✅ Price range filter (TextFields)
- ✅ Building age filter (TextFields)
- ✅ Search query (UnifiedSearchBar)
- ❌ **No clear all button**

## What This Spec Adds

A single button that clears:
1. Selected property types
2. Price range (min/max)
3. Building age range (min/max)
4. Search query
5. URL parameters
6. Resets to page 1

## Implementation Approach

### Key Changes Required

1. **Convert TextFields to Controlled Components**
   - Add state for `minPrice`, `maxPrice`, `minAge`, `maxAge`
   - Update TextFields to use `value` and `onChange` props

2. **Add Clear All Handler**
   - Create `handleClearAllFilters()` function
   - Reset all filter states
   - Clear URL parameters

3. **Add Button to UI**
   - Place at bottom of filter section
   - Use `variant="outlined"`
   - Disable during loading

## Quick Implementation Steps

### Step 1: Add State Variables (5 min)
```typescript
const [minPrice, setMinPrice] = useState<string>('');
const [maxPrice, setMaxPrice] = useState<string>('');
const [minAge, setMinAge] = useState<string>('');
const [maxAge, setMaxAge] = useState<string>('');
```

### Step 2: Update TextFields (10 min)
```typescript
<TextField
  value={minPrice}
  onChange={(e) => setMinPrice(e.target.value)}
  // ... other props
/>
```

### Step 3: Add Clear Handler (10 min)
```typescript
const handleClearAllFilters = () => {
  setSelectedTypes([]);
  setSearchQuery('');
  setMinPrice('');
  setMaxPrice('');
  setMinAge('');
  setMaxAge('');
  setCurrentPage(1);
  
  const newSearchParams = new URLSearchParams();
  setSearchParams(newSearchParams, { replace: true });
};
```

### Step 4: Add Button (5 min)
```typescript
<Button
  variant="outlined"
  onClick={handleClearAllFilters}
  disabled={filterLoading}
  aria-label="すべてのフィルター条件をクリア"
>
  すべての条件をクリア
</Button>
```

## Testing Checklist

- [ ] Set filters, click button, verify all cleared
- [ ] Verify URL parameters are removed
- [ ] Verify page resets to 1
- [ ] Verify properties are refetched
- [ ] Verify button is disabled during loading
- [ ] Test keyboard accessibility (Tab, Enter)
- [ ] Test on mobile devices

## Files to Modify

- `frontend/src/pages/PublicPropertiesPage.tsx` (main implementation)

## Estimated Time

- Implementation: 30 minutes
- Testing: 15 minutes
- **Total: 45 minutes**

## Related Components

- `PropertyTypeFilterButtons` - Property type filter
- `UnifiedSearchBar` - Search query input
- `useUnifiedSearch` - Search state management hook

## Notes

- The `PublicPropertyFilters.tsx` component already has a clear button implemented, but it's not being used in the current page
- This spec adds the clear functionality directly to `PublicPropertiesPage.tsx` to match the current inline filter approach
- Future enhancement: Consider refactoring to use the `PublicPropertyFilters` component

## Next Steps

1. Read `requirements.md` for detailed acceptance criteria
2. Read `design.md` for architecture and implementation details
3. Read `tasks.md` for step-by-step implementation tasks
4. Start with Task 1: Convert TextFields to Controlled Components
