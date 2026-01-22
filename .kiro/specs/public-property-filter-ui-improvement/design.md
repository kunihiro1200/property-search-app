# Filter Section Layout Design

## Overview
This document describes the design decisions for moving the filter section into the page header on the public properties page.

## Design Goals

1. **Unified Filter Location**: Consolidate all filtering controls in one logical location
2. **Improved Discoverability**: Make filters easy to find and use
3. **Visual Hierarchy**: Clear separation between filters (header) and results (main content)
4. **Responsive Design**: Ensure filters work well on all screen sizes
5. **Accessibility**: Maintain proper semantic HTML and ARIA attributes

## Layout Structure

### Before
```
Header
├── Title
├── Search bar
└── Property type buttons only

Main Content
├── Filter section (price, age)
└── Property grid
```

### After
```
Header
├── Title
├── Search bar
└── Complete filter section
    ├── Property type buttons
    ├── Price range filter
    └── Age range filter

Main Content
└── Property grid
```

## Visual Design

### Filter Section Container
- **Background**: Light gray (`bg-gray-50`)
- **Border**: 1px solid gray-200 with rounded corners
- **Padding**: 16px (p-4)
- **Margin**: 24px top spacing (mt-6)

### Section Title
- **Typography**: Large, semibold (text-lg font-semibold)
- **Color**: Dark gray (text-gray-800)
- **Spacing**: 16px bottom margin (mb-4)

### Property Type Buttons
- **Layout**: Horizontal inline-flex
- **Spacing**: 8px gap between buttons
- **Wrapping**: Wrap on mobile, no-wrap on desktop
- **States**: Default, hover, active/selected

### Input Filters (Price & Age)
- **Layout**: Vertical stack with 16px gap
- **Labels**: Small, medium weight (text-sm font-medium)
- **Inputs**: Full-width with proper focus states
- **Range Separator**: Tilde (~) between min/max inputs

## Component Hierarchy

```tsx
<header>
  <div className="container">
    <h1>Title</h1>
    <p>Count</p>
    
    <div className="search-section">
      <UnifiedSearchBar />
    </div>
    
    <div className="filter-section">
      <div className="section-title">物件を絞り込む</div>
      
      <div className="property-types">
        <PropertyTypeFilterButtons />
      </div>
      
      <div className="range-filters">
        <div className="price-filter">
          <label>価格帯（万円）</label>
          <div className="range-inputs">
            <input type="number" placeholder="最低価格" />
            <span>〜</span>
            <input type="number" placeholder="最高価格" />
          </div>
        </div>
        
        <div className="age-filter">
          <label>築年数（年）</label>
          <div className="range-inputs">
            <input type="number" placeholder="最小築年数" />
            <span>〜</span>
            <input type="number" placeholder="最大築年数" />
          </div>
        </div>
      </div>
    </div>
  </div>
</header>
```

## Responsive Behavior

### Desktop (≥1024px)
- Filter section spans full width within container
- Property type buttons display in single row
- Price and age filters side by side (if space permits)

### Tablet (768px - 1023px)
- Filter section maintains full width
- Property type buttons may wrap to 2 rows
- Price and age filters stack vertically

### Mobile (<768px)
- Filter section uses full width with padding
- Property type buttons wrap as needed
- All inputs stack vertically
- Touch-friendly button sizes

## Interaction Design

### Property Type Buttons
1. **Click**: Toggle selection state
2. **Visual Feedback**: Immediate color change
3. **Multiple Selection**: Allow selecting multiple types
4. **URL Sync**: Update URL parameters on change

### Range Inputs
1. **Input Type**: Number with step validation
2. **Placeholders**: Clear min/max labels
3. **Validation**: Prevent negative values
4. **Future**: Backend integration for filtering

## Accessibility

### Semantic HTML
- Proper heading hierarchy (h1 for page title)
- Form labels associated with inputs
- Button roles and ARIA attributes

### Keyboard Navigation
- Tab order follows visual flow
- Enter key submits/toggles selections
- Focus indicators visible

### Screen Readers
- Descriptive labels for all inputs
- ARIA labels for icon buttons
- Status updates announced

## Color Palette

### Filter Section
- Background: `#F9FAFB` (gray-50)
- Border: `#E5E7EB` (gray-200)
- Title: `#1F2937` (gray-800)

### Buttons
- Default: White background, gray border
- Hover: Light blue background
- Selected: Blue background, white text

### Inputs
- Background: White
- Border: `#D1D5DB` (gray-300)
- Focus: Blue ring (ring-blue-500)

## Typography

### Section Title
- Font size: 18px (text-lg)
- Font weight: 600 (font-semibold)
- Line height: 1.5

### Input Labels
- Font size: 14px (text-sm)
- Font weight: 500 (font-medium)
- Color: `#374151` (gray-700)

### Input Text
- Font size: 16px (base)
- Font weight: 400 (normal)
- Color: `#111827` (gray-900)

## Spacing System

Using Tailwind's spacing scale:
- `gap-2`: 8px (between range inputs)
- `gap-4`: 16px (between filter sections)
- `mb-2`: 8px (label bottom margin)
- `mb-4`: 16px (section bottom margin)
- `mt-4`: 16px (search bar top margin)
- `mt-6`: 24px (filter section top margin)
- `p-4`: 16px (filter section padding)
- `py-2`: 8px vertical (input padding)
- `px-3`: 12px horizontal (input padding)

## Future Enhancements

1. **Backend Integration**: Connect price and age filters to API
2. **Clear Filters Button**: Add button to reset all filters
3. **Filter Presets**: Save common filter combinations
4. **Advanced Filters**: Add more filter options (rooms, area, etc.)
5. **Filter Count Badge**: Show number of active filters
6. **Animation**: Smooth transitions when filters change
