# Property Type Badge Visibility Fix - Requirements

## Overview

Fix the visibility issue of property type badges on public property cards. The badges exist in the DOM but are not visible on screen due to CSS specificity conflicts with Material-UI's default styles.

## Problem Statement

### Current State
- Property type badges (一戸建て, マンション, 土地, その他) are rendered in the DOM
- Badges are not visible on the screen
- User has confirmed cache clearing and hard refresh multiple times
- The badges were working correctly before

### Root Cause
Material-UI's `Chip` component has default styles that override custom CSS due to higher specificity:
- Material-UI uses inline styles and high-specificity class selectors
- Custom CSS classes have lower priority
- The `sx` prop in Material-UI generates styles with higher specificity than regular CSS classes

## User Stories

### US-1: Visible Property Type Badges
**As a** property viewer  
**I want to** see property type badges on property cards  
**So that** I can quickly identify the type of property (detached house, apartment, land, other)

**Acceptance Criteria:**
- Badge is visible in the top-left corner of the property image
- Badge has correct background color based on property type
- Badge has correct text color for readability
- Badge is positioned above the image overlay (z-index: 10)
- Badge maintains visibility across all browsers

### US-2: Consistent Badge Styling
**As a** property viewer  
**I want** badges to have consistent styling  
**So that** the UI looks professional and polished

