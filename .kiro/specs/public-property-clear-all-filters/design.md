# Design Document: Clear All Filters Button

## Overview

This feature adds a "すべての条件をクリア" (Clear All Filters) button to the public property listing page's filter section. The button will allow users to reset all active filters with a single click, improving the user experience when users want to start a new search from scratch.

### Key Design Principles

1. **Simplicity**: Single button to clear all filters at once
2. **Consistency**: Follows existing UI patterns in the application
3. **Immediate Feedback**: Visual feedback when filters are cleared
4. **Accessibility**: Keyboard accessible and screen reader friendly
5. **Integration**: Works seamlessly with existing filter components

## Architecture

### Component Structure

The feature will be implemented entirely within the existing `PublicPropertiesPage.tsx` component:

```
┌─────────────────────────────────────────┐
│  PublicPropertiesPage                   │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │  Filter Section (Paper)           │ │
│  │                                   │ │
│  │  ┌─────────────────────────────┐ │ │
│  │  │ PropertyTypeFilterButtons   │ │ │
│  │  └─────────────────────────────┘ │ │
│  │                                   │ │
│  │  ┌─────────────────────────────┐ │ │
│  │  │ Price Range TextFields      │ │ │
│  │  └─────────────────────────────┘ │ │
│  │                                   │ │
│  │  ┌─────────────────────────────┐ │ │
│  │  │ Building Age TextFields     │ │ │
│  │  └─────────────────────────────┘ │ │
│  │                                   │ │
│  │  ┌─────────────────────────────┐ │ │
│  │  │ Clear All Button (NEW)      │ │ ← New button
│  │  └─────────────────────────────┘ │ │
│  └───────────────────────────────────┘ │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │  UnifiedSearchBar                 │ │
│  └───────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

## Implementation Details

### State Management

The clear all functionality will interact with the following existing state variables in `PublicPropertiesPage.tsx`:

```typescript
// Existing state that needs to be cleared
const [selectedTypes, setSelectedTypes] = useState<PropertyType[]>([]);
const [currentPage, setCurrentPage] = useState(1);
const { searchQuery, setSearchQuery } = useUnifiedSearch();

// Price and age filters are managed by TextField values
// These will be cleared by resetting the DOM elements
```

### Clear All Handler Function

```typescript
const handleClearAllFilters = () => {
  // Clear property type selections
  setSelectedTypes([]);
  
  // Clear search query
  setSearchQuery('');
  
  // Reset to page 1
  setCurrentPage(1);
  
  // Clear URL parameters
  const newSearchParams = new URLSearchParams();
  setSearchParams(newSearchParams, { replace: true });
  
  // Clear price and age TextField values
  // This will be done by using refs or controlled state
  // (Implementation detail to be determined)
};
```

### Button Component

The button will be added to the filter section using Material-UI's Button component:

```typescript
<Button
  variant="outlined"
  onClick={handleClearAllFilters}
  disabled={filterLoading}
  sx={{
    mt: 2,
    alignSelf: 'flex-start',
  }}
  aria-label="すべてのフィルター条件をクリア"
>
  すべての条件をクリア
</Button>
```

### TextField State Management

To properly clear the price and age TextFields, we need to convert them to controlled components:

```typescript
// Add state for price filters
const [minPrice, setMinPrice] = useState<string>('');
const [maxPrice, setMaxPrice] = useState<string>('');

// Add state for age filters
const [minAge, setMinAge] = useState<string>('');
const [maxAge, setMaxAge] = useState<string>('');

// Update TextField components to use controlled state
<TextField
  type="number"
  placeholder="最低価格"
  size="small"
  fullWidth
  value={minPrice}
  onChange={(e) => setMinPrice(e.target.value)}
  inputProps={{ min: 0, step: 100 }}
/>
```

### Updated Clear All Handler

```typescript
const handleClearAllFilters = () => {
  // Clear all filter states
  setSelectedTypes([]);
  setSearchQuery('');
  setMinPrice('');
  setMaxPrice('');
  setMinAge('');
  setMaxAge('');
  setCurrentPage(1);
  
  // Clear URL parameters
  const newSearchParams = new URLSearchParams();
  setSearchParams(newSearchParams, { replace: true });
  
  // The useEffect that watches these dependencies will automatically
  // trigger fetchProperties() with no filters
};
```

## Data Flow

### Clear All Filters Flow

```
User clicks "すべての条件をクリア"
         ↓
