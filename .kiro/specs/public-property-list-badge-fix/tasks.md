# Public Property List Page Badge Visibility Fix - Tasks

## Task Overview

| Task ID | Description | Status | Priority | Effort |
|---------|-------------|--------|----------|--------|
| TASK-1 | Investigate root cause | ✅ Complete | High | 15m |
| TASK-2 | Update PublicPropertiesPage | 🔄 Ready | High | 15m |
| TASK-3 | Test badge visibility | 📋 Pending | High | 10m |
| TASK-4 | Verify consistency | 📋 Pending | Medium | 5m |

**Total Effort:** 45 minutes  
**Status:** Investigation complete, ready for implementation

---

## TASK-1: Investigate Root Cause ✅

**Status:** Complete  
**Priority:** High  
**Effort:** 15 minutes

### Objective
Identify why badges are visible on detail page but not on list page.

### Investigation Results

#### Finding 1: Different Card Implementations
- **Detail Page**: Uses simple Material-UI `<Chip>` component directly
- **List Page**: Uses inline card implementation with badge in content area
- **PublicPropertyCard Component**: Exists with proper badge overlay, but NOT used on list page

#### Finding 2: Badge Positioning
- **Detail Page**: Badge in content area (visible)
- **List Page**: Badge in content area (visible but not overlaid on image)
- **PublicPropertyCard**: Badge overlaid on image top-left corner (correct implementation)

#### Finding 3: Component Usage
- `PublicPropertyCard` component exists with:
  - ✅ Badge overlay on image
  - ✅ Proper CSS with `!important` flags
  - ✅ Correct positioning and styling
  - ❌ NOT being used on list page

### Root Cause
**The list page is using an inline card implementation instead of the existing `PublicPropertyCard` component.**

### Solution
Replace the inline card implementation in `PublicPropertiesPage.tsx` with the `PublicPropertyCard` component.

### Deliverables
- ✅ Root cause identified
- ✅ Solution approach defined
- ✅ Requirements document created
- ✅ Design document created

---

## TASK-2: Update PublicPropertiesPage 🔄

**Status:** Ready for Implementation  
**Priority:** High  
**Effort:** 15 minutes

### Objective
Replace inline card implementation with `PublicPropertyCard` component.

### Implementation Steps

#### Step 1: Add Import
**File:** `frontend/src/pages/PublicPropertiesPage.tsx`

**Add at top of file:**
```typescript
import PublicPropertyCard from '../components/PublicPropertyCard';
```

#### Step 2: Replace Card Implementation
**Find this code (around lines 200-280):**
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
          <CardMedia
            component="div"
            sx={{
              height: 192,
              bgcolor: 'grey.200',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {property.images && property.images.length > 0 ? (
              <Box
                component="img"
                src={property.images[0]}
                alt={property.address}
                sx={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
              />
            ) : (
              <Typography color="text.disabled">画像なし</Typography>
            )}
          </CardMedia>

          <CardContent>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
              <Chip
                label={property.propertyType}
                size="small"
                color="primary"
                variant="outlined"
              />
              <Typography variant="caption" color="text.secondary">
                {property.propertyNumber}
              </Typography>
            </Stack>

            <Typography
              variant="h6"
              component="h3"
              fontWeight={600}
              gutterBottom
              sx={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
              }}
            >
              {property.address}
            </Typography>

            <Typography variant="h5" color="primary" fontWeight="bold" gutterBottom>
              {property.price.toLocaleString()}万円
            </Typography>

            {property.keyFeatures && property.keyFeatures.length > 0 && (
              <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                {property.keyFeatures.slice(0, 3).map((feature, index) => (
                  <Chip
                    key={index}
                    label={feature}
                    size="small"
                    variant="outlined"
                  />
                ))}
              </Stack>
            )}
          </CardContent>
        </CardActionArea>
      </Card>
    </Grid>
  ))}
