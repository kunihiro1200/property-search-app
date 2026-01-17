# Design Document

## Overview

This design implements a context-aware property information display system for the buyer detail page. When a user navigates from a property detail page to a buyer detail page, a comprehensive property information card will be displayed in the top-left position, providing immediate context about the property associated with the buyer. This enhances the user experience by eliminating the need to navigate back and forth between pages to reference property details.

## Architecture

### Component Structure

```
BuyerDetailPage
├── PropertyInfoCard (conditional, top-left)
│   ├── Property Status Section
│   ├── Property Details Section
│   └── Property Actions Section
├── Buyer Header Section
├── Linked Properties Table (conditional)
└── Buyer Information Sections
```

### Navigation Flow

1. User clicks on a buyer from Property Detail Page → Property ID passed via route state
2. User accesses Buyer Detail Page directly → No property context, show linked properties table
3. User navigates from Buyer List → No property context, show linked properties table

## Components and Interfaces

### 1. PropertyInfoCard Component

**Location**: `frontend/src/components/PropertyInfoCard.tsx`

**Props Interface**:
```typescript
interface PropertyInfoCardProps {
  propertyId: string;
  onClose?: () => void;
}
```

**Responsibilities**:
- Fetch full property details from API
- Display comprehensive property information in card format
- Provide navigation link to property detail page
- Handle loading and error states

### 2. Updated BuyerDetailPage Component

**Location**: `frontend/src/pages/BuyerDetailPage.tsx`

**State Management**:
```typescript
const [propertyContext, setPropertyContext] = useState<string | null>(null);
const [showPropertyCard, setShowPropertyCard] = useState(false);
```

**Layout Logic**:
- Check for property ID in route state/params on mount
- Conditionally render PropertyInfoCard or LinkedPropertiesTable
- Maintain existing buyer information sections below

### 3. Backend API Enhancement

**Endpoint**: `GET /api/property-listings/:id/full-details`

**Response Interface**:
```typescript
interface PropertyFullDetails {
  id: string;
  property_number: string;
  status: string; // atbb成約済み/非公開
  distribution_date: string; // 配信日
  address: string; // 所在地
  display_address: string; // 住居表示
  property_type: string; // 種別
  assignee_name: string; // 担当名
  sales_price: number; // 価格
  monthly_loan_payment: number; // 月々ローン支払い
  offer_status: string; // 買付有無
  price_reduction_history: string; // 値下げ履歴
  reason: string; // 理由
  suumo_url: string; // Suumo URL
  confirmation_status: string; // 確済
  // ... other fields
}
```

## Data Models

### Property Context State

```typescript
interface PropertyContext {
  propertyId: string;
  source: 'property-detail' | 'buyer-list' | 'direct';
}
```

### Route State

When navigating from Property Detail Page:
```typescript
navigate(`/buyers/${buyerId}`, {
  state: {
    propertyId: propertyId,
    source: 'property-detail'
  }
});
```

## UI/UX Design

### PropertyInfoCard Layout

```
┌─────────────────────────────────────────────┐
│ 物件情報                          [×] [→]   │
├─────────────────────────────────────────────┤
│ atbb成約済み/非公開: [value]                │
│ 配信日: [value]                             │
│ 所在地: [value]                             │
│ 住居表示: [value]                           │
│ 種別: [value]    担当名: [value]           │
│ 価格: [value]                               │
│ 月々ローン支払い: [value]                   │
│ 買付有無: [value]                           │
│ 値下げ履歴: [value]                         │
│ 理由: [value]                               │
│ Suumo URL: [link icon]                      │
│ 確済: [value]                               │
└─────────────────────────────────────────────┘
```

### Responsive Behavior

- **Desktop (>= 1024px)**: Card width 400px, fixed position top-left
- **Tablet (768px - 1023px)**: Card width 100%, stacked layout
- **Mobile (< 768px)**: Card width 100%, collapsible

## Error Handling

### Property Data Fetch Errors

1. **404 Not Found**: Display message "物件情報が見つかりません" with option to dismiss card
2. **Network Error**: Display retry button with error message
3. **Permission Error**: Display "アクセス権限がありません" message

### Fallback Behavior

If property context is provided but fetch fails:
- Log error to console
- Display error state in card
- Allow user to dismiss card
- Fall back to showing linked properties table

## Testing Strategy

### Unit Tests

1. **PropertyInfoCard Component**:
   - Renders correctly with valid property data
   - Handles loading state
   - Handles error states
   - Formats currency and dates correctly
   - External link opens correctly

2. **BuyerDetailPage Component**:
   - Detects property context from route state
   - Conditionally renders PropertyInfoCard
   - Falls back to linked properties table when no context
   - Cleans up state on unmount

### Integration Tests

1. Navigation from Property Detail Page passes correct context
2. Property data fetches correctly and displays in card
3. Card dismissal works and shows linked properties table
4. Direct navigation shows linked properties table by default

### Manual Testing Scenarios

1. Navigate from property detail page → Verify property card displays
2. Refresh buyer detail page → Verify linked properties table shows
3. Navigate from buyer list → Verify linked properties table shows
4. Test responsive behavior on different screen sizes
5. Test error states (network failure, 404, etc.)

## Performance Considerations

### Optimization Strategies

1. **Lazy Loading**: PropertyInfoCard component loaded only when needed
2. **Caching**: Cache property details in component state to avoid refetch on re-render
3. **Debouncing**: Debounce API calls if user rapidly navigates
4. **Code Splitting**: Split PropertyInfoCard into separate chunk

### API Performance

- Property details endpoint should return data within 200ms
- Implement request caching on backend (5 minute TTL)
- Use database indexes on property_number and id fields

## Security Considerations

1. **Authorization**: Verify user has permission to view property details
2. **Data Sanitization**: Sanitize all property data before display
3. **XSS Prevention**: Use React's built-in XSS protection for rendering
4. **URL Validation**: Validate Suumo URL before rendering as link

## Implementation Notes

### Phase 1: Backend API
1. Create new endpoint for full property details
2. Add authorization checks
3. Implement caching layer
4. Write unit tests

### Phase 2: PropertyInfoCard Component
1. Create component with TypeScript interfaces
2. Implement data fetching logic
3. Design card layout with Material-UI
4. Add loading and error states
5. Write component tests

### Phase 3: BuyerDetailPage Integration
1. Add property context detection logic
2. Integrate PropertyInfoCard component
3. Update navigation from Property Detail Page
4. Test integration
5. Handle edge cases

### Phase 4: Testing & Polish
1. Run full test suite
2. Test responsive behavior
3. Performance testing
4. User acceptance testing
5. Bug fixes and refinements
