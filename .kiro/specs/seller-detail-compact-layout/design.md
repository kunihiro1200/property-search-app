# Design Document - 売主詳細画面コンパクトレイアウト

## Overview

売主詳細画面を1画面に収まるコンパクトなレイアウトに改善し、電話対応時などに素早く情報を確認できるようにする。また、各セクションに編集・保存ボタンを追加し、セクション単位で編集できるようにする。

### Current Issues
- 情報が縦に長く配置されており、スクロールが必要
- 買主リストが可変高さで、多い場合に他の情報が画面外に押し出される
- 全セクションが常に編集可能な状態で、誤操作のリスクがある
- 保存ボタンが1つしかなく、どのセクションを保存するのか不明確

### Design Goals
- 重要情報を1画面（スクロールなし）に表示
- 買主リストを固定高さ（5行分）にして、内部スクロール可能に
- フォントサイズを小さくして情報密度を向上
- 各セクションに編集・保存ボタンを配置
- デフォルトは閲覧モードで、編集時のみ入力フィールドを表示

## Architecture

### Component Structure

```
SellerDetailPage
├─ Header (戻るボタン、タイトル、ステータスチップ)
├─ ValuationSection (査定情報 - 大きく表示)
├─ Grid Container (2カラムレイアウト)
│   ├─ Left Column
│   │   ├─ ManagementInfoSection (管理情報 - 編集可能)
│   │   └─ PropertyInfoSection (物件情報 - 編集可能)
│   └─ Right Column
│       ├─ BuyerListSection (買主リスト - 固定高さ)
│       └─ SellerInfoSection (売主情報 - 編集可能)
├─ CollapsibleSection (Google Chat通知)
├─ CollapsibleSection (訪問査定予約)
├─ CollapsibleSection (AI電話統合)
├─ CollapsibleSection (追客ログ)
├─ CollapsibleSection (業務依頼)
└─ CollapsibleSection (メール送信履歴)
```

### Layout Strategy

**Desktop (>1200px):**
- 2カラムレイアウト
- 左: 管理情報 + 物件情報
- 右: 買主リスト + 売主情報
- セクション間パディング: 8-12px

**Tablet (768px-1200px):**
- 1カラムレイアウト
- 縦積み表示
- セクション間パディング: 8-12px

**Mobile (<768px):**
- 1カラムレイアウト
- さらにコンパクトなフォントサイズ
- セクション間パディング: 6-8px

## Components and Interfaces

### 1. EditableSection (New Component)

各セクションの編集機能を提供する再利用可能なコンポーネント。

**Location**: `frontend/src/components/EditableSection.tsx`

**Props**:
```typescript
interface EditableSectionProps {
  title: string;
  isEditing: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: () => void;
  saving?: boolean;
  children: React.ReactNode;
  editContent: React.ReactNode;
}
```

**Features**:
- セクションヘッダーに編集/キャンセルボタンを表示
- 編集モード時は保存ボタンも表示
- 読み取り専用モードと編集モードを切り替え
- 保存中はローディングインジケーターを表示

**State Management**:
```typescript
interface EditableSectionState {
  isEditing: boolean;
  saving: boolean;
}
```

### 2. CompactBuyerList (New Component)

固定高さの買主リストコンポーネント。

**Location**: `frontend/src/components/CompactBuyerList.tsx`

**Props**:
```typescript
interface CompactBuyerListProps {
  buyers: Buyer[];
  loading: boolean;
  propertyNumber: string;
}
```

**Features**:
- 最大高さ: 300-350px
- 内部スクロール可能
- 各買主を1行で表示（氏名、受付日、内覧日、買付有無）
- 空の場合は「買主なし」を表示
- スクロール可能な場合は下部にフェード効果

**Display Format**:
```
[氏名] | 受付: 2025/01/10 | 内覧: 2025/01/15 | 買付: あり
```

### 3. CompactPropertyInfo (Modified Component)

コンパクトな物件情報表示コンポーネント。

**Location**: `frontend/src/components/CompactPropertyInfo.tsx`