</Grid>
```

**Replace with:**
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

#### Step 3: Remove Unused Imports
**Remove these imports (no longer needed):**
```typescript
import {
  Card,
  CardContent,
  CardMedia,
  CardActionArea,
  Chip, // If not used elsewhere
  // Keep other imports
} from '@mui/material';
```

#### Step 4: Remove Unused Function (Optional)
**Remove if not used elsewhere:**
```typescript
const handlePropertyClick = (id: string) => {
  navigate(`/public/properties/${id}`);
};
```

**Also remove navigate import if not used:**
```typescript
import { useNavigate, useSearchParams } from 'react-router-dom';
// Change to:
import { useSearchParams } from 'react-router-dom';
```

### Code Changes Summary

**Lines to modify:** ~200-280  
**Lines to add:** 1 (import)  
**Lines to remove:** ~80 (inline card implementation)  
**Net change:** -79 lines (code reduction)

### Deliverables
- [ ] Import added
- [ ] Card implementation replaced
- [ ] Unused imports removed
- [ ] Unused functions removed
- [ ] Code compiles without errors

### Acceptance Criteria
- [ ] Code compiles successfully
- [ ] No TypeScript errors
- [ ] No linting errors
- [ ] Component renders without errors

---

## TASK-3: Test Badge Visibility 📋

**Status:** Pending Implementation  
**Priority:** High  
**Effort:** 10 minutes

### Objective
Verify that badges are now visible on the list page with correct styling.

### Test Cases

#### TC-1: Badge Visibility
**Steps:**
1. Navigate to `/public/properties`
2. Observe property cards
3. Check for badges on each card

**Expected Result:**
- ✅ Badge visible on top-left corner of each card image
- ✅ Badge overlaid on image (not in content area)
- ✅ Badge has correct colors based on property type

#### TC-2: Badge Colors
**Steps:**
1. View properties of different types
2. Check badge colors

**Expected Result:**
- ✅ 一戸建て (detached_house): Purple badge (#8B5CF6 on #EDE9FE)
- ✅ マンション (apartment): Pink badge (#EC4899 on #FCE7F3)
- ✅ 土地 (land): Teal badge (#14B8A6 on #CCFBF1)
- ✅ その他 (other): Gray badge (#6B7280 on #F3F4F6)

#### TC-3: Badge Positioning
**Steps:**
1. Inspect badge position on cards
2. Measure distance from top and left edges

**Expected Result:**
- ✅ Badge positioned at top: 16px, left: 16px
- ✅ Badge above image overlay (z-index: 10)
- ✅ Badge does not overlap with other elements

#### TC-4: Animation
**Steps:**
1. Navigate to list page
2. Observe card entrance animations
3. Check badge visibility during animation

**Expected Result:**
- ✅ Cards animate in with staggered delay
- ✅ Badges are visible during animation
- ✅ Animation is smooth and professional

#### TC-5: Card Click
**Steps:**
1. Click on a property card
2. Verify navigation to detail page

**Expected Result:**
- ✅ Clicking card navigates to detail page
- ✅ Correct property is displayed
- ✅ No console errors

### Browser Testing

Test in the following browsers:
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)

### Device Testing

Test on the following devices:
- [ ] Desktop (1920x1080)
- [ ] Tablet (768x1024)
- [ ] Mobile (375x667)

### Deliverables
- [ ] Test results document
- [ ] Screenshots of badges on list page
- [ ] Browser compatibility report
- [ ] Device compatibility report

### Acceptance Criteria
- [ ] All test cases pass
- [ ] Badges visible on all browsers
- [ ] Badges visible on all devices
- [ ] No console errors or warnings

---

## TASK-4: Verify Consistency 📋

**Status:** Pending Implementation  
**Priority:** Medium  
**Effort:** 5 minutes

### Objective
Verify that badges on list page match badges on detail page.

### Comparison Tests

#### CT-1: Visual Comparison
**Steps:**
1. View property on list page
2. Click to view detail page
3. Compare badge styling

**Expected Result:**
- ✅ Badge colors match
- ✅ Badge typography matches
- ✅ Badge shape matches (pill-shaped)
- ✅ Overall appearance is consistent

#### CT-2: Color Consistency
**Steps:**
1. Compare badge colors for each property type
2. Use color picker to verify exact colors

**Expected Result:**
- ✅ List page colors match detail page colors
- ✅ Background colors match
- ✅ Text colors match

#### CT-3: Typography Consistency
**Steps:**
1. Compare badge text styling
2. Check font size, weight, and spacing

**Expected Result:**
- ✅ Font size matches (12px)
- ✅ Font weight matches (600/semi-bold)
- ✅ Padding matches (4px 12px)

### Deliverables
- [ ] Visual comparison screenshots
- [ ] Color verification report
- [ ] Typography verification report
- [ ] Consistency confirmation

### Acceptance Criteria
- [ ] Badges look identical on both pages
- [ ] No visual differences detected
- [ ] User confirms consistency

---

## Implementation Timeline

```
Day 1 (2026-01-05)
├── 00:00-00:15: TASK-1 (Investigation) ✅ Complete
├── 00:15-00:30: TASK-2 (Implementation) 🔄 Ready
├── 00:30-00:40: TASK-3 (Testing) 📋 Pending
└── 00:40-00:45: TASK-4 (Verification) 📋 Pending

