# Design Document

## Overview

買主詳細画面（BuyerDetailPage）において、左側の列（物件詳細カード）と右側の列（買主情報）をそれぞれ独立してスクロールできるようにします。現在は2カラムレイアウトを使用していますが、各列が独自のスクロールコンテナを持つように改修します。

## Architecture

### Current Implementation

現在の実装では、Material-UIの`Grid`コンポーネントを使用して2カラムレイアウトを実現しています：

```tsx
<Grid container spacing={2}>
  <Grid item xs={12} md={5}>
    {/* 左側: 物件詳細カード */}
  </Grid>
  <Grid item xs={12} md={7}>
    {/* 右側: 買主情報 */}
  </Grid>
</Grid>
```

この実装では、ページ全体が1つのスクロールコンテナとなっており、スクロールすると両方の列が同時に移動します。

### Proposed Architecture

新しい実装では、各列を独立したスクロールコンテナとして実装します：

1. **Fixed Height Container**: 親コンテナに固定高さを設定（ビューポート高さ - ヘッダー高さ）
2. **Independent Scroll Regions**: 各列に`overflow-y: auto`を適用
3. **Flexbox Layout**: Gridの代わりにFlexboxを使用して柔軟なレイアウトを実現

## Components and Interfaces

### 1. BuyerDetailPage Component Modifications

#### New State Variables

```typescript
// ビューポート高さを追跡
const [viewportHeight, setViewportHeight] = useState(window.innerHeight);

// スクロール位置を保存（オプション）
const [leftScrollPosition, setLeftScrollPosition] = useState(0);
const [rightScrollPosition, setRightScrollPosition] = useState(0);
```

#### New Utility Functions

```typescript
// ビューポート高さの計算
const calculateContainerHeight = () => {
  const headerHeight = 64; // AppBarの高さ
  const padding = 48; // 上下のpadding
  return window.innerHeight - headerHeight - padding;
};

// リサイズハンドラー
const handleResize = () => {
  setViewportHeight(window.innerHeight);
};
```

### 2. ScrollableColumn Component (New)

独立したスクロール列を実装するための新しいコンポーネント：

```typescript
interface ScrollableColumnProps {
  children: React.ReactNode;
  height: number;
  onScroll?: (scrollTop: number) => void;
  ariaLabel: string;
}

const ScrollableColumn: React.FC<ScrollableColumnProps> = ({
  children,
  height,
  onScroll,
  ariaLabel,
}) => {
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (onScroll) {
      onScroll(e.currentTarget.scrollTop);
    }
  };

  return (
    <Box
      role="region"
      aria-label={ariaLabel}
      tabIndex={0}
      onScroll={handleScroll}
      sx={{
        height: `${height}px`,
        overflowY: 'auto',
        overflowX: 'hidden',
        pr: 1, // スクロールバー用のpadding
        '&::-webkit-scrollbar': {
          width: '8px',
        },
        '&::-webkit-scrollbar-track': {
          backgroundColor: 'rgba(0,0,0,0.05)',
          borderRadius: '4px',
        },
        '&::-webkit-scrollbar-thumb': {
          backgroundColor: 'rgba(0,0,0,0.2)',
          borderRadius: '4px',
          '&:hover': {
            backgroundColor: 'rgba(0,0,0,0.3)',
          },
        },
      }}
    >
      {children}
    </Box>
  );
};
```

### 3. Layout Structure

```tsx
<Container maxWidth="xl" sx={{ py: 3, px: 2 }}>
  {/* ヘッダー部分（固定） */}
  <Box sx={{ mb: 3 }}>
    {/* タイトル、戻るボタンなど */}
  </Box>

  {/* 問い合わせ履歴テーブル（固定） */}
  <Paper sx={{ p: 2, mb: 3 }}>
    {/* InquiryHistoryTable */}
  </Paper>

  {/* 2カラムレイアウト（独立スクロール） */}
  <Box
    sx={{
      display: 'flex',
      gap: 2,
      height: `${containerHeight}px`,
      '@media (max-width: 900px)': {
        flexDirection: 'column',
        height: 'auto',
      },
    }}
  >
    {/* 左側の列 */}
    <Box sx={{ flex: '0 0 42%', minWidth: 0 }}>
      <ScrollableColumn
        height={containerHeight}
        ariaLabel="物件詳細カード"
        onScroll={setLeftScrollPosition}
      >
        {/* 物件カードのコンテンツ */}
      </ScrollableColumn>
    </Box>

    {/* 右側の列 */}
    <Box sx={{ flex: '1 1 58%', minWidth: 0 }}>
      <ScrollableColumn
        height={containerHeight}
        ariaLabel="買主情報"
        onScroll={setRightScrollPosition}
      >
        {/* 買主情報のコンテンツ */}
      </ScrollableColumn>
    </Box>
  </Box>

  {/* 関連買主セクション（固定） */}
  <Box sx={{ mt: 3 }}>
    {/* RelatedBuyersSection */}
  </Box>
</Container>
```

