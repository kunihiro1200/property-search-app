# Public Property List Page Badge Visibility Fix - Design

## Overview

This document outlines the technical design for fixing the property type badge visibility issue on the public property listing page by replacing the inline card implementation with the existing `PublicPropertyCard` component.

## Problem Analysis

### Current Implementation

**PublicPropertiesPage.tsx (Lines 200-280):**
```tsx
<Grid container spacing={3}>
  {properties.map((property) => (
    <Grid item xs={12} md={6} lg={4} key={property.id}>
      <Card>
        <CardActionArea onClick={() => handlePropertyClick(property.id)}>
          <CardMedia>
            {/* Image display */}
          </CardMedia>
          <CardContent>
            <Chip label={property.propertyType} /> {/* Badge in content area */}
            {/* Other content */}
          </CardContent>
        </CardActionArea>
      </Card>
    </Grid>
  ))}
</Grid>
```

**Issues:**
1. Badge is rendered inside `CardContent`, not overlaid on the image
2. Badge is not positioned on top-left corner of image
3. Duplicate card implementation (PublicPropertyCard already exists)
4. Inconsistent with detail page badge styling

### Target Implementation

**Use PublicPropertyCard component:**
```tsx
<Grid container spacing={3}>
  {properties.map((property, index) => (
    <Grid item xs={12} md={6} lg={4} key={property.id}>
      <PublicPropertyCard 
        property={property}
        animationDelay={index * 0.1}
      />
    </Grid>
  ))}
</Grid>
```

**Benefits:**
1. Badge is overlaid on image (top-left corner)
2. Consistent styling with existing component
3. No code duplication
4. Easier to maintain

## Architecture

### Component Hierarchy

```
PublicPropertiesPage
├── Container
│   ├── Header (Search, Filters)
│   └── Grid Container
│       └── Grid Items
│           └── PublicPropertyCard ← Use this component
│               ├── Card
│               │   ├── Image Container
│               │   │   ├── Image
│               │   │   ├── Overlay
│               │   │   └── Badge (Chip) ← Badge overlaid here
│               │   └── CardContent
│               │       ├── Price
│               │       ├── Address
│               │       └── Features
```

### Data Flow

```
API Response → PublicPropertiesPage State → PublicPropertyCard Props
```

## Implementation Details

### Step 1: Import PublicPropertyCard

**File:** `frontend/src/pages/PublicPropertiesPage.tsx`

**Add import:**
```typescript
import PublicPropertyCard from '../components/PublicPropertyCard';
```

### Step 2: Replace Card Implementation

**Before (Lines ~200-280):**
```tsx
<Grid container spacing={3}>
  {properties.map((property) => (
    <Grid item xs={12} md={6} lg={4} key={property.id}>
      <Card
        sx={{
          height: '100%',
          cursor: 'pointer',
          transition: 'box-shadow 0.3s',
          '&:hover': {
            boxShadow: 6,
          },
        }}
      >
        <CardActionArea onClick={() => handlePropertyClick(property.id)}>
          {/* CardMedia */}
          {/* CardContent */}
        </CardActionArea>
      </Card>
    </Grid>
  ))}
</Grid>
```

**After:**
```tsx
<Grid container spacing={3}>
  {properties.map((property, index) => (
    <Grid item xs={12} md={6} lg={4} key={property.id}>
      <PublicPropertyCard 
        property={property}
        animationDelay={index * 0.1}
      />
    </Grid>
  ))}
</Grid>
```

### Step 3: Remove Unused Imports

**Remove these imports (no longer needed):**
```typescript
import {
  Card,
  CardContent,
  CardMedia,
  CardActionArea,
  // Keep other imports that are still used
} from '@mui/material';
```

**Keep these imports (still needed):**
```typescript
import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  Button,
  CircularProgress,
  TextField,
  Stack,
} from '@mui/material';
```

### Step 4: Remove Inline Handler (Optional)

The `handlePropertyClick` function is no longer needed because `PublicPropertyCard` handles navigation internally.

**Can remove:**
```typescript
const handlePropertyClick = (id: string) => {
  navigate(`/public/properties/${id}`);
};
```

**Note:** The `navigate` import can also be removed if not used elsewhere.

## Data Type Mapping

### API Response Type

**Current type in PublicPropertiesPage.tsx:**
```typescript
interface PublicProperty {
  id: string;
  propertyNumber: string;
  address: string;
  price: number;
  propertyType: string;
  images?: string[];
  keyFeatures?: string[];
  createdAt: string;
}
```

### PublicPropertyCard Expected Type

**Type in PublicPropertyCard.tsx:**
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

### Field Name Differences

| API Response | Component Expected | Action Needed |
|--------------|-------------------|---------------|
| `propertyNumber` | `property_number` | ✅ API should return snake_case |
| `propertyType` | `property_type` | ✅ API should return snake_case |
| `keyFeatures` | Not used | ✅ OK, component doesn't need it |
| `createdAt` | Not used | ✅ OK, component doesn't need it |
| Missing | `display_address` | ✅ API should include if available |
| Missing | `land_area` | ✅ API should include if available |
| Missing | `building_area` | ✅ API should include if available |
| Missing | `building_age` | ✅ API should include if available |
| Missing | `floor_plan` | ✅ API should include if available |

### Solution Options

**Option 1: Update API Response (Recommended)**
- Modify backend to return snake_case field names
- Include additional fields (land_area, building_area, etc.)
- Most consistent with component expectations