handleClearAllFilters() is called
         ↓
All filter states are reset to empty/default values
         ↓
URL parameters are cleared
         ↓
useEffect detects state changes
         ↓
fetchProperties() is called with no filters
         ↓
API request: GET /api/public/properties?limit=20&offset=0
         ↓
All properties are fetched and displayed
         ↓
UI updates to show cleared filters and all properties
```

## UI/UX Design

### Button Placement

The button will be placed at the bottom of the filter section, after all filter controls:

```
┌─────────────────────────────────────┐
│ 物件を絞り込む                      │
│                                     │
│ 物件タイプ                          │
│ [戸建て] [マンション] [土地] [収益] │
│                                     │
│ 価格帯（万円）                      │
│ [最低価格] 〜 [最高価格]            │
│                                     │
│ 築年数（年）                        │
│ [最小築年数] 〜 [最大築年数]        │
│                                     │
│ [すべての条件をクリア]              │ ← New button
└─────────────────────────────────────┘
```

### Button Styling

- **Variant**: `outlined` (to distinguish from primary actions)
- **Color**: Default (inherits theme color)
- **Size**: Default (medium)
- **Margin**: `mt: 2` (top margin for spacing)
- **Alignment**: `alignSelf: 'flex-start'` (left-aligned)

### Visual States

1. **Default State**: Outlined button with default colors
2. **Hover State**: Background color changes to `action.hover`
3. **Disabled State**: Reduced opacity, disabled cursor
4. **Loading State**: Button disabled while `filterLoading` is true

## Correctness Properties

### Property 1: All Filters Cleared
*For any* active filter state, when the clear all button is clicked, all filter values should be reset to their default empty state.

**Test Implementation:**
```typescript
test('clear all button resets all filter states', () => {
  fc.assert(
    fc.property(
      fc.array(fc.constantFrom('detached_house', 'apartment', 'land', 'income')),
      fc.string(),
      fc.integer({ min: 0, max: 10000 }),
      fc.integer({ min: 0, max: 10000 }),
      fc.integer({ min: 0, max: 50 }),
      fc.integer({ min: 0, max: 50 }),
      (types, query, minPrice, maxPrice, minAge, maxAge) => {
        // Set up filters
        const initialState = {
          selectedTypes: types,
          searchQuery: query,
          minPrice: minPrice.toString(),
          maxPrice: maxPrice.toString(),
          minAge: minAge.toString(),
          maxAge: maxAge.toString(),
        };
        
        // Clear all filters
        const clearedState = clearAllFilters(initialState);
        
        // Verify all filters are cleared
        return (
          clearedState.selectedTypes.length === 0 &&
          clearedState.searchQuery === '' &&
          clearedState.minPrice === '' &&
          clearedState.maxPrice === '' &&
          clearedState.minAge === '' &&
          clearedState.maxAge === ''
        );
      }
    ),
    { numRuns: 100 }
  );
});
```

### Property 2: URL Parameters Cleared
*For any* active filter state with URL parameters, when the clear all button is clicked, all filter-related URL parameters should be removed.

**Test Implementation:**
```typescript
test('clear all button removes all URL parameters', () => {
  fc.assert(
    fc.property(
      fc.record({
        types: fc.string(),
        location: fc.string(),
        minPrice: fc.string(),
        maxPrice: fc.string(),
        minAge: fc.string(),
        maxAge: fc.string(),
      }),
      (urlParams) => {
        // Set up URL with parameters
        const searchParams = new URLSearchParams(urlParams);
        
        // Clear all filters
        const clearedParams = clearAllUrlParams(searchParams);
        
        // Verify all parameters are removed
        return clearedParams.toString() === '';
      }
    ),
    { numRuns: 100 }
  );
});
```

### Property 3: Page Reset to 1
*For any* current page number, when the clear all button is clicked, the page should be reset to page 1.

**Test Implementation:**
```typescript
test('clear all button resets page to 1', () => {
  fc.assert(
    fc.property(
      fc.integer({ min: 1, max: 100 }),
      (currentPage) => {
        // Clear all filters with any current page
        const newPage = clearAllAndGetPage(currentPage);
        
        // Verify page is reset to 1
        return newPage === 1;
      }
    ),
    { numRuns: 100 }
  );
});
```

### Property 4: Idempotency
*For any* filter state, clicking the clear all button multiple times should produce the same result as clicking it once.

**Test Implementation:**
```typescript
test('clear all button is idempotent', () => {
  fc.assert(
    fc.property(
      fc.record({
        selectedTypes: fc.array(fc.constantFrom('detached_house', 'apartment', 'land', 'income')),
        searchQuery: fc.string(),
        minPrice: fc.string(),
        maxPrice: fc.string(),
        minAge: fc.string(),
        maxAge: fc.string(),
      }),
      (initialState) => {
        // Clear once
        const clearedOnce = clearAllFilters(initialState);
        
        // Clear again
        const clearedTwice = clearAllFilters(clearedOnce);
        
        // Verify both results are identical
        return JSON.stringify(clearedOnce) === JSON.stringify(clearedTwice);
      }
    ),
    { numRuns: 100 }
  );
});
```

## Testing Strategy

### Unit Tests

1. **Clear All Handler Test**: Verify that `handleClearAllFilters` resets all state variables
2. **URL Parameter Test**: Verify that URL parameters are cleared
3. **Page Reset Test**: Verify that page is reset to 1
4. **Disabled State Test**: Verify button is disabled when `filterLoading` is true

### Integration Tests

1. **Full Clear Flow Test**: Simulate user setting filters, then clicking clear all, verify all filters are cleared and properties are refetched
2. **Multiple Filter Types Test**: Set property type, price, age, and search filters, then clear all, verify all are cleared
3. **URL Sync Test**: Verify URL parameters are updated when clear all is clicked

### Manual Testing Checklist

- [ ] Button is visible in the filter section
- [ ] Button is positioned correctly (bottom of filter section)
- [ ] Clicking button clears all property type selections
- [ ] Clicking button clears price range inputs
- [ ] Clicking button clears building age inputs
- [ ] Clicking button clears search query
- [ ] Clicking button resets page to 1
- [ ] Clicking button removes URL parameters
- [ ] Clicking button triggers property refetch
- [ ] Button is disabled during loading
- [ ] Button is keyboard accessible
- [ ] Button has appropriate aria-label
- [ ] Button works on mobile devices

## Error Handling

### Potential Errors

1. **State Update Failure**: If state update fails, log error and show user message
2. **URL Update Failure**: If URL update fails, continue with state clearing
3. **API Fetch Failure**: If property fetch fails after clearing, show error message with retry option

### Error Recovery

```typescript
const handleClearAllFilters = async () => {
  try {
    // Clear all filter states
    setSelectedTypes([]);
    setSearchQuery('');
    setMinPrice('');
    setMaxPrice('');
    setMinAge('');
    setMaxAge('');
    setCurrentPage(1);
    
    // Clear URL parameters
    const newSearchParams = new URLSearchParams();
    setSearchParams(newSearchParams, { replace: true });
    
  } catch (error) {
    console.error('Error clearing filters:', error);
    setError('フィルターのクリアに失敗しました。もう一度お試しください。');
  }
};
```

## Accessibility Considerations

1. **Keyboard Navigation**: Button is focusable and activatable with Enter/Space keys
2. **Screen Reader Support**: Button has descriptive aria-label
3. **Visual Feedback**: Button state changes are visually clear
4. **Touch Target Size**: Button meets minimum 44x44px touch target size
5. **Color Contrast**: Button text has sufficient contrast ratio

## Performance Considerations

1. **State Updates**: All state updates are batched in a single render cycle
2. **API Calls**: Only one API call is made after clearing all filters
3. **URL Updates**: URL is updated with `replace: true` to avoid adding to history
4. **Debouncing**: Not needed since this is a single click action

## Future Enhancements

1. **Confirmation Dialog**: Add optional confirmation dialog for clearing filters (if many filters are active)
2. **Undo Functionality**: Add ability to undo clear action and restore previous filters
3. **Filter Presets**: Allow users to save and load filter presets
4. **Active Filter Count**: Show count of active filters next to clear button
5. **Partial Clear**: Add ability to clear specific filter categories
