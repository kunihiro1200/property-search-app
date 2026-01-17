# Design Document

## Overview

物件詳細画面（PropertyListingDetailPage）のレイアウトを最適化し、情報の優先順位に基づいて再配置する。重要な情報を上部に配置し、詳細情報を下部に移動することで、ユーザーが効率的に物件情報を確認できるようにする。また、買主リストをコンパクトに表示し、地図を画像からURLリンクに変更することで、画面のスクロール量を削減する。さらに、価格セクションと買主リストの幅を適切に制限し、明示的な編集モードを導入することで、誤操作を防ぎながら使いやすいインターフェースを実現する。

## Architecture

### Component Structure

```
PropertyListingDetailPage
├── Header (物件番号、保存ボタン)
├── Left Column (8/12)
│   ├── PriceSection (新規 - 最優先)
│   │   ├── 売買価格
│   │   ├── 売出価格
│   │   └── 値下げ履歴
│   ├── BasicInfoSection (再構成)
│   │   ├── 物件番号
│   │   ├── 担当
│   │   ├── 種別
│   │   ├── 状況 (現況を統合)
│   │   ├── 所在地
│   │   └── その他情報の非空欄フィールド
│   ├── NotesSection (移動)
│   │   ├── 特記
│   │   └── 備忘録
│   ├── FrequentlyAskedSection (既存)
│   ├── ViewingInfoSection (既存)
│   ├── SellerBuyerInfoSection (既存)
│   ├── CommissionSection (既存)
│   ├── OfferSection (既存)
│   ├── AttachmentsSection (既存)
│   ├── MapLinkSection (変更 - iframe削除)
│   ├── OtherInfoSection (空欄フィールドのみ - 編集モード時表示)
│   └── PropertyDetailsSection (新規 - 最下部)
│       ├── 土地面積
│       ├── 建物面積
│       ├── 専有面積
│       ├── 構造
│       ├── 新築年月
│       ├── 間取り
│       ├── 契約日
│       └── 決済日
└── Right Column (4/12)
    └── CompactBuyerList (改善)
        ├── 最大5行表示
        ├── 受付日表示
        ├── 内覧日表示
        ├── 買付有無表示
        └── 展開ボタン
```

## Components and Interfaces

### 1. PriceSection (更新コンポーネント)

**Purpose**: 価格情報を最上部に表示（幅を33%に縮小）

**Props**:
```typescript
interface PriceSectionProps {
  salesPrice?: number;
  listingPrice?: number;
  priceReductionHistory?: string;
  onFieldChange: (field: string, value: any) => void;
  editedData: Record<string, any>;
  isEditMode: boolean;
  onEditToggle: () => void;
}
```

**Layout**:
- 売買価格を大きく強調表示
- 値下げ履歴を複数行で表示
- 背景色を使用して視覚的に目立たせる
- **幅を約33%に制限** (maxWidth: '400px' または flex: '0 0 33%')
- 編集ボタンを右上に配置
- 読み取り専用モードと編集モードを切り替え可能

**Width Constraint**:
```typescript
<Paper sx={{ 
  p: 3, 
  mb: 3, 
  maxWidth: '400px', // 約33%の幅
  flex: '0 0 33%',
  backgroundColor: '#f5f5f5' 
}}>
  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
    <Typography variant="h6">価格情報</Typography>
    <IconButton onClick={onEditToggle} size="small">
      {isEditMode ? <SaveIcon /> : <EditIcon />}
    </IconButton>
  </Box>
  {/* 価格フィールド */}
</Paper>
```

### 2. BasicInfoSection (再構成)

**Changes**:
- 現況フィールドを所有者の状況セクションから移動
- その他情報セクションの非空欄フィールドを統合
- 土地面積、建物面積、構造、新築年月、間取りを削除（PropertyDetailsSectionへ移動）
- 契約日、決済日を削除（PropertyDetailsSectionへ移動）