**Props**:
```typescript
interface CompactPropertyInfoProps {
  property: PropertyInfo;
  isEditing: boolean;
  editedData: Partial<PropertyInfo>;
  onFieldChange: (field: string, value: any) => void;
}
```

**Features**:
- 小さいフォントサイズ（ラベル: 11-12px、値: 13-14px）
- 上部: 住所、種別、土地面積、間取り
- 下部: 建物面積、築年、構造、契約日、決済日
- 空フィールドは非表示
- 編集モード時のみ入力フィールドを表示

### 4. CollapsibleSection (New Component)

折りたたみ可能なセクションコンポーネント。

**Location**: `frontend/src/components/CollapsibleSection.tsx`

**Props**:
```typescript
interface CollapsibleSectionProps {
  title: string;
  count?: number; // 件数表示用
  defaultExpanded?: boolean;
  children: React.ReactNode;
}
```

**Features**:
- デフォルトは折りたたみ状態
- ヘッダークリックで展開/折りたたみ
- 件数がある場合は「タイトル (N件)」と表示
- スムーズなアニメーション

## Data Models

### EditingState (New)

各セクションの編集状態を管理。

```typescript
interface SectionEditingState {
  sellerInfo: boolean;
  propertyInfo: boolean;
  managementInfo: boolean;
}

interface EditedData {
  seller: Partial<Seller>;
  property: Partial<PropertyInfo>;
  management: {
    status?: SellerStatus;
    confidence?: ConfidenceLevel;
    nextCallDate?: string;
    assignedTo?: string;
    email?: string;
    competitorName?: string;
    exclusiveOtherDecisionFactors?: string[];
    otherDecisionCountermeasure?: string;
    contractYearMonth?: string;
    exclusiveOtherDecisionMeeting?: string;
  };
}
```

### BuyerDisplayData (New)

買主リスト表示用の簡略データ。

```typescript
interface BuyerDisplayData {
  id: string;
  name: string;
  inquiryDate: string; // "2025/01/10"
  viewingDate?: string; // "2025/01/15"
  hasPurchaseOffer: boolean;
  confidenceLevel: string; // "A", "B", "C"
}
```

## Styling Guidelines

### Typography

**Valuation Section:**
- 金額: 18-20px, font-weight: 600
- ラベル: 12px, color: text.secondary

**Section Headers:**
- タイトル: 16-18px, font-weight: 600
- ボタン: small size

**Property Info:**
- ラベル: 11-12px, color: text.secondary
- 値: 13-14px, color: text.primary

**Buyer List:**
- 各項目: 13px
- 日付: 12px, color: text.secondary

**Other Sections:**
- 標準フォントサイズを維持（14px）

### Spacing

**Section Padding:**
- Desktop: 12px (現在の24pxから削減)
- Tablet: 10px
- Mobile: 8px

**Section Margin:**
- Desktop: 8-12px
- Tablet: 8px
- Mobile: 6px

**Grid Spacing:**
- Desktop: spacing={2} (16px)
- Tablet/Mobile: spacing={1.5} (12px)

### Colors

