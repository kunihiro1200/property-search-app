# Design Document - 物件詳細フルページ表示

## Overview

現在の物件詳細表示はモーダルダイアログで実装されているが、お客様からの急な電話対応時には以下の問題がある：
- 新規買主作成時に物件情報が見えなくなる
- よく聞かれる項目（内覧前伝達事項、固定資産税等）を確認しながらの入力が困難
- 画面が小さく情報が見づらい

本設計では、ブラウザ全体を使用した専用ページを作成し、物件詳細と買主作成フォームを同時に表示できるようにする。

## Architecture

### Current Architecture (Modal-based)
```
PropertyListingsPage
  └─ PropertyListingDetailModal (Dialog)
      ├─ Tabs (基本情報、売主、買主、手数料、詳細)
      └─ BuyerTable
```

### New Architecture (Full-page)
```
PropertyListingsPage
  └─ (Click) → Navigate to PropertyListingDetailPage

PropertyListingDetailPage (/property-listings/:propertyNumber)
  ├─ Header (Back button, Property Number, Save button)
  ├─ FrequentlyAskedSection (目立つ表示)
  ├─ MainContent (2-column layout)
  │   ├─ Left Column (Property Details)
  │   │   ├─ BasicInfoSection
  │   │   ├─ SellerInfoSection
  │   │   ├─ FinanceSection
  │   │   └─ DetailSection
  │   └─ Right Column (Buyer Management)
  │       ├─ BuyerListSection
  │       └─ NewBuyerFormPanel (collapsible)
  └─ Footer (Action buttons)
```

## Components and Interfaces

### 1. PropertyListingDetailPage (New Component)

**Location**: `frontend/src/pages/PropertyListingDetailPage.tsx`

**Props**: None (uses URL parameter)

**State**:
```typescript
interface PropertyListingDetailPageState {
  propertyNumber: string;
  data: PropertyListing | null;
  loading: boolean;
  saving: boolean;
  editedData: Record<string, any>;
  buyers: Buyer[];
  buyersLoading: boolean;
  showBuyerForm: boolean;
  snackbar: { open: boolean; message: string; severity: 'success' | 'error' };
}
```

**Key Methods**:
- `fetchPropertyData()`: 物件データを取得
- `fetchBuyers()`: 買主リストを取得
- `handleSave()`: 物件情報を保存
- `handleFieldChange(field, value)`: フィールド変更を処理
- `handleBuyerCreated()`: 買主作成後の処理
- `handleBack()`: 物件リストページに戻る

### 2. FrequentlyAskedSection (New Component)

**Location**: `frontend/src/components/FrequentlyAskedSection.tsx`

**Props**:
```typescript
interface FrequentlyAskedSectionProps {
  data: PropertyListing;
  onFieldChange: (field: string, value: any) => void;
  editedData: Record<string, any>;
}
```

**Display Fields**:
- 内覧前伝達事項 (pre_viewing_notes) - Large text area
- 固定資産税 (property_tax) - Prominent number display
- 管理費 (management_fee) - Prominent number display
- 積立金 (reserve_fund) - Prominent number display
- 駐車場 (parking) - Text display
- 引渡し (delivery) - Text display

**Styling**:
- Large fonts (18-24px for values)
- High contrast colors
- Card-based layout with clear labels
- Quick-scan friendly design

### 3. PropertyDetailSection (New Component)

**Location**: `frontend/src/components/PropertyDetailSection.tsx`

**Props**:
```typescript
interface PropertyDetailSectionProps {
  title: string;
  data: PropertyListing;
  fields: FieldDefinition[];
  onFieldChange: (field: string, value: any) => void;
  editedData: Record<string, any>;
}

interface FieldDefinition {
  label: string;
  field: string;
  type: 'text' | 'number' | 'date' | 'textarea';
  gridSize?: number; // 1-12 for responsive grid
}
```

### 4. BuyerManagementPanel (New Component)

**Location**: `frontend/src/components/BuyerManagementPanel.tsx`

**Props**:
```typescript
interface BuyerManagementPanelProps {
  propertyNumber: string;
  buyers: Buyer[];
  loading: boolean;
  showForm: boolean;
  onToggleForm: () => void;
  onBuyerCreated: () => void;
}
```