**Dynamic Fields**:
```typescript
const otherInfoFields = [
  'management_type',
  'management_company',
  'pet_consultation',
  'hot_spring',
  'deduction_usage',
  'delivery_method',
  'broker',
  'judicial_scrivener',
  'storage_location'
];

// 非空欄フィールドのみ表示
const visibleOtherFields = otherInfoFields.filter(
  field => data[field] && data[field].trim() !== ''
);
```

### 3. NotesSection (更新コンポーネント)

**Purpose**: 特記・備忘録を基本情報の直後に配置し、より大きく表示

**Changes**:
- 現在の位置から基本情報セクションの直後に移動
- 既存のスタイル（黄色背景）を維持
- **幅を約67%に拡大** (maxWidth: '800px' または flex: '0 0 67%')
- **フォントサイズを18px以上に拡大**
- 価格セクションと同じ行に配置（横並び）

**Width Constraint and Font Size**:
```typescript
<Paper sx={{ 
  p: 3, 
  mb: 3, 
  maxWidth: '800px', // 約67%の幅
  flex: '0 0 67%',
  backgroundColor: '#fffbea' // 黄色背景
}}>
  <Typography variant="h6" gutterBottom>特記・備忘録</Typography>
  <Box sx={{ mb: 2 }}>
    <Typography variant="body2" color="text.secondary" gutterBottom>
      特記
    </Typography>
    <Typography variant="body1" sx={{ fontSize: '18px', lineHeight: 1.8 }}>
      {specialNotes || '-'}
    </Typography>
  </Box>
  <Box>
    <Typography variant="body2" color="text.secondary" gutterBottom>
      備忘録
    </Typography>
    <Typography variant="body1" sx={{ fontSize: '18px', lineHeight: 1.8 }}>
      {memo || '-'}
    </Typography>
  </Box>
</Paper>
```

### 4. CompactBuyerList (改善)

**Purpose**: 買主リストをコンパクトに表示

**Props**:
```typescript
interface CompactBuyerListProps {
  buyers: BuyerWithDetails[];
  propertyNumber: string;
  maxInitialDisplay?: number; // デフォルト: 5
}

interface BuyerWithDetails {
  id: number;
  name: string;
  buyer_number: string;
  reception_date?: string;
  viewing_date?: string;
  has_offer: boolean;
  inquiry_confidence?: string;
  phone_number?: string;
  email?: string;
}
```

**Features**:
- 初期表示は5行まで
- 各行に受付日、内覧日、買付有無を表示
- 「すべて表示」ボタンで全件表示
- コンパクトなレイアウト
- **幅を約50%に制限** (右カラムの50%)

**Width Constraint**:
```typescript
<Paper sx={{ 
  p: 2, 
  maxWidth: '400px', // 右カラムの約50%
  width: '100%'
}}>
  <Typography variant="h6" gutterBottom>買主リスト</Typography>
  {/* 買主リスト */}
</Paper>
```

**Layout**:
```typescript
<Box>
  <Typography variant="caption" color="text.secondary">
    受付: {formatDate(buyer.reception_date)}
  </Typography>
  <Typography variant="caption" color="text.secondary" sx={{ ml: 2 }}>
    内覧: {formatDate(buyer.viewing_date)}
  </Typography>
  {buyer.has_offer && (
    <Chip label="買付有" size="small" color="success" sx={{ ml: 1 }} />
  )}
</Box>
```

### 5. MapLinkSection (変更)

**Purpose**: 地図をURLリンクのみで表示

**Changes**:
- iframeによる埋め込み地図を削除
- URLをクリッカブルなリンクとして表示
- 新しいタブで開く

**Implementation**:
```typescript
{data.google_map_url && (
  <Box sx={{ mb: 2 }}>
    <Typography variant="body2" color="text.secondary" gutterBottom>
      Google Map
    </Typography>
    <Link
      href={data.google_map_url}
      target="_blank"
      rel="noopener noreferrer"
      sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
    >
      <MapIcon />
      地図を開く
    </Link>
  </Box>
)}
```

### 6. PropertyDetailsSection (新規コンポーネント)

**Purpose**: 物件の物理的詳細情報を最下部に配置