**Buyer Confidence Badges:**
- A: green (#4caf50)
- B: blue (#2196f3)
- C: orange (#ff9800)

**Edit Mode Indicator:**
- 編集中のセクション: border-left: 3px solid primary.main

**Collapsible Sections:**
- 背景: grey.50
- ボーダー: grey.300

## State Management

### Page-Level State

```typescript
interface SellerDetailPageState {
  // Data
  seller: Seller | null;
  property: PropertyInfo | null;
  buyers: Buyer[];
  
  // Loading states
  loading: boolean;
  buyersLoading: boolean;
  
  // Editing states
  editingStates: SectionEditingState;
  editedData: EditedData;
  
  // Saving states
  savingSection: 'seller' | 'property' | 'management' | null;
  
  // UI states
  expandedSections: Record<string, boolean>;
  error: string | null;
  successMessage: string | null;
}
```

### Edit Flow

1. **Enter Edit Mode:**
   - User clicks "編集" button
   - Set `editingStates[section] = true`
   - Initialize `editedData[section]` with current values
   - Render input fields

2. **Field Change:**
   - Update `editedData[section][field]`
   - Keep original data unchanged

3. **Save:**
   - Set `savingSection = section`
   - Call API with `editedData[section]`
   - On success:
     - Reload section data
     - Set `editingStates[section] = false`
     - Clear `editedData[section]`
     - Show success message
   - On error:
     - Keep edit mode active
     - Show error message
     - Preserve `editedData[section]`

4. **Cancel:**
   - Set `editingStates[section] = false`
   - Clear `editedData[section]`
   - Revert to original data

## API Integration

### Section-Specific Save Endpoints

**Seller Info:**
```typescript
PUT /api/sellers/:id
Body: {
  name: string;
  address: string;
  phoneNumber: string;
}
```

**Property Info:**
```typescript
PUT /api/properties/:id
Body: {
  address: string;
  propertyType: string;
  landArea: number;
  buildingArea: number;
  buildYear: number;
  floorPlan: string;
}
```

**Management Info:**
```typescript
PUT /api/sellers/:id
Body: {
  status: SellerStatus;
  confidence: ConfidenceLevel;
  nextCallDate: string;
  assignedTo: string;
  email: string;
  competitorName: string;
  exclusiveOtherDecisionFactors: string[];
  otherDecisionCountermeasure: string;
  contractYearMonth: string;
  exclusiveOtherDecisionMeeting: string;
}
```

## Responsive Behavior

### Breakpoints

```typescript
const breakpoints = {
  mobile: 0,
  tablet: 768,
  desktop: 1200,
};
```

### Layout Adjustments

**Desktop (>1200px):**
- 2カラムグリッド
- 左カラム: 7/12
- 右カラム: 5/12

**Tablet (768-1200px):**
- 1カラムレイアウト
- 全幅表示

**Mobile (<768px):**
- 1カラムレイアウト
- フォントサイズをさらに削減（-1px）
- パディングを最小化

## Performance Considerations

### Optimization Strategies

1. **React.memo for Sections:**
   - Wrap each section component with React.memo
   - Prevent unnecessary re-renders when other sections change

2. **Lazy Loading for Collapsible Sections:**
   - Load content only when section is expanded
   - Use React.lazy for heavy components

3. **Debounced Field Changes:**
   - Debounce text input changes (300ms)
   - Immediate updates for select/checkbox

4. **Buyer List Virtualization:**
   - If buyer count > 20, use react-window for virtualization
   - Render only visible rows

## Accessibility

### Keyboard Navigation

- Tab: Move between sections and buttons
- Enter: Activate edit/save/cancel buttons
- Escape: Cancel edit mode

### ARIA Labels

```typescript
<Button aria-label="売主情報を編集">編集</Button>
<Button aria-label="変更をキャンセル">キャンセル</Button>
<Button aria-label="変更を保存">保存</Button>
```

### Screen Reader Support

- Announce edit mode changes
- Announce save success/error
- Provide context for collapsed sections

## Migration Strategy

### Phase 1: Layout Restructuring
- Implement 2-column layout
- Reduce font sizes and spacing
- Move less important sections to collapsible areas

### Phase 2: Buyer List Optimization
- Create CompactBuyerList component
- Implement fixed height with internal scrolling
- Update buyer display format

### Phase 3: Edit Mode Implementation
- Create EditableSection component
- Implement section-specific editing states
- Add edit/save/cancel buttons to each section

### Phase 4: Testing and Refinement
- Test on different screen sizes
- Verify all edit/save flows
- Optimize performance
- Gather user feedback

## Testing Strategy

### Unit Tests
- EditableSection component behavior
- CompactBuyerList rendering
- CollapsibleSection expand/collapse
- State management functions

### Integration Tests
- Edit mode activation/deactivation
- Save flow for each section
- Cancel flow and data reversion
- Error handling

### Visual Regression Tests
- Layout at different breakpoints
- Font sizes and spacing
- Collapsible section animations
- Edit mode visual indicators

### Manual Testing
- Phone call simulation workflow
- Edit multiple sections sequentially
- Cancel without saving
- Save with validation errors
- Responsive behavior on real devices