Total: 45 minutes
Status: Investigation complete, ready for implementation
```

---

## Pre-Implementation Checklist

Before starting TASK-2, verify:
- [x] `PublicPropertyCard` component exists
- [x] `PublicPropertyCard.css` has badge styles with `!important`
- [x] Badge colors are defined in component
- [x] Component handles navigation internally
- [x] Component supports animation delays

All prerequisites met ✅

---

## Post-Implementation Checklist

After completing all tasks:
- [ ] Code compiles without errors
- [ ] No TypeScript errors
- [ ] No linting errors
- [ ] Badges visible on list page
- [ ] Badges match detail page styling
- [ ] All tests pass
- [ ] User confirms fix is working
- [ ] Documentation updated

---

## Rollback Plan

If issues occur during implementation:

### Rollback Step 1: Revert Code Changes
```bash
git checkout frontend/src/pages/PublicPropertiesPage.tsx
```

### Rollback Step 2: Verify Original State
- List page works (without badges on images)
- No errors in console
- Navigation still works

### Rollback Step 3: Investigate Issues
- Check console for errors
- Verify data structure
- Check component props

### Rollback Step 4: Fix and Re-deploy
- Fix identified issues
- Test thoroughly
- Re-deploy

---

## Success Criteria

### Implementation Success
- [x] Root cause identified
- [ ] Code changes implemented
- [ ] No compilation errors
- [ ] Component renders correctly

### Testing Success
- [ ] Badges visible on list page
- [ ] Badge styling correct
- [ ] Animation works
- [ ] Navigation works
- [ ] Cross-browser compatible

### User Acceptance
- [ ] User confirms badges are visible
- [ ] User confirms styling is correct
- [ ] User confirms no broken functionality
- [ ] User is satisfied with fix

---

## Notes

### Key Insights
1. The `PublicPropertyCard` component already exists with correct implementation
2. The list page was using a different card implementation
3. Simply replacing the inline card with the component fixes the issue
4. No CSS changes needed (component already has correct styles)
5. No API changes needed (component handles data correctly)

### Lessons Learned
1. Always check for existing components before creating new ones
2. Maintain single source of truth for UI components
3. Use component libraries consistently across pages
4. Document component usage patterns

### Future Improvements
1. Add visual regression tests to catch similar issues
2. Create component usage guidelines
3. Implement automated component audits
4. Add linting rules to enforce component usage

---

**Created:** 2026-01-05  
**Status:** Ready for Implementation  
**Next Step:** Execute TASK-2 (Update PublicPropertiesPage)  
**Estimated Time to Complete:** 30 minutes