**Props**:
```typescript
interface PropertyDetailsSectionProps {
  data: PropertyListing;
  editedData: Record<string, any>;
  onFieldChange: (field: string, value: any) => void;
}
```

**Fields**:
- 土地面積
- 建物面積
- 専有面積
- 構造
- 新築年月
- 間取り
- 契約日
- 決済日

### 7. OtherInfoSection (変更)

**Purpose**: 空欄フィールドを編集モード時のみ表示

**Changes**:
- 非空欄フィールドは BasicInfoSection に統合
- 空欄フィールドのみを表示
- 編集モードでのみ表示（通常時は非表示）

**Implementation**:
```typescript
const [editMode, setEditMode] = useState(false);

const emptyOtherFields = otherInfoFields.filter(
  field => !data[field] || data[field].trim() === ''
);

{editMode && emptyOtherFields.length > 0 && (
  <Paper sx={{ p: 3, mb: 3 }}>
    <Typography variant="h6" gutterBottom>
      その他情報（未入力項目）
    </Typography>
    {/* 空欄フィールドの入力欄 */}
  </Paper>
)}
```

### 8. OwnerSituationSection (削除)

**Purpose**: 所有者の状況セクションを削除し、重複情報を排除

**Changes**:
- 所有者の状況セクション全体を削除
- 現況フィールドは既に BasicInfoSection に統合済み
- 所有者関連情報は SellerBuyerInfoSection で表示
- このセクションのコンポーネントファイルは削除不要（存在しない場合）

### 9. EditableSection (新規共通コンポーネント)

**Purpose**: 各セクションに編集モード機能を提供する共通コンポーネント

**Props**:
```typescript
interface EditableSectionProps {
  title: string;
  isEditMode: boolean;
  onEditToggle: () => void;
  onSave: () => Promise<void>;
  onCancel: () => void;
  children: React.ReactNode;
  maxWidth?: string;
}
```

**Features**:
- 読み取り専用モードと編集モードの切り替え
- 編集ボタン、保存ボタン、キャンセルボタンの表示制御
- 保存時のローディング状態管理
- キャンセル時の確認ダイアログ（変更がある場合）

**Implementation**:
```typescript
const EditableSection: React.FC<EditableSectionProps> = ({
  title,
  isEditMode,
  onEditToggle,
  onSave,
  onCancel,
  children,
  maxWidth
}) => {
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave();
      onEditToggle(); // 保存後に読み取り専用モードに戻る
    } catch (error) {
      console.error('Save failed:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Paper sx={{ p: 3, mb: 3, maxWidth }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">{title}</Typography>
        <Box>
          {!isEditMode ? (
            <IconButton onClick={onEditToggle} size="small" title="編集">
              <EditIcon />
            </IconButton>
          ) : (
            <>
              <IconButton 
                onClick={handleSave} 
                size="small" 
                disabled={isSaving}
                title="保存"
                color="primary"
              >
                {isSaving ? <CircularProgress size={20} /> : <SaveIcon />}
              </IconButton>
              <IconButton 
                onClick={onCancel} 
                size="small" 
                disabled={isSaving}
                title="キャンセル"
              >
                <CancelIcon />
              </IconButton>
            </>
          )}
        </Box>
      </Box>
      {children}
    </Paper>
  );
};
```

**Usage Example**:
```typescript
<EditableSection
  title="価格情報"
  isEditMode={isPriceEditMode}
  onEditToggle={() => setIsPriceEditMode(!isPriceEditMode)}
  onSave={handleSavePrice}
  onCancel={handleCancelPrice}
  maxWidth="600px"
>
  <PriceFields isEditMode={isPriceEditMode} data={data} onChange={handleChange} />
</EditableSection>
```

## Data Models

### PropertyListing (既存)

変更なし。既存のインターフェースを使用。

### BuyerWithDetails (拡張)

