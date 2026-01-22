# Design Document

## Overview

買主詳細ページを2カラムレイアウトに変更し、左側に物件情報、右側に買主情報を表示する。Material-UIのGridシステムを使用して、レスポンシブな分割レイアウトを実装する。既存のPropertyInfoCardコンポーネントを再利用し、買主に紐づく物件情報を表示する。

## Architecture

### Component Structure

```
BuyerDetailPage
  ├─ Grid Container (2カラムレイアウト)
  │   ├─ Grid Item (左側 - 40%)
  │   │   └─ PropertyInfoPanel (新規作成)
  │   │        ├─ Property Selector (複数物件がある場合)
  │   │        └─ PropertyInfoCard (既存コンポーネント)
  │   │
  │   └─ Grid Item (右側 - 60%)
  │        └─ Buyer Information Sections (既存)
  │             ├─ 基本情報
  │             ├─ 問合せ・内覧情報
  │             ├─ 希望条件
  │             └─ その他
```

### Data Flow

1. BuyerDetailPageで買主情報と紐づく物件リストを取得
2. 紐づく物件がある場合、最初の物件を選択状態にする
3. PropertyInfoPanelに選択された物件IDを渡す
4. PropertyInfoCardが物件詳細情報を表示
5. ユーザーが物件を切り替えると、選択状態を更新

## Components and Interfaces

### 1. BuyerDetailPage Modification

**ファイル**: `frontend/src/pages/BuyerDetailPage.tsx`

**変更点**:
- Gridレイアウトを使用して2カラム構造に変更
- 左側に物件情報パネル、右側に買主情報を配置
- 物件選択状態の管理を追加

**実装例**:
```typescript
const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);

// 紐づく物件を取得後、最初の物件を選択
useEffect(() => {
  if (linkedProperties.length > 0 && !selectedPropertyId) {
    setSelectedPropertyId(linkedProperties[0].id);
  }
}, [linkedProperties]);

// レイアウト構造
<Container maxWidth="xl" sx={{ py: 3 }}>
  {/* ヘッダー部分 */}
  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
    {/* ... 既存のヘッダー ... */}
  </Box>

  {/* 2カラムレイアウト */}
  <Grid container spacing={2}>
    {/* 左側: 物件情報パネル (40%) */}
    <Grid item xs={12} md={5}>
      <Box sx={{ position: 'sticky', top: 16 }}>
        <PropertyInfoPanel
          linkedProperties={linkedProperties}
          selectedPropertyId={selectedPropertyId}
          onPropertySelect={setSelectedPropertyId}
          buyerId={id}
        />
      </Box>
    </Grid>

    {/* 右側: 買主情報 (60%) */}
    <Grid item xs={12} md={7}>
      {/* 既存の買主情報セクション */}
      {FIELD_SECTIONS.map((section) => (
        <Paper key={section.title} sx={{ p: 2, mb: 2 }}>
          {/* ... 既存の実装 ... */}
        </Paper>
      ))}
    </Grid>
  </Grid>
</Container>
```

### 2. PropertyInfoPanel Component

**ファイル**: `frontend/src/components/PropertyInfoPanel.tsx` (新規作成)

**Props**:
```typescript
interface PropertyInfoPanelProps {
  linkedProperties: PropertyListing[];
  selectedPropertyId: string | null;
  onPropertySelect: (propertyId: string) => void;
  buyerId: string;
}
```

**実装**:
```typescript
export default function PropertyInfoPanel({
  linkedProperties,
  selectedPropertyId,
  onPropertySelect,
  buyerId,
}: PropertyInfoPanelProps) {
  const navigate = useNavigate();

  if (linkedProperties.length === 0) {
    return (
      <Paper sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="body1" color="text.secondary">
          紐づく物件がありません
        </Typography>
      </Paper>
    );
  }

  const selectedProperty = linkedProperties.find(p => p.id === selectedPropertyId);

  return (
    <Box>
      {/* 物件セレクター（複数物件がある場合のみ表示） */}
      {linkedProperties.length > 1 && (
        <Paper sx={{ p: 2, mb: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            紐づく物件 ({linkedProperties.length}件)
          </Typography>
          <Select
            fullWidth
            size="small"
            value={selectedPropertyId || ''}
            onChange={(e) => onPropertySelect(e.target.value)}
          >
            {linkedProperties.map((property) => (
              <MenuItem key={property.id} value={property.id}>
                {property.property_number} - {property.address}
              </MenuItem>
            ))}
          </Select>
        </Paper>
      )}

      {/* 物件情報カード */}
      {selectedPropertyId && (
        <PropertyInfoCard
          propertyId={selectedPropertyId}
          onClose={null} // 閉じるボタンは不要
          showNavigateButton={true}
          buyerContext={buyerId}
        />
      )}
    </Box>
  );
}
```