## Data Models

既存のデータモデルに変更はありません。

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Independent Scroll Behavior

*For any* scroll action on the left column, the right column's scroll position should remain unchanged, and vice versa.

**Validates: Requirements 1.1, 1.2**

### Property 2: Scroll Position Preservation

*For any* user interaction (inline editing, modal opening, tab switching) within the same page, both columns should maintain their scroll positions.

**Validates: Requirements 1.5**

### Property 3: Responsive Layout Adaptation

*For any* viewport width below the tablet breakpoint (900px), the layout should stack vertically with a single scroll container.

**Validates: Requirements 2.1, 2.2**

### Property 4: Dynamic Height Calculation

*For any* window resize event, the container height should be recalculated to match the new viewport height minus fixed elements.

**Validates: Requirements 2.3, 2.4**

### Property 5: Keyboard Navigation Support

*For any* keyboard navigation event (arrow keys, Page Up/Down), the currently focused column should scroll appropriately.

**Validates: Requirements 3.3**

### Property 6: Mouse Wheel Scroll Targeting

*For any* mouse wheel scroll event, only the column under the cursor should scroll.

**Validates: Requirements 3.4**

### Property 7: Accessibility Compliance

*For all* scrollable regions, proper ARIA labels and keyboard navigation support should be provided.

**Validates: Requirements 4.1, 4.2, 4.3**

## Error Handling

### Viewport Height Calculation Errors

- **Error**: ビューポート高さの取得に失敗
- **Handling**: デフォルト値（600px）を使用し、コンソールに警告を出力

### Scroll Position Restoration Errors

- **Error**: スクロール位置の復元に失敗
- **Handling**: 位置を0にリセットし、ユーザーに影響を与えない

### Resize Event Throttling

- **Implementation**: リサイズイベントをthrottle（200ms）して、パフォーマンスを最適化

## Testing Strategy

### Unit Tests

1. **ScrollableColumn Component Tests**
   - スクロールイベントが正しく発火するか
   - onScrollコールバックが正しく呼ばれるか
   - ARIA属性が正しく設定されているか

2. **Height Calculation Tests**
   - calculateContainerHeight関数が正しい値を返すか
   - 異なるビューポートサイズで正しく動作するか

3. **Responsive Behavior Tests**
   - ブレークポイント以下で縦積みレイアウトになるか
   - ブレークポイント以上で横並びレイアウトになるか

### Property-Based Tests

各correctness propertyに対して、最低100回の反復でテストを実行します：

1. **Property Test 1: Independent Scroll**
   - ランダムなスクロール量で左列をスクロール
   - 右列の位置が変わらないことを確認

2. **Property Test 2: Scroll Position Preservation**
   - ランダムなスクロール位置を設定
   - 様々なユーザーアクションを実行
   - スクロール位置が保持されることを確認

3. **Property Test 3: Responsive Adaptation**
   - ランダムなビューポート幅を生成
   - 適切なレイアウトが適用されることを確認

### Integration Tests

1. **End-to-End Scroll Test**
   - 実際のブラウザで左右の列を独立してスクロール
   - 各列のスクロール位置が独立していることを確認

2. **Keyboard Navigation Test**
   - キーボードで各列にフォーカス
   - 矢印キーでスクロールできることを確認

3. **Resize Behavior Test**
   - ウィンドウをリサイズ
   - レイアウトが適切に調整されることを確認

## Implementation Notes

### Performance Considerations

1. **Resize Event Throttling**: リサイズイベントは頻繁に発火するため、throttleを使用してパフォーマンスを最適化
2. **Scroll Event Optimization**: スクロールイベントも同様にthrottleを適用
3. **Virtual Scrolling**: 将来的に物件カードが多数になる場合は、react-windowなどの仮想スクロールライブラリの導入を検討

### Browser Compatibility

- Chrome, Firefox, Safari, Edgeの最新版をサポート
- スクロールバーのスタイリングはWebKit系ブラウザのみ適用（他のブラウザではデフォルトスタイル）

### Accessibility Considerations

- 各スクロール領域に適切なARIA labelを設定
- キーボードナビゲーションをサポート（Tab, Arrow keys, Page Up/Down）
- スクリーンリーダーで現在のスクロール位置を通知

### Migration Strategy

1. **Phase 1**: ScrollableColumnコンポーネントの実装とテスト
2. **Phase 2**: BuyerDetailPageへの統合（feature flagで制御）
3. **Phase 3**: ユーザーフィードバックの収集と調整
4. **Phase 4**: 本番環境へのロールアウト