```typescript
interface BuyerWithDetails extends Buyer {
  reception_date?: string;
  viewing_date?: string;
  has_offer: boolean;
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Section Order Consistency

*For any* property detail page render, the sections should appear in the following order from top to bottom: Price → Basic Info → Notes → Frequently Asked → Viewing Info → Seller/Buyer Info → Commission → Offer → Attachments → Map Link → Property Details

**Validates: Requirements 1.1, 1.2, 1.3, 3.1-3.7, 5.1**

### Property 2: Buyer List Display Limit

*For any* buyer list with more than 5 entries, the initial display should show exactly 5 buyers with an expand option visible

**Validates: Requirements 2.1, 2.5**

### Property 3: Buyer Entry Completeness

*For any* displayed buyer entry, the entry should include reception date, viewing date, and purchase offer status fields

**Validates: Requirements 2.2, 2.3, 2.4**

### Property 4: Map Display Format

*For any* property with a Google Maps URL, the map should be displayed as a clickable link and not as an embedded iframe

**Validates: Requirements 4.1, 4.2, 4.3**

### Property 5: Other Info Field Visibility

*For any* field in the other information section, if the field value is non-empty then it should appear in the basic information section, otherwise it should only appear in edit mode

**Validates: Requirements 1.4, 1.5**

### Property 6: Current Status Integration

*For any* property detail page, the current status field from the owner situation section should appear in the basic information section

**Validates: Requirements 1.3**

### Property 7: Property Details Position

*For any* property detail page, the fields (land area, building area, construction date, structure, floor plan, contract date, settlement date) should appear in the property details section at the bottom of the page

**Validates: Requirements 3.1-3.7**

### Property 8: Price Information Priority

*For any* property detail page, the price reduction history and sale price should appear at the top of the page before all other sections

**Validates: Requirements 1.1**

### Property 9: Notes Position

*For any* property detail page, the special notes and memo fields should appear immediately after the basic information section

**Validates: Requirements 1.2**

### Property 10: Page Height Reduction

*For any* property detail page render, the total scrollable height should be at least 30% less than the original layout

**Validates: Requirements 5.4**

### Property 11: Price Section Width Constraint

*For any* price section render, the section width should be constrained to approximately 33% of the available container width (maxWidth: 400px)

**Validates: Requirements 6.1, 6.3, 9.1**

### Property 12: Buyer List Width Constraint

*For any* buyer list render, the list width should be constrained to approximately 50% of the right column width (maxWidth: 400px)

**Validates: Requirements 6.2, 6.4**

### Property 13: Default Read-Only Mode

*For any* property detail page load, all sections should be displayed in read-only mode by default

**Validates: Requirements 7.1**

### Property 14: Edit Mode Activation

*For any* section with an edit button, clicking the edit button should enable edit mode and display input fields

**Validates: Requirements 7.2, 7.3**

### Property 15: Save and Return to Read-Only

*For any* section in edit mode, clicking the save button should persist the data and return the section to read-only mode

**Validates: Requirements 7.4**

### Property 16: Cancel and Discard Changes

*For any* section in edit mode, clicking the cancel button should discard changes and return the section to read-only mode without saving

**Validates: Requirements 7.5**

### Property 17: Notes Section Width and Font Size

*For any* notes section render, the section width should be constrained to approximately 67% of the available container width (maxWidth: 800px) and the font size should be at least 18px

**Validates: Requirements 9.2, 9.3, 9.4**

### Property 18: Price and Notes Side-by-Side Layout

*For any* property detail page render, the price section and notes section should be displayed side by side in the same row

**Validates: Requirements 9.5**

### Property 19: Owner Situation Section Removal

*For any* property detail page render, the owner situation section should not be displayed

**Validates: Requirements 10.1, 10.2**

## Error Handling

### Missing Data

- 空欄フィールドは「-」で表示
- 買主リストが空の場合は適切なメッセージを表示
- 地図URLがない場合はセクション自体を非表示

### API Errors

- 買主データの取得失敗時はエラーメッセージを表示
- 保存失敗時はスナックバーでエラーを通知

### Invalid Data

- 日付フィールドの不正な値は「-」で表示
- 数値フィールドの不正な値は「-」で表示

## Testing Strategy

### Unit Tests

1. **PriceSection Component**
   - 価格情報の正しい表示
   - 値下げ履歴の複数行表示
   - 編集機能の動作
   - 幅制限の適用 (maxWidth: 600px)

2. **CompactBuyerList Component**
   - 5行制限の動作
   - 展開ボタンの表示/非表示
   - 受付日、内覧日、買付有無の表示
   - 幅制限の適用 (maxWidth: 400px)

3. **PropertyDetailsSection Component**
   - 全フィールドの表示
   - 編集機能の動作

4. **OtherInfoSection Visibility**
   - 非空欄フィールドの非表示
   - 編集モード時の表示

5. **EditableSection Component**
   - 読み取り専用モードと編集モードの切り替え
   - 保存ボタンのクリックでデータ永続化
   - キャンセルボタンのクリックで変更破棄
   - ローディング状態の表示

### Integration Tests

1. **Section Order**
   - セクションの表示順序の検証

2. **Data Flow**
   - 編集データの保存
   - APIからのデータ取得

### Visual Regression Tests

1. **Layout Comparison**
   - 新旧レイアウトのスクリーンショット比較
   - スクロール量の測定

### Property-Based Tests

Property-based testing will use `@fast-check/jest` library for TypeScript/React.

1. **Property 1: Section Order Consistency**
   - Generate random property data
   - Render component
   - Verify section order using DOM queries

2. **Property 2: Buyer List Display Limit**
   - Generate buyer lists of varying sizes (0-20)
   - Verify initial display shows max 5 items
   - Verify expand button appears when > 5

3. **Property 3: Buyer Entry Completeness**
   - Generate random buyer data
   - Verify all required fields are rendered

4. **Property 4: Map Display Format**
   - Generate properties with/without map URLs
   - Verify no iframe elements when URL exists
   - Verify link element exists

5. **Property 5: Other Info Field Visibility**
   - Generate properties with various other info fields
   - Verify non-empty fields in basic info
   - Verify empty fields only in edit mode

6. **Property 11: Price Section Width Constraint**
   - Generate random property data
   - Render PriceSection
   - Verify maxWidth style is applied (600px)

7. **Property 12: Buyer List Width Constraint**
   - Generate random buyer lists
   - Render CompactBuyerList
   - Verify maxWidth style is applied (400px)

8. **Property 13: Default Read-Only Mode**
   - Generate random property data
   - Render page
   - Verify all sections are in read-only mode (no input fields visible)

9. **Property 14: Edit Mode Activation**
   - Generate random property data
   - Click edit button on a section
   - Verify input fields appear

10. **Property 15: Save and Return to Read-Only**
    - Generate random property data
    - Enter edit mode and modify data
    - Click save button
    - Verify data is persisted and section returns to read-only mode

11. **Property 16: Cancel and Discard Changes**
    - Generate random property data
    - Enter edit mode and modify data
    - Click cancel button
    - Verify changes are discarded and section returns to read-only mode

## Performance Considerations

### Rendering Optimization

- 買主リストの仮想化（react-window）は不要（最大5行表示）
- 地図iframeの削除により初期ロード時間を短縮
- セクションの遅延ロードは不要（全体が軽量）

### Layout Optimization

- Grid layoutの最適化
- 不要な余白の削減
- コンパクトなコンポーネントレイアウト

## Migration Strategy

### Phase 1: Component Creation

1. EditableSectionコンポーネントの作成（共通編集モード機能）
2. PriceSectionコンポーネントの作成（幅制限付き）
3. CompactBuyerListコンポーネントの作成（幅制限付き）
3. PropertyDetailsSectionコンポーネントの作成

### Phase 2: Layout Restructuring

1. セクションの順序変更
2. BasicInfoSectionの再構成
3. NotesSection の移動
4. MapLinkSectionの変更

### Phase 3: Testing & Refinement

1. ユニットテストの実行
2. ビジュアルレグレッションテストの実行
3. スクロール量の測定と検証

## Accessibility

- すべてのインタラクティブ要素にキーボードアクセス
- 適切なARIAラベルの使用
- コントラスト比の確保
- スクリーンリーダー対応

## Browser Compatibility

- Chrome (最新版)
- Firefox (最新版)
- Safari (最新版)
- Edge (最新版)
