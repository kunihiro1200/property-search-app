# Implementation Tasks: Clear All Filters Button

## Overview

This document outlines the implementation tasks for adding a "すべての条件をクリア" (Clear All Filters) button to the public property listing page.

## Task Breakdown

### Task 1: Convert TextFields to Controlled Components

**Objective**: Convert price and age TextFields from uncontrolled to controlled components to enable programmatic clearing.

**Files to Modify**:
- `frontend/src/pages/PublicPropertiesPage.tsx`

**Implementation Steps**:

1. Add state variables for price filters:
```typescript
const [minPrice, setMinPrice] = useState<string>('');
const [maxPrice, setMaxPrice] = useState<string>('');
```

2. Add state variables for age filters:
```typescript
const [minAge, setMinAge] = useState<string>('');
const [maxAge, setMaxAge] = useState<string>('');
```

3. Update price TextField components to use controlled state:
```typescript
<TextField
  type="number"
  placeholder="最低価格"
  size="small"
  fullWidth
  value={minPrice}
  onChange={(e) => setMinPrice(e.target.value)}
  inputProps={{ min: 0, step: 100 }}
/>
<TextField
  type="number"
  placeholder="最高価格"
  size="small"
  fullWidth
  value={maxPrice}
  onChange={(e) => setMaxPrice(e.target.value)}
  inputProps={{ min: 0, step: 100 }}
/>
```

4. Update age TextField components to use controlled state:
```typescript
<TextField
  type="number"
  placeholder="最小築年数"
  size="small"
  fullWidth
  value={minAge}
  onChange={(e) => setMinAge(e.target.value)}
  inputProps={{ min: 0, step: 1 }}
/>
<TextField
  type="number"
  placeholder="最大築年数"
  size="small"
  fullWidth
  value={maxAge}
  onChange={(e) => setMaxAge(e.target.value)}
  inputProps={{ min: 0, step: 1 }}
/>
```

**Acceptance Criteria**:
- [ ] Price TextFields are controlled components
- [ ] Age TextFields are controlled components
- [ ] TextField values update correctly when user types
- [ ] Existing filter functionality still works

**Estimated Time**: 30 minutes

---

### Task 2: Update Filter Logic to Use New State

**Objective**: Update the filter application logic to use the new controlled state variables.

**Files to Modify**:
- `frontend/src/pages/PublicPropertiesPage.tsx`

**Implementation Steps**:

1. Update the `fetchProperties` function to read from the new state variables:
```typescript
const fetchProperties = async () => {
  try {
    // ... existing code ...
    
    // Build query parameters
    const params = new URLSearchParams({
      limit: '20',
      offset: offset.toString(),
    });
    
    // Add filters from state
    if (propertyNumber) params.set('propertyNumber', propertyNumber);
    if (location) params.set('location', location);
    if (types) params.set('types', types);
    
    // Add price filters from state
    if (minPrice) params.set('minPrice', minPrice);
    if (maxPrice) params.set('maxPrice', maxPrice);
    
    // Add age filters from state
    if (minAge) params.set('minAge', minAge);
    if (maxAge) params.set('maxAge', maxAge);
    
    // ... rest of function ...
  }
};
```

2. Update the `useEffect` dependencies to include the new state variables:
```typescript
useEffect(() => {
  fetchProperties();
}, [currentPage, propertyNumberParam, locationParam, typesParam, minPrice, maxPrice, minAge, maxAge]);
```

3. Add logic to sync URL parameters with state on mount:
```typescript
useEffect(() => {
  const minPriceParam = searchParams.get('minPrice');
  const maxPriceParam = searchParams.get('maxPrice');
  const minAgeParam = searchParams.get('minAge');
  const maxAgeParam = searchParams.get('maxAge');
  
  if (minPriceParam) setMinPrice(minPriceParam);
  if (maxPriceParam) setMaxPrice(maxPriceParam);
  if (minAgeParam) setMinAge(minAgeParam);
  if (maxAgeParam) setMaxAge(maxAgeParam);
}, []);
```

**Acceptance Criteria**:
- [ ] Filters are applied correctly using new state
- [ ] URL parameters are synced with state
- [ ] Filter changes trigger property refetch
- [ ] No regression in existing filter functionality

**Estimated Time**: 45 minutes

---

### Task 3: Implement Clear All Handler Function

**Objective**: Create the handler function that clears all filter states.

**Files to Modify**:
- `frontend/src/pages/PublicPropertiesPage.tsx`

**Implementation Steps**:

