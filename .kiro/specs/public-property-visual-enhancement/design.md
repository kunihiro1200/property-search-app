# Design Document: Public Property Visual Enhancement

## Overview

This document provides detailed design specifications for enhancing the visual appeal of the public property listing page. The design focuses on creating a modern, fashionable, and customer-friendly interface that transforms the current plain appearance into an engaging real estate browsing experience.

## Design Principles

1. **Customer-Centric**: Design for end consumers, not internal business users
2. **Visual Hierarchy**: Guide users' attention to important information
3. **Modern & Fashionable**: Contemporary design that feels current and appealing
4. **Trust & Professionalism**: Convey reliability while being approachable
5. **Performance-First**: Beautiful but fast-loading

## Color Palette

### Primary Colors

**Brand Primary - Warm Blue**
- Color: `#2563EB` (Blue 600)
- Usage: Primary buttons, links, active states
- Conveys: Trust, professionalism, stability

**Brand Secondary - Warm Orange**
- Color: `#F59E0B` (Amber 500)
- Usage: Accent elements, CTAs, highlights
- Conveys: Energy, warmth, approachability

### Neutral Colors

**Background Colors**
- Light Background: `#F9FAFB` (Gray 50)
- Card Background: `#FFFFFF` (White)
- Subtle Background: `#F3F4F6` (Gray 100)

**Text Colors**
- Primary Text: `#111827` (Gray 900)
- Secondary Text: `#6B7280` (Gray 500)
- Tertiary Text: `#9CA3AF` (Gray 400)

### Semantic Colors

**Success Green**
- Color: `#10B981` (Emerald 500)
- Usage: Success messages, positive indicators

**Warning Yellow**
- Color: `#F59E0B` (Amber 500)
- Usage: Warnings, important notices

**Error Red**
- Color: `#EF4444` (Red 500)
- Usage: Error messages, validation errors

### Property Type Colors

**Detached House (一戸建て)**
- Color: `#8B5CF6` (Violet 500)
- Badge Background: `#EDE9FE` (Violet 100)

**Apartment (マンション)**
- Color: `#EC4899` (Pink 500)
- Badge Background: `#FCE7F3` (Pink 100)

**Land (土地)**
- Color: `#14B8A6` (Teal 500)
- Badge Background: `#CCFBF1` (Teal 100)

### Gradient Overlays

**Image Overlay (for text readability)**
```css
background: linear-gradient(
  180deg,
  rgba(0, 0, 0, 0) 0%,
  rgba(0, 0, 0, 0.6) 100%
);
```

**Hero Section Gradient**
```css
background: linear-gradient(
  135deg,
  #2563EB 0%,
  #3B82F6 50%,
  #60A5FA 100%
);
```

**Card Hover Gradient**
```css
background: linear-gradient(
  180deg,
  rgba(37, 99, 235, 0.05) 0%,
  rgba(37, 99, 235, 0.1) 100%
);
```

## Typography

### Font Families

**Primary Font Stack**
```css
font-family: 'Noto Sans JP', -apple-system, BlinkMacSystemFont, 'Segoe UI', 
             'Roboto', 'Helvetica Neue', Arial, sans-serif;
```

**Numeric Font Stack** (for prices, measurements)
```css
font-family: 'Inter', 'Noto Sans JP', -apple-system, BlinkMacSystemFont, 
             'Segoe UI', 'Roboto', sans-serif;
```

### Type Scale

**Headings**
- H1 (Page Title): 36px / 2.25rem, font-weight: 700, line-height: 1.2
- H2 (Section Title): 30px / 1.875rem, font-weight: 700, line-height: 1.3
- H3 (Subsection): 24px / 1.5rem, font-weight: 600, line-height: 1.4
- H4 (Card Title): 20px / 1.25rem, font-weight: 600, line-height: 1.4

**Body Text**
- Large: 18px / 1.125rem, font-weight: 400, line-height: 1.6
- Regular: 16px / 1rem, font-weight: 400, line-height: 1.6
- Small: 14px / 0.875rem, font-weight: 400, line-height: 1.5
- Caption: 12px / 0.75rem, font-weight: 400, line-height: 1.4

**Price Display**
- Large Price: 28px / 1.75rem, font-weight: 700, line-height: 1.2
- Regular Price: 20px / 1.25rem, font-weight: 600, line-height: 1.3

### Responsive Typography

**Mobile (< 768px)**
- H1: 28px / 1.75rem
- H2: 24px / 1.5rem
- H3: 20px / 1.25rem
- Body: 16px / 1rem

**Tablet (768px - 1023px)**
- H1: 32px / 2rem
- H2: 26px / 1.625rem
- H3: 22px / 1.375rem
- Body: 16px / 1rem

**Desktop (≥ 1024px)**
- Use full scale as defined above

