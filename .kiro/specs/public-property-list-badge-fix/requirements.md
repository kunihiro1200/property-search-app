# Public Property List Page Badge Visibility Fix - Requirements

## Overview

Fix the property type badge visibility issue on the public property listing page (物件一覧画面). Badges are visible on the detail page but NOT visible on the list page because the list page is using a different card implementation that doesn't include the badge rendering logic.

## Problem Statement

### Current State
- **Detail Page (物件詳細画面)**: Badges ARE visible - uses simple Material-UI Chip component
- **List Page (物件一覧画面)**: Badges are NOT visible - uses old card structure without badge rendering
- User has confirmed this issue with screenshots
- The `PublicPropertyCard` component exists with proper badge implementation but is NOT being used on the list page

### Root Cause
The `PublicPropertiesPage.tsx` is using an inline card implementation with Material-UI components instead of using the `PublicPropertyCard` component that has proper badge rendering.

**Current List Page Card Structure:**
```tsx
<Card>
  <CardMedia /> {/* Image */}
  <CardContent>
    <Chip label={property.propertyType} /> {/* Badge in content, not on image */}
    {/* Other content */}
  </CardContent>
</Card>
```

**PublicPropertyCard Component (Not Used):**
```tsx
<Card>
  <Box className="property-card-image-container">
    <img />
    <Chip className="property-type-badge" /> {/* Badge overlaid on image */}
  </Box>
  <CardContent>
    {/* Content */}
  </CardContent>
</Card>
```

## User Stories

### US-1: Visible Property Type Badges on List Page
**As a** property viewer  
**I want to** see property type badges on property cards in the list page  
**So that** I can quickly identify the type of property (一戸建て, マンション, 土地, その他)

**Acceptance Criteria:**
- Badge is visible on the top-left corner of each property card image
- Badge has correct background color based on property type
- Badge has correct text color for readability
- Badge matches the styling on the detail page
- Badge is positioned consistently across all cards

### US-2: Consistent Badge Display Across Pages
**As a** property viewer  
**I want** badges to look the same on both list and detail pages  
**So that** the UI is consistent and professional

**Acceptance Criteria:**
- List page badges match detail page badge styling
- Badge colors are consistent (一戸建て: purple, マンション: pink, 土地: teal, その他: gray)
- Badge positioning is consistent
- Badge typography is consistent

### US-3: Use Existing PublicPropertyCard Component
**As a** developer  
**I want** to use the existing `PublicPropertyCard` component on the list page  
**So that** we maintain code consistency and avoid duplication

**Acceptance Criteria:**
- List page uses `PublicPropertyCard` component
- No duplicate card implementation
- Existing CSS styles are applied correctly
- Component props are properly mapped

## Technical Requirements

### TR-1: Replace Inline Card with PublicPropertyCard Component
- Replace the inline card implementation in `PublicPropertiesPage.tsx`
- Use the existing `PublicPropertyCard` component
- Map API response data to component props
- Ensure proper data transformation

### TR-2: Data Mapping
Map API response fields to PublicPropertyCard props:
- `id` → `property.id`
- `propertyNumber` → `property.property_number`
- `address` → `property.address`
- `display_address` → `property.display_address`
- `price` → `property.price`
- `propertyType` → `property.property_type`
- `images` → `property.images`
- `land_area` → `property.land_area`
- `building_area` → `property.building_area`
- `building_age` → `property.building_age`
- `floor_plan` → `property.floor_plan`

### TR-3: Type Consistency
Ensure the API response type matches the `PublicProperty` type expected by `PublicPropertyCard`:
```typescript
interface PublicProperty {
  id: string;
  property_number: string;
  address: string;
  display_address?: string;
  price: number;
  property_type: string;
  images?: string[];
  land_area?: number;
  building_area?: number;
  building_age?: number;
  floor_plan?: string;
}
```

### TR-4: Animation Support
- Support staggered animation delays for cards
- Calculate delay based on card index
- Use existing animation classes from `PublicPropertyCard.css`

## Implementation Plan

### Step 1: Update PublicPropertiesPage.tsx
1. Import `PublicPropertyCard` component
2. Replace inline card implementation with `<PublicPropertyCard>`
3. Map API response data to component props
4. Add animation delay calculation