**Option 2: Transform Data in Frontend**
- Add transformation function in PublicPropertiesPage
- Map camelCase to snake_case
- More code, but no backend changes needed

**Option 3: Update Component Type**
- Modify PublicPropertyCard to accept camelCase
- Less consistent with other components
- Not recommended

**Recommended:** Option 1 - Update API to return proper field names

## Badge Styling

### Badge Configuration

**From PublicPropertyCard.tsx:**
```typescript
const getPropertyTypeConfig = (type: string) => {
  const configs = {
    'detached_house': { label: '一戸建て', color: '#8B5CF6', bgColor: '#EDE9FE' },
    'apartment': { label: 'マンション', color: '#EC4899', bgColor: '#FCE7F3' },
    'land': { label: '土地', color: '#14B8A6', bgColor: '#CCFBF1' },
    'other': { label: 'その他', color: '#6B7280', bgColor: '#F3F4F6' },
  };
  return configs[type as keyof typeof configs] || configs.other;
};
```

### Badge CSS

**From PublicPropertyCard.css:**
```css
.property-type-badge {
  position: absolute !important;
  top: var(--space-lg) !important;
  left: var(--space-lg) !important;
  z-index: 10 !important;
  font-size: var(--font-size-xs) !important;
  font-weight: var(--font-weight-semibold) !important;
  border-radius: var(--radius-full) !important;
  padding: var(--space-xs) var(--space-md) !important;
  display: inline-flex !important;
  visibility: visible !important;
  opacity: 1 !important;
}
```

**Note:** The `!important` flags ensure the badge is visible even with Material-UI's default styles.

## Animation Support

### Staggered Animation

**PublicPropertyCard supports animation delays:**
```typescript
interface PublicPropertyCardProps {
  property: PublicProperty;
  animationDelay?: number; // In seconds
}
```

**Usage in list page:**
```tsx
{properties.map((property, index) => (
  <PublicPropertyCard 
    property={property}
    animationDelay={index * 0.1} // 0s, 0.1s, 0.2s, etc.
  />
))}
```

**CSS Animation:**
```css
.property-card.animate-fade-in-up {
  animation: fadeInUp 0.6s ease-out forwards;
  animation-delay: var(--animation-delay);
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

## Code Changes Summary

### Files to Modify

1. **frontend/src/pages/PublicPropertiesPage.tsx**
   - Add import for `PublicPropertyCard`
   - Replace inline card implementation
   - Remove unused imports
   - Remove `handlePropertyClick` function (optional)

### Files NOT to Modify

1. **frontend/src/components/PublicPropertyCard.tsx** - Already correct
2. **frontend/src/components/PublicPropertyCard.css** - Already correct
3. **frontend/src/pages/PublicPropertyDetailPage.tsx** - Already correct

## Testing Strategy

### Visual Testing

1. **Badge Visibility**
   - Navigate to `/public/properties`
   - Verify badges appear on all cards
   - Verify badges are on top-left corner of images
   - Verify badge colors match property types

2. **Badge Consistency**
   - Compare list page badges with detail page badges
   - Verify identical styling
   - Verify identical positioning

3. **Animation**
   - Observe card entrance animations
   - Verify staggered effect
   - Verify badges are visible during animation

### Functional Testing

1. **Card Click**
   - Click on property card
   - Verify navigation to detail page
   - Verify correct property is displayed

2. **Responsive Behavior**
   - Test on desktop (1920x1080)
   - Test on tablet (768x1024)
   - Test on mobile (375x667)
   - Verify badges are visible on all sizes

### Cross-Browser Testing

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Performance Considerations

### Before (Inline Implementation)

- Duplicate code in list page
- Separate styling logic
- More code to maintain

### After (Using PublicPropertyCard)

- Single source of truth
- Shared styling logic
- Less code to maintain
- No performance impact (same rendering)

## Accessibility

### Badge Accessibility

**From PublicPropertyCard:**
- Badge text is readable by screen readers
- Badge has sufficient color contrast (WCAG AA)
- Badge does not interfere with keyboard navigation

**No changes needed** - component already handles accessibility correctly.

## Migration Path

### Phase 1: Update List Page (This Spec)
1. Replace inline card with PublicPropertyCard
2. Test badge visibility
3. Verify no breaking changes

### Phase 2: API Updates (If Needed)
1. Update API to return snake_case field names
2. Include additional property fields
3. Update API documentation

### Phase 3: Cleanup (Optional)
1. Remove unused code
2. Update type definitions
3. Add visual regression tests

## Rollback Plan

If issues occur:
1. Revert PublicPropertiesPage.tsx to previous version
2. Badges will not be visible (original issue)
3. Investigate and fix issues
4. Re-deploy

## Success Metrics

### Primary Metrics
- ✅ Badges visible on list page
- ✅ Badge styling matches detail page
- ✅ No breaking changes

### Secondary Metrics
- ✅ Code duplication reduced
- ✅ Maintainability improved
- ✅ Type safety maintained

## Future Enhancements

### Short-term
- Add visual regression tests
- Implement automated screenshot comparison
- Add badge hover effects

### Long-term
- Create comprehensive component library
- Implement design system
- Add more property card variants

---

**Created:** 2026-01-05  
**Status:** Ready for Implementation  
**Estimated Effort:** 30 minutes  
**Risk Level:** Low