**Features**:
- Collapsible buyer creation form
- Buyer list with confidence indicators
- Quick actions (view, edit, delete)
- Auto-refresh after creation

### 5. InlineBuyerForm (New Component)

**Location**: `frontend/src/components/InlineBuyerForm.tsx`

**Props**:
```typescript
interface InlineBuyerFormProps {
  propertyNumber: string;
  onSuccess: () => void;
  onCancel: () => void;
}
```

**Features**:
- Compact form layout
- Pre-filled property number
- Validation
- Save/Cancel actions

## Data Models

### PropertyListing (Existing, Extended)

```typescript
interface PropertyListing {
  // Existing fields...
  
  // New/highlighted fields for frequently asked section
  pre_viewing_notes?: string;
  property_tax?: number;
  management_fee?: number;
  reserve_fund?: number;
  parking?: string;
  delivery?: string;
  
  // All other existing fields remain
}
```

### PageState (New)

```typescript
interface PropertyListPageState {
  filters: {
    selectedAssignee: string | null;
    selectedStatus: string | null;
    buyerFilter: 'all' | 'hasBuyers' | 'highConfidence';
    searchQuery: string;
  };
  pagination: {
    page: number;
    rowsPerPage: number;
  };
}
```

State preservation using:
- Session Storage for temporary state
- URL query parameters for shareable state

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Navigation preserves state
*For any* property list page state (filters, pagination), when navigating to property detail and back, the property list state should be restored exactly
**Validates: Requirements 1.4, 1.5**

### Property 2: Buyer creation updates list
*For any* valid buyer data, when a buyer is created from the property detail page, the buyer list should immediately reflect the new buyer without page reload
**Validates: Requirements 3.5, 4.4**

### Property 3: Field changes are tracked
*For any* editable field, when the user modifies the value, the save button should become enabled and the edited value should be preserved until save or cancel
**Validates: Requirements 5.1, 5.2, 5.5**

### Property 4: URL routing is consistent
*For any* property number, accessing `/property-listings/:propertyNumber` should load the same property details regardless of entry point
**Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5**

### Property 5: Responsive layout adapts
*For any* screen width, the layout should adjust appropriately (side-by-side for desktop, stacked for tablet, single column for mobile) without losing functionality
**Validates: Requirements 8.1, 8.2, 8.3, 8.4, 8.5**

## Error Handling

### Network Errors
- Display user-friendly error messages
- Retry mechanism for failed requests
- Preserve user input on save failure

### Invalid Property Number
- Show 404 page with link back to property list
- Log error for debugging

### Validation Errors
- Inline field validation
- Clear error messages
- Prevent save with invalid data

### Concurrent Edits
- Optimistic UI updates
- Conflict detection on save
- User notification of conflicts

## Testing Strategy

### Unit Tests
- Component rendering tests
- Field validation logic
- State management functions
- URL parameter parsing
- Date/price formatting functions

### Integration Tests
- Navigation flow (list → detail → back)
- Buyer creation workflow
- Save and refresh cycle
- Filter state preservation
- Responsive layout changes

### Manual Testing
- Phone call simulation workflow
- Multi-tab behavior
- Browser back/forward buttons
- Different screen sizes
- Keyboard navigation

## Implementation Notes

### State Management
- Use React Router for navigation
- Session Storage for temporary state preservation
- URL query parameters for shareable state
- Local component state for form data

### Performance Considerations
- Lazy load buyer list
- Debounce field changes
- Optimize re-renders with React.memo
- Cache property data

### Accessibility
- Keyboard navigation support
- ARIA labels for screen readers
- Focus management
- High contrast mode support

### Mobile Considerations
- Touch-friendly button sizes (min 44x44px)
- Swipe gestures for navigation
- Collapsible sections to save space
- Sticky header for context

## Migration Strategy

### Phase 1: Create New Page
- Implement PropertyListingDetailPage
- Add route to App.tsx
- Keep existing modal for backward compatibility

### Phase 2: Update Navigation
- Update PropertyListingsPage to navigate to new page
- Add state preservation logic
- Test navigation flows

### Phase 3: Deprecate Modal
- Remove PropertyListingDetailModal component
- Clean up unused code
- Update documentation

### Phase 4: Optimize
- Performance tuning
- User feedback incorporation
- Mobile optimization