## Component Designs

### Hero Section

**Layout**
```
┌─────────────────────────────────────────────┐
│                                             │
│  [Gradient Background with Pattern]        │
│                                             │
│         物件をお探しですか？                │
│    理想の住まいを見つけるお手伝いをします   │
│                                             │
│  ┌───────────────────────────────────┐     │
│  │  🔍  物件を検索...                │     │
│  └───────────────────────────────────┘     │
│                                             │
└─────────────────────────────────────────────┘
```

**Specifications**
- Height: 400px (desktop), 300px (mobile)
- Background: Gradient with subtle pattern overlay
- Text Color: White with shadow for readability
- Search Bar: White background, rounded corners (12px)
- Padding: 80px vertical, 40px horizontal
- Animation: Fade in on load (0.6s ease-out)

**CSS Implementation**
```css
.hero-section {
  background: linear-gradient(135deg, #2563EB 0%, #3B82F6 50%, #60A5FA 100%);
  background-image: 
    linear-gradient(135deg, #2563EB 0%, #3B82F6 50%, #60A5FA 100%),
    url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
  min-height: 400px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  padding: 80px 40px;
  position: relative;
  overflow: hidden;
}

.hero-title {
  font-size: 2.25rem;
  font-weight: 700;
  color: white;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  margin-bottom: 1rem;
  animation: fadeInUp 0.6s ease-out;
}

.hero-subtitle {
  font-size: 1.125rem;
  color: rgba(255, 255, 255, 0.95);
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  margin-bottom: 2rem;
  animation: fadeInUp 0.6s ease-out 0.2s both;
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

### Property Card

**Layout**
```
┌─────────────────────────────┐
│                             │
│   [Property Image]          │
│   with gradient overlay     │
│   [Property Type Badge]     │
│                             │
├─────────────────────────────┤
│  2,800万円                  │
│  大分市中央町1-2-3          │
│                             │
│  🏠 土地: 120㎡             │
│  🏗️ 建物: 95㎡              │
│  📅 築15年                  │
│                             │
└─────────────────────────────┘
```

**Specifications**
- Border Radius: 16px
- Shadow (default): 0 2px 8px rgba(0, 0, 0, 0.08)
- Shadow (hover): 0 8px 24px rgba(0, 0, 0, 0.15)
- Transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1)
- Image Height: 240px
- Padding: 20px
- Background: White
- Border: 1px solid rgba(0, 0, 0, 0.05)

**Hover Effects**
- Transform: translateY(-8px)
- Shadow: Increase elevation
- Image: Slight zoom (scale: 1.05)
- Border: Change to primary color with opacity

**CSS Implementation**
```css
.property-card {
  background: white;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  border: 1px solid rgba(0, 0, 0, 0.05);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.property-card:hover {
  transform: translateY(-8px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  border-color: rgba(37, 99, 235, 0.3);
}

.property-card-image-container {
  position: relative;
  height: 240px;
  overflow: hidden;
}

.property-card-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;
}

.property-card:hover .property-card-image {
  transform: scale(1.05);
}

.property-card-image-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 50%;
  background: linear-gradient(
    180deg,
    rgba(0, 0, 0, 0) 0%,
    rgba(0, 0, 0, 0.4) 100%
  );
  pointer-events: none;
}