1. Add the `handleClearAllFilters` function:
```typescript
const handleClearAllFilters = () => {
  // Clear property type selections
  setSelectedTypes([]);
  
  // Clear search query
  setSearchQuery('');
  
  // Clear price filters
  setMinPrice('');
  setMaxPrice('');
  
  // Clear age filters
  setMinAge('');
  setMaxAge('');
  
  // Reset to page 1
  setCurrentPage(1);
  
  // Clear URL parameters
  const newSearchParams = new URLSearchParams();
  setSearchParams(newSearchParams, { replace: true });
};
```

2. Add error handling:
```typescript
const handleClearAllFilters = () => {
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

**Acceptance Criteria**:
- [ ] Function clears all filter states
- [ ] Function clears URL parameters
- [ ] Function resets page to 1
- [ ] Function handles errors gracefully
- [ ] Function triggers property refetch

**Estimated Time**: 30 minutes

---

### Task 4: Add Clear All Button to UI

**Objective**: Add the "すべての条件をクリア" button to the filter section.

**Files to Modify**:
- `frontend/src/pages/PublicPropertiesPage.tsx`

**Implementation Steps**:

1. Add the button component at the bottom of the filter section:
```typescript
<Paper elevation={1} sx={{ p: 3 }}>
  <Typography variant="h6" fontWeight="600" gutterBottom>
    物件を絞り込む
  </Typography>
  
  <Stack spacing={3} sx={{ mt: 2 }}>
    {/* Existing filters */}
    <PropertyTypeFilterButtons ... />
    
    {/* Price filters */}
    <Box>...</Box>
    
    {/* Age filters */}
    <Box>...</Box>
    
    {/* NEW: Clear All Button */}
    <Box sx={{ display: 'flex', justifyContent: 'flex-start' }}>
      <Button
        variant="outlined"
        onClick={handleClearAllFilters}
        disabled={filterLoading}
        sx={{
          mt: 1,
        }}
        aria-label="すべてのフィルター条件をクリア"
      >
        すべての条件をクリア
      </Button>
    </Box>
  </Stack>
</Paper>
```

2. Ensure proper spacing and alignment

**Acceptance Criteria**:
- [ ] Button is visible in the filter section
- [ ] Button is positioned at the bottom of filters
- [ ] Button has correct styling (outlined variant)
- [ ] Button has proper spacing
- [ ] Button is left-aligned

**Estimated Time**: 20 minutes

---

### Task 5: Add Button State Management

**Objective**: Implement proper button state management (disabled during loading).

**Files to Modify**:
- `frontend/src/pages/PublicPropertiesPage.tsx`

**Implementation Steps**:

1. Button is already using `disabled={filterLoading}` prop

2. Verify button state changes correctly:
   - Disabled when `filterLoading` is true
   - Enabled when `filterLoading` is false

3. Add visual feedback for disabled state (Material-UI handles this automatically)

**Acceptance Criteria**:
- [ ] Button is disabled during filter loading
- [ ] Button is enabled when not loading
- [ ] Disabled state has reduced opacity
- [ ] Disabled state shows disabled cursor

**Estimated Time**: 15 minutes

---

### Task 6: Add Unit Tests

**Objective**: Create unit tests for the clear all functionality.

**Files to Create**:
- `frontend/src/pages/__tests__/PublicPropertiesPage.clearFilters.test.tsx`

**Implementation Steps**:

1. Create test file with basic setup:
```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import PublicPropertiesPage from '../PublicPropertiesPage';

describe('PublicPropertiesPage - Clear All Filters', () => {
  // Tests will go here
});
```

2. Add test for clearing all filter states:
```typescript
test('clear all button resets all filter states', async () => {
  render(
    <BrowserRouter>
      <PublicPropertiesPage />
    </BrowserRouter>
  );
  
  // Set some filters
  const typeButton = screen.getByText('戸建て');
  fireEvent.click(typeButton);
  
  const minPriceInput = screen.getByPlaceholderText('最低価格');
  fireEvent.change(minPriceInput, { target: { value: '1000' } });
  
  // Click clear all button
  const clearButton = screen.getByText('すべての条件をクリア');
  fireEvent.click(clearButton);
  
  // Verify all filters are cleared
  await waitFor(() => {
    expect(typeButton).not.toHaveClass('MuiButton-contained');
    expect(minPriceInput).toHaveValue('');
  });
});
```

3. Add test for URL parameter clearing:
```typescript
test('clear all button removes URL parameters', async () => {
  // Test implementation
});
```

4. Add test for page reset:
```typescript
test('clear all button resets page to 1', async () => {
  // Test implementation
});
```

5. Add test for disabled state:
```typescript
test('clear all button is disabled during loading', async () => {
  // Test implementation
});
```

**Acceptance Criteria**:
- [ ] All unit tests pass
- [ ] Tests cover all clear all functionality
- [ ] Tests verify state changes
- [ ] Tests verify URL parameter changes
- [ ] Tests verify button disabled state

**Estimated Time**: 1 hour

---

### Task 7: Add Property-Based Tests

**Objective**: Create property-based tests for the clear all functionality.

**Files to Create**:
- `frontend/src/pages/__tests__/PublicPropertiesPage.clearFilters.property.test.tsx`

**Implementation Steps**:

1. Install fast-check if not already installed:
```bash
npm install --save-dev fast-check
```

2. Create property-based test file:
```typescript
import fc from 'fast-check';
import { clearAllFilters } from '../PublicPropertiesPage';