### 3. PropertyInfoCard Modification

**ファイル**: `frontend/src/components/PropertyInfoCard.tsx`

**変更点**:
- `showNavigateButton` propを追加（物件詳細ページへのリンクボタン表示制御）
- `buyerContext` propを追加（買主コンテキストを物件詳細ページに渡す）
- `onClose` propをオプショナルに変更

**Props追加**:
```typescript
interface PropertyInfoCardProps {
  propertyId: string;
  onClose?: (() => void) | null;
  showNavigateButton?: boolean;
  buyerContext?: string;
}
```

## Data Models

### PropertyListing Interface (既存)

```typescript
interface PropertyListing {
  id: string;
  property_number: string;
  address: string;
  property_type: string;
  sales_price: number;
  status: string;
  sales_assignee?: string;
}
```

### Buyer Interface (既存)

```typescript
interface Buyer {
  id: string;
  buyer_number: string;
  name: string;
  // ... その他のフィールド
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Layout displays two columns
*For any* buyer detail page, when rendered on desktop screens, the layout should display two columns with property information on the left and buyer information on the right
**Validates: Requirements 1.1, 1.2, 1.3**

### Property 2: First property is selected by default
*For any* buyer with linked properties, when the page loads, the first property in the linked properties list should be selected and displayed
**Validates: Requirements 1.4**

### Property 3: Property selector updates display
*For any* property selected from the dropdown, the property information panel should update to display the selected property's information
**Validates: Requirements 2.2**

### Property 4: Independent scrolling
*For any* buyer detail page with content exceeding viewport height, the buyer information panel should scroll independently while the property information panel remains fixed
**Validates: Requirements 3.1, 3.2**

### Property 5: Navigation preserves context
*For any* navigation from property panel to property detail page, the buyer context should be passed to enable potential back navigation
**Validates: Requirements 4.3**

## Error Handling

### No Linked Properties

- **表示**: 物件情報パネルに「紐づく物件がありません」というメッセージを表示
- **レイアウト**: 2カラムレイアウトは維持し、左側にメッセージを表示

### Property Loading Error

- **表示**: PropertyInfoCard内でエラーメッセージを表示
- **フォールバック**: 物件番号と基本情報のみを表示

### Responsive Behavior

- **モバイル**: 768px以下の画面では縦積みレイアウトに切り替え
- **タブレット**: 768px-1024pxでは左40%、右60%を維持
- **デスクトップ**: 1024px以上で最適な表示

## Testing Strategy

### Unit Tests

1. **PropertyInfoPanel Component Tests**
   - 紐づく物件がない場合のメッセージ表示
   - 単一物件の場合、セレクターが表示されないこと
   - 複数物件の場合、セレクターが表示されること
   - 物件選択時にonPropertySelectが呼ばれること

2. **BuyerDetailPage Layout Tests**
   - 2カラムレイアウトが正しくレンダリングされること
   - 物件情報と買主情報が正しい位置に表示されること
   - レスポンシブレイアウトが正しく動作すること

### Integration Tests

1. **Property Selection Flow**
   - 物件を切り替えたときに表示が更新されること
   - 物件詳細ページへの遷移が正しく動作すること
   - 買主コンテキストが正しく渡されること

### Manual Testing Checklist

1. 買主詳細ページを開いて2カラムレイアウトが表示されることを確認
2. 紐づく物件がある場合、左側に物件情報が表示されることを確認
3. 複数の紐づく物件がある場合、ドロップダウンで切り替えできることを確認
4. 買主情報が独立してスクロールできることを確認
5. 物件情報から物件詳細ページに遷移できることを確認
6. モバイル画面で縦積みレイアウトになることを確認

## Implementation Notes

### Sticky Positioning

- 物件情報パネルに`position: sticky`を適用
- `top: 16px`で上部に固定
- スクロール時も物件情報が見える状態を維持

### Grid Breakpoints

- `xs={12}`: モバイル（全幅）
- `md={5}`: タブレット以上（左側40%）
- `md={7}`: タブレット以上（右側60%）

### Performance Considerations

- PropertyInfoCardは既存コンポーネントを再利用
- 物件切り替え時のみ再レンダリング
- 大量の買主情報がある場合でもスムーズにスクロール

### Accessibility

- 物件セレクターはキーボードナビゲーション対応
- スクリーンリーダーで物件情報と買主情報の区別が可能
- フォーカス管理が適切に動作

## Future Enhancements

1. **物件情報のピン留め**: ユーザーが特定の物件をピン留めできる機能
2. **物件比較モード**: 複数の物件を並べて比較できる機能
3. **物件情報の展開/折りたたみ**: 物件情報パネルのサイズを調整できる機能
4. **買主-物件の関連性スコア**: 買主の希望条件と物件のマッチング度を表示