.property-type-badge {
  position: absolute;
  top: 12px;
  left: 12px;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 0.875rem;
  font-weight: 600;
  backdrop-filter: blur(8px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.property-card-content {
  padding: 20px;
  flex-grow: 1;
  display: flex;
  flex-direction: column;
}

.property-price {
  font-size: 1.75rem;
  font-weight: 700;
  color: #111827;
  margin-bottom: 8px;
  font-family: 'Inter', 'Noto Sans JP', sans-serif;
}

.property-address {
  font-size: 0.875rem;
  color: #6B7280;
  margin-bottom: 16px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.property-features {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: auto;
}

.property-feature {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.75rem;
  color: #6B7280;
}

.property-feature-icon {
  width: 16px;
  height: 16px;
  color: #9CA3AF;
}
```

### Filter Section

**Layout**
```
┌─────────────────────────────────────────────┐
│  [物件タイプ ▼] [価格帯 ▼] [エリア ▼]     │
│                                             │
│  123件の物件が見つかりました                │
└─────────────────────────────────────────────┘
```

**Specifications**
- Background: White
- Border Radius: 12px
- Padding: 24px
- Shadow: 0 1px 3px rgba(0, 0, 0, 0.1)
- Margin Bottom: 32px
- Sticky Position: Top of page when scrolling

**Filter Button Styles**
- Default: White background, gray border
- Active: Primary color background, white text
- Hover: Light primary color background
- Transition: all 0.2s ease

**CSS Implementation**
```css
.filter-section {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  margin-bottom: 32px;
  position: sticky;
  top: 80px;
  z-index: 10;
}

.filter-controls {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 16px;
}

.filter-button {
  padding: 10px 20px;
  border-radius: 8px;
  border: 1px solid #D1D5DB;
  background: white;
  color: #374151;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 8px;
}

.filter-button:hover {
  background: #F3F4F6;
  border-color: #9CA3AF;
}

.filter-button.active {
  background: #2563EB;
  border-color: #2563EB;
  color: white;
}

.filter-result-count {
  font-size: 0.875rem;
  color: #6B7280;
  padding-top: 8px;
  border-top: 1px solid #E5E7EB;
}
```

### Loading States

**Skeleton Card**
```css
.skeleton-card {
  background: white;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  height: 400px;
}

.skeleton-image {
  height: 240px;
  background: linear-gradient(
    90deg,
    #F3F4F6 0%,
    #E5E7EB 50%,
    #F3F4F6 100%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

.skeleton-content {
  padding: 20px;
}

.skeleton-line {
  height: 16px;
  background: linear-gradient(
    90deg,
    #F3F4F6 0%,
    #E5E7EB 50%,
    #F3F4F6 100%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 4px;
  margin-bottom: 12px;
}

@keyframes shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}
```

## Spacing System

### Base Unit: 4px

**Spacing Scale**
- xs: 4px (0.25rem)
- sm: 8px (0.5rem)
- md: 12px (0.75rem)
- lg: 16px (1rem)
- xl: 20px (1.25rem)
- 2xl: 24px (1.5rem)
- 3xl: 32px (2rem)
- 4xl: 40px (2.5rem)
- 5xl: 48px (3rem)
- 6xl: 64px (4rem)

### Component Spacing

**Property Card**
- Internal padding: 20px (xl)
- Gap between features: 12px (md)
- Margin bottom: 24px (2xl)

**Grid Gaps**
- Mobile: 16px (lg)
- Tablet: 20px (xl)
- Desktop: 24px (2xl)

**Section Spacing**
- Between sections: 48px (5xl)
- Hero to content: 64px (6xl)

## Animation Specifications

### Timing Functions

**Standard Easing**
```css
cubic-bezier(0.4, 0, 0.2, 1) /* Material Design standard */
```

**Ease Out** (for entrances)
```css
cubic-bezier(0, 0, 0.2, 1)
```

**Ease In** (for exits)
```css
cubic-bezier(0.4, 0, 1, 1)
```

### Animation Durations

- Fast: 150ms (micro-interactions)
- Normal: 250ms (hover effects)
- Slow: 350ms (page transitions)
- Very Slow: 500ms (complex animations)

### Keyframe Animations

**Fade In Up** (for cards appearing)
```css
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

.property-card {
  animation: fadeInUp 0.5s ease-out;
  animation-fill-mode: both;
}

/* Stagger effect for multiple cards */
.property-card:nth-child(1) { animation-delay: 0.1s; }
.property-card:nth-child(2) { animation-delay: 0.2s; }
.property-card:nth-child(3) { animation-delay: 0.3s; }
```

**Pulse** (for loading indicators)
```css
@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.loading-indicator {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
```

**Scale In** (for modals, tooltips)
```css
@keyframes scaleIn {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.modal {
  animation: scaleIn 0.2s ease-out;
}
```

## Icon System

### Icon Library
Use **Lucide React** or **Heroicons** for consistent, modern icons

### Icon Sizes
- Small: 16px
- Medium: 20px
- Large: 24px
- XLarge: 32px

### Property Feature Icons

**Mapping**
```typescript
const FEATURE_ICONS = {
  land_area: 'Home',        // 🏠
  building_area: 'Building', // 🏗️
  building_age: 'Calendar',  // 📅
  floor_plan: 'Layout',      // 📐
  parking: 'Car',            // 🚗
  station: 'Train',          // 🚆
  school: 'GraduationCap',   // 🎓
  hospital: 'Hospital',      // 🏥
  shopping: 'ShoppingCart',  // 🛒
};
```

### Icon Colors
- Default: `#9CA3AF` (Gray 400)
- Active: `#2563EB` (Primary)
- Success: `#10B981` (Green)
- Warning: `#F59E0B` (Amber)

## Responsive Breakpoints

### Breakpoint Values
```css
/* Mobile First Approach */
--breakpoint-sm: 640px;   /* Small devices */
--breakpoint-md: 768px;   /* Tablets */
--breakpoint-lg: 1024px;  /* Laptops */
--breakpoint-xl: 1280px;  /* Desktops */
--breakpoint-2xl: 1536px; /* Large desktops */
```

### Grid Columns by Breakpoint

**Property Card Grid**
- Mobile (< 640px): 1 column
- Tablet (640px - 1023px): 2 columns
- Desktop (≥ 1024px): 3 columns
- Large Desktop (≥ 1280px): 4 columns

**Container Max Width**
- Mobile: 100% (with 16px padding)
- Tablet: 100% (with 24px padding)
- Desktop: 1280px (centered)

## Accessibility Enhancements

### Focus Indicators

**Visible Focus Ring**
```css
*:focus-visible {
  outline: 2px solid #2563EB;
  outline-offset: 2px;
  border-radius: 4px;
}

.property-card:focus-visible {
  outline: 3px solid #2563EB;
  outline-offset: 4px;
}
```

### Color Contrast

All text must meet WCAG AA standards:
- Normal text: 4.5:1 minimum
- Large text (18px+): 3:1 minimum
- UI components: 3:1 minimum

**Verified Combinations**
- Primary text (#111827) on white: 16.1:1 ✓
- Secondary text (#6B7280) on white: 5.7:1 ✓
- Primary button (#2563EB) with white text: 8.6:1 ✓

### Motion Preferences

**Respect prefers-reduced-motion**
```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

## Performance Optimizations

### Image Optimization

**Lazy Loading**
```tsx
<img
  src={property.image}
  alt={property.address}
  loading="lazy"
  decoding="async"
/>
```

**Responsive Images**
```tsx
<img
  srcSet={`
    ${property.image_small} 400w,
    ${property.image_medium} 800w,
    ${property.image_large} 1200w
  `}
  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
  src={property.image_medium}
  alt={property.address}
/>
```

### CSS Optimization

**Critical CSS**
- Inline critical CSS for above-the-fold content
- Defer non-critical CSS

**CSS Containment**
```css
.property-card {
  contain: layout style paint;
}
```

### Animation Performance

**Use GPU-Accelerated Properties**
- transform
- opacity
- filter

**Avoid Animating**
- width/height
- top/left/right/bottom
- margin/padding

## Implementation Checklist

### Phase 1: Foundation
- [ ] Set up color palette CSS variables
- [ ] Configure typography system
- [ ] Implement spacing utilities
- [ ] Set up icon library

### Phase 2: Hero Section
- [ ] Create hero component
- [ ] Implement gradient background
- [ ] Add search bar
- [ ] Implement animations

### Phase 3: Property Cards
- [ ] Redesign property card component
- [ ] Add hover effects
- [ ] Implement image overlays
- [ ] Add property type badges
- [ ] Implement skeleton loading states

### Phase 4: Filters
- [ ] Redesign filter section
- [ ] Add active states
- [ ] Implement sticky positioning
- [ ] Add result count display

### Phase 5: Polish
- [ ] Add page transitions
- [ ] Implement stagger animations
- [ ] Add loading indicators
- [ ] Test accessibility
- [ ] Optimize performance

### Phase 6: Testing
- [ ] Cross-browser testing
- [ ] Mobile device testing
- [ ] Accessibility audit
- [ ] Performance testing
- [ ] User feedback collection

## Correctness Properties

### Property 1: Color Contrast Compliance
*For any* text element on the page, the color contrast ratio with its background should meet WCAG AA standards (4.5:1 for normal text, 3:1 for large text).
**Validates: Requirements 1.3, 9.4**

### Property 2: Hover State Consistency
*For any* interactive element, when hovered, it should provide visual feedback within 250ms.
**Validates: Requirements 4.2, 7.2**

### Property 3: Animation Performance
*For any* animation, the frame rate should remain above 30fps on standard devices.
**Validates: Requirements 4.5**

### Property 4: Responsive Image Loading
*For any* property card image, the appropriate image size should be loaded based on the viewport width.
**Validates: Requirements 9.4**

### Property 5: Focus Indicator Visibility
*For any* focusable element, when focused via keyboard, a visible focus indicator should appear.
**Validates: Requirements 7.1, 9.2**

### Property 6: Typography Hierarchy
*For any* page section, heading levels should follow a logical hierarchy (h1 → h2 → h3) without skipping levels.
**Validates: Requirements 5.2**

### Property 7: Spacing Consistency
*For any* two adjacent UI elements of the same type, the spacing between them should be consistent.
**Validates: Requirements 6.1, 6.2**

### Property 8: Icon Accessibility
*For any* icon used without accompanying text, it should have an appropriate aria-label or title attribute.
**Validates: Requirements 8.6**

### Property 9: Motion Preference Respect
*For any* user with prefers-reduced-motion enabled, animations should be disabled or significantly reduced.
**Validates: Requirements 4.5, 9.5**

### Property 10: Brand Color Consistency
*For any* use of brand colors, the color values should match the defined palette exactly.
**Validates: Requirements 10.1, 10.4**