describe('PublicPropertiesPage - Clear All Filters Properties', () => {
  // Property tests will go here
});
```

3. Implement Property 1: All Filters Cleared
```typescript
test('Property 1: all filters are cleared', () => {
  fc.assert(
    fc.property(
      fc.array(fc.constantFrom('detached_house', 'apartment', 'land', 'income')),
      fc.string(),
      fc.string(),
      fc.string(),
      fc.string(),
      fc.string(),
      (types, query, minPrice, maxPrice, minAge, maxAge) => {
        const initialState = {
          selectedTypes: types,
          searchQuery: query,
          minPrice,
          maxPrice,
          minAge,
          maxAge,
        };
        
        const clearedState = clearAllFilters(initialState);
        
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

4. Implement Property 2: URL Parameters Cleared

5. Implement Property 3: Page Reset to 1

6. Implement Property 4: Idempotency

**Acceptance Criteria**:
- [ ] All property-based tests pass
- [ ] Tests run 100 iterations each
- [ ] Tests cover all correctness properties
- [ ] Tests use appropriate generators

**Estimated Time**: 1.5 hours

---

### Task 8: Manual Testing

**Objective**: Perform manual testing to verify the feature works correctly in the browser.

**Testing Checklist**:

1. **Visual Verification**:
   - [ ] Button is visible in the filter section
   - [ ] Button is positioned correctly
   - [ ] Button has correct styling
   - [ ] Button has proper spacing

2. **Functionality Testing**:
   - [ ] Set property type filter, click clear all, verify cleared
   - [ ] Set price range filter, click clear all, verify cleared
   - [ ] Set building age filter, click clear all, verify cleared
   - [ ] Set search query, click clear all, verify cleared
   - [ ] Set multiple filters, click clear all, verify all cleared
   - [ ] Verify page resets to 1 after clearing
   - [ ] Verify URL parameters are removed after clearing
   - [ ] Verify properties are refetched after clearing

3. **State Testing**:
   - [ ] Button is disabled during loading
   - [ ] Button is enabled when not loading
   - [ ] Disabled state has correct visual appearance

4. **Accessibility Testing**:
   - [ ] Button is keyboard accessible (Tab to focus)
   - [ ] Button can be activated with Enter key
   - [ ] Button can be activated with Space key
   - [ ] Button has appropriate aria-label
   - [ ] Screen reader announces button correctly

5. **Mobile Testing**:
   - [ ] Button is visible on mobile devices
   - [ ] Button has sufficient touch target size
   - [ ] Button works correctly on touch devices

6. **Error Testing**:
   - [ ] Simulate network error, verify error handling
   - [ ] Click clear all multiple times rapidly, verify no issues
   - [ ] Clear filters when no filters are active, verify no issues

**Estimated Time**: 45 minutes

---

### Task 9: Documentation

**Objective**: Update documentation to reflect the new feature.

**Files to Update**:
- `README.md` (if applicable)
- Component documentation (if applicable)

**Implementation Steps**:

1. Add feature description to relevant documentation

2. Add usage examples if needed

3. Update any user guides or help documentation

**Acceptance Criteria**:
- [ ] Documentation is updated
- [ ] Feature is described clearly
- [ ] Usage examples are provided (if applicable)

**Estimated Time**: 30 minutes

---

## Summary

**Total Estimated Time**: 6 hours 5 minutes

**Task Dependencies**:
- Task 2 depends on Task 1
- Task 3 depends on Task 2
- Task 4 depends on Task 3
- Task 5 depends on Task 4
- Tasks 6-9 can be done in parallel after Task 5

**Critical Path**:
Task 1 → Task 2 → Task 3 → Task 4 → Task 5 → Task 6 → Task 7 → Task 8 → Task 9

**Priority Order**:
1. Task 1 (Foundation)
2. Task 2 (Foundation)
3. Task 3 (Core functionality)
4. Task 4 (UI implementation)
5. Task 5 (State management)
6. Task 6 (Testing)
7. Task 7 (Testing)
8. Task 8 (Verification)
9. Task 9 (Documentation)