**Acceptance Criteria:**
- Badge position: absolute, top-left (16px, 16px)
- Badge shape: pill-shaped with full border radius
- Badge font: 12px, semi-bold
- Badge colors:
  - Detached house: Purple (#8B5CF6) on light purple (#EDE9FE)
  - Apartment: Pink (#EC4899) on light pink (#FCE7F3)
  - Land: Teal (#14B8A6) on light teal (#CCFBF1)
  - Other: Gray (#6B7280) on light gray (#F3F4F6)

### US-3: Diagnostic Tools
**As a** developer  
**I want** diagnostic tools to identify badge visibility issues  
**So that** I can quickly troubleshoot similar problems in the future

**Acceptance Criteria:**
- Diagnostic HTML page available
- Console script to check computed styles
- Automatic problem detection
- Temporary fix testing capability

## Technical Requirements

### TR-1: CSS Specificity Enhancement
- Add `!important` flags to critical CSS properties
- Ensure custom styles override Material-UI defaults
- Properties to enforce:
  - `position: absolute !important`
  - `z-index: 10 !important`
  - `display: inline-flex !important`
  - `visibility: visible !important`
  - `opacity: 1 !important`
  - `top`, `left`, `font-size`, `font-weight`, `border-radius`, `padding`

### TR-2: Browser Compatibility
- Support Chrome/Edge (latest 2 versions)
- Support Firefox (latest 2 versions)
- Support Safari (latest 2 versions)
- Support mobile browsers (iOS Safari, Chrome Mobile)

### TR-3: Performance
- No impact on page load time
- No impact on rendering performance
- CSS changes should be minimal and targeted

### TR-4: Accessibility
- Badge text must have sufficient color contrast (WCAG AA)
- Badge should not interfere with keyboard navigation
- Badge should be readable by screen readers

## Non-Functional Requirements

### NFR-1: Maintainability
- CSS changes should be well-documented
- Diagnostic tools should be easy to use
- Solution should be sustainable long-term

### NFR-2: Testing
- Visual regression testing recommended
- Cross-browser testing required
- Mobile device testing required

### NFR-3: Documentation
- Create comprehensive fix documentation
- Create quick start guide in Japanese
- Create diagnostic tool with instructions
- Document alternative solutions for future reference

## Constraints

### Technical Constraints
- Must use existing Material-UI Chip component
- Cannot modify Material-UI library code
- Must maintain existing component structure
- Must work with current build system

### Business Constraints
- Fix must be implemented quickly
- No breaking changes to existing functionality
- Must work without requiring user action (beyond cache clear)

## Success Criteria

### Primary Success Criteria
1. ✅ Badges are visible on all property cards
2. ✅ Badges have correct colors and positioning
3. ✅ Badges maintain visibility after browser cache clear
4. ✅ Solution works across all supported browsers

### Secondary Success Criteria
1. ✅ Diagnostic tools are available and functional
2. ✅ Documentation is comprehensive and clear
3. ✅ Alternative solutions are documented
4. ✅ Team understands CSS specificity issues

## Out of Scope

- Redesigning the badge component
- Changing badge colors or styling (beyond fixing visibility)
- Implementing new badge features
- Refactoring to remove Material-UI dependency
- Creating a custom badge component (documented as alternative)

## Dependencies

- Material-UI (@mui/material) - existing dependency
- React - existing dependency
- CSS custom properties (design tokens) - existing system

## Risks and Mitigation

### Risk 1: `!important` Overuse
**Risk:** Using `!important` can make future CSS changes difficult  
**Mitigation:** 
- Use `!important` only where necessary
- Document why `!important` is needed
- Consider alternative solutions for future improvements

### Risk 2: Browser Cache Issues
**Risk:** Users may not see changes due to cached CSS  
**Mitigation:**
- Provide clear cache clearing instructions
- Consider cache-busting strategies for production
- Document super-reload procedure

### Risk 3: Material-UI Updates
**Risk:** Future Material-UI updates may change default styles  
**Mitigation:**
- Document current Material-UI version
- Test after Material-UI updates
- Consider theme customization as long-term solution

## Future Enhancements

### Enhancement 1: Custom Badge Component
Replace Material-UI Chip with custom div-based badge component for better control.

**Benefits:**
- No CSS specificity conflicts
- Better performance
- Full styling control

**Effort:** Medium (2-4 hours)

### Enhancement 2: Material-UI Theme Customization
Use Material-UI's theme system to customize Chip component globally.

**Benefits:**
- No `!important` needed
- Follows Material-UI best practices
- Consistent with Material-UI patterns

**Effort:** Medium (3-5 hours)

### Enhancement 3: Automated Visual Regression Testing
Implement visual regression tests to catch similar issues early.

**Benefits:**
- Prevent future visibility issues
- Catch CSS conflicts automatically
- Improve overall quality

**Effort:** High (1-2 days)

## Acceptance Testing

### Test Case 1: Badge Visibility
1. Navigate to public properties page
2. Verify badges are visible on all property cards
3. Verify badges are in top-left corner of images
4. Verify badges have correct colors

**Expected Result:** All badges visible with correct styling

### Test Case 2: Cross-Browser Compatibility
1. Test in Chrome, Firefox, Safari, Edge
2. Verify badges are visible in all browsers
3. Verify styling is consistent

**Expected Result:** Consistent appearance across browsers

### Test Case 3: Mobile Responsiveness
1. Test on mobile devices (iOS, Android)
2. Verify badges are visible and properly sized
3. Verify badges don't overlap with other elements

**Expected Result:** Badges work correctly on mobile

### Test Case 4: Cache Clearing
1. Clear browser cache
2. Perform super-reload (Ctrl+Shift+R)
3. Verify badges are still visible

**Expected Result:** Badges remain visible after cache clear

### Test Case 5: Diagnostic Tool
1. Open diagnostic HTML page
2. Run diagnostic script
3. Verify script detects badges correctly
4. Verify script reports no issues

**Expected Result:** Diagnostic tool works correctly

## Glossary

- **Badge**: A small label displaying the property type
- **CSS Specificity**: The rules that determine which CSS styles are applied when multiple rules target the same element
- **Material-UI**: A popular React UI component library
- **Chip**: Material-UI's component for displaying small pieces of information
- **z-index**: CSS property that controls the stacking order of elements
- **Super-reload**: Browser feature that bypasses cache (Ctrl+Shift+R)

## References

- [Material-UI Chip Documentation](https://mui.com/material-ui/react-chip/)
- [CSS Specificity MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/Specificity)
- [CSS !important MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/important)

---

**Created:** 2026-01-05  
**Status:** Implementation Complete  
**Priority:** High  
**Complexity:** Low