### Step 2: Verify Data Types
1. Check API response structure
2. Ensure field names match component expectations
3. Add type transformations if needed

### Step 3: Test Badge Visibility
1. Verify badges appear on list page
2. Check badge positioning and colors
3. Confirm consistency with detail page
4. Test across different property types

## Success Criteria

### Primary Success Criteria
1. ✅ Badges are visible on all property cards in the list page
2. ✅ Badges are positioned on top-left corner of property images
3. ✅ Badge colors match property types correctly
4. ✅ Badge styling is consistent with detail page

### Secondary Success Criteria
1. ✅ Code uses existing `PublicPropertyCard` component (no duplication)
2. ✅ Animation effects work correctly
3. ✅ No breaking changes to existing functionality
4. ✅ Type safety is maintained

## Non-Functional Requirements

### NFR-1: Code Quality
- Use existing components (no duplication)
- Maintain type safety
- Follow React best practices
- Keep code DRY (Don't Repeat Yourself)

### NFR-2: Performance
- No impact on page load time
- No impact on rendering performance
- Efficient data mapping

### NFR-3: Maintainability
- Single source of truth for card rendering
- Easy to update card styling in one place
- Clear component structure

## Out of Scope

- Redesigning the card component
- Changing badge colors or styling
- Adding new badge features
- Modifying the detail page
- API changes

## Dependencies

- Existing `PublicPropertyCard` component
- Existing `PublicPropertyCard.css` styles
- Material-UI (@mui/material)
- React Router (for navigation)

## Risks and Mitigation

### Risk 1: Data Structure Mismatch
**Risk:** API response field names may not match component expectations  
**Mitigation:** 
- Check API response structure first
- Add data transformation layer if needed
- Use TypeScript for type safety

### Risk 2: Breaking Changes
**Risk:** Replacing inline card may break existing functionality  
**Mitigation:**
- Test thoroughly before deployment
- Verify all card features work (click, hover, etc.)
- Check responsive behavior

## Testing Plan

### Test Case 1: Badge Visibility
1. Navigate to public properties list page
2. Verify badges are visible on all property cards
3. Verify badges are on top-left corner of images
4. Verify badge colors match property types

**Expected Result:** All badges visible with correct styling

### Test Case 2: Badge Consistency
1. View property on list page
2. Click to view detail page
3. Compare badge styling between pages
4. Verify consistency

**Expected Result:** Badges look identical on both pages

### Test Case 3: Property Type Variants
1. View properties of different types (一戸建て, マンション, 土地, その他)
2. Verify each type has correct badge color
3. Verify badge text is correct

**Expected Result:** All property types display correctly

### Test Case 4: Responsive Behavior
1. Test on desktop (1920x1080)
2. Test on tablet (768x1024)
3. Test on mobile (375x667)
4. Verify badges are visible and properly sized

**Expected Result:** Badges work correctly on all screen sizes

### Test Case 5: Animation
1. Navigate to list page
2. Observe card animations
3. Verify staggered animation effect
4. Verify badges are visible during animation

**Expected Result:** Animations work smoothly with visible badges

## Acceptance Testing

### User Acceptance Criteria
- [ ] User confirms badges are visible on list page
- [ ] User confirms badges match detail page styling
- [ ] User confirms all property types display correctly
- [ ] User confirms no other functionality is broken

## Glossary

- **Badge**: A small label displaying the property type on the property card
- **List Page**: The public property listing page (物件一覧画面)
- **Detail Page**: The individual property detail page (物件詳細画面)
- **PublicPropertyCard**: The reusable card component for displaying property information

## References

- Existing spec: `.kiro/specs/property-type-badge-visibility-fix/`
- Component: `frontend/src/components/PublicPropertyCard.tsx`
- Styles: `frontend/src/components/PublicPropertyCard.css`
- List Page: `frontend/src/pages/PublicPropertiesPage.tsx`
- Detail Page: `frontend/src/pages/PublicPropertyDetailPage.tsx`

---

**Created:** 2026-01-05  
**Status:** Ready for Implementation  
**Priority:** High  
**Complexity:** Low  
**Estimated Effort:** 30 minutes
