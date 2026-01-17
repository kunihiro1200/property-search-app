# Design Document

## Overview

買主詳細ページの問合せ・内覧情報セクションに2つの新しいフィールド（latest_status、viewing_result_follow_up）を追加し、物件詳細カードを常時オープン表示に変更します。また、重複する物件詳細セクションを削除し、伝達事項フィールドを物件情報カード内に移動します。

この変更はフロントエンドのみで完結し、バックエンドAPIの変更は不要です。

## Architecture

### Component Structure

```
BuyerDetailPage
├── InquirySection (問合せ・内覧情報)
│   ├── latest_status (新規追加)
│   ├── viewing_result_follow_up (新規追加、条件付き表示)
│   └── その他既存フィールド
└── PropertyInfoCard (物件詳細カード)
    ├── 基本情報
    ├── 価格情報
    ├── pre_viewing_notes (移動)
    └── viewing_notes (移動)
```

### Data Flow

1. BuyerDetailPageがbuyerデータを取得
2. 問合せ・内覧情報セクションにlatest_statusとviewing_result_follow_upを表示
3. PropertyInfoCardにpre_viewing_notesとviewing_notesを渡して表示
4. FIELD_SECTIONSから重複する「物件詳細」セクションを削除

## Components and Interfaces

### BuyerDetailPage Component

**変更点:**
- FIELD_SECTIONSから「物件詳細」セクションを削除
- 問合せ・内覧情報セクションにlatest_statusフィールドを追加
- 問合せ・内覧情報セクションにviewing_result_follow_upフィールドを追加（viewing_dateが存在する場合のみ表示）

**実装:**
```typescript
// FIELD_SECTIONSの定義から「物件詳細」を削除
const FIELD_SECTIONS = [
  {
    title: '基本情報',
    fields: [...]
  },
  {
    title: '問合せ・内覧情報',
    fields: [
      { key: 'inquiry_source', label: '問合せ元' },
      { key: 'inquiry_date', label: '問合せ日' },
      { key: 'latest_status', label: '最新状況' }, // 新規追加
      { key: 'viewing_date', label: '内覧日' },
      { 
        key: 'viewing_result_follow_up', 
        label: '内覧結果・後続対応',
        condition: (buyer) => !!buyer.viewing_date // 条件付き表示
      }, // 新規追加
      // その他既存フィールド
    ]
  },
  // 「物件詳細」セクションを削除
  // その他のセクション
];
```

### PropertyInfoCard Component

**変更点:**
- AccordionコンポーネントをPaperコンポーネントに置き換え
- 折りたたみボタンを削除
- pre_viewing_notesとviewing_notesフィールドを追加
- 価格情報の下に伝達事項フィールドを配置

**Props Interface:**
```typescript
interface PropertyInfoCardProps {
  property: Property;
  buyer: Buyer; // pre_viewing_notes, viewing_notesを取得するため
}
```

**実装:**
```typescript
import { Paper, Typography, Box, Divider } from '@mui/material';

export const PropertyInfoCard: React.FC<PropertyInfoCardProps> = ({ 
  property, 
  buyer 
}) => {
  return (
    <Paper elevation={2} sx={{ p: 3, mb: 2 }}>
      {/* ヘッダー */}
      <Typography variant="h6" gutterBottom>
        物件詳細
      </Typography>
      
      <Divider sx={{ mb: 2 }} />
      
      {/* 基本情報 */}
      <Box sx={{ mb: 3 }}>
        {/* 既存の物件情報表示 */}
      </Box>
      
      {/* 価格情報 */}
      <Box sx={{ mb: 3 }}>
        {/* 既存の価格情報表示 */}
      </Box>
      
      {/* 伝達事項（新規追加） */}
      {(buyer.pre_viewing_notes || buyer.viewing_notes) && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            伝達事項
          </Typography>
          
          {buyer.pre_viewing_notes && (
            <Box sx={{ mb: 1 }}>
              <Typography variant="body2" color="text.secondary">
                内覧前伝達事項:
              </Typography>
              <Typography variant="body2">
                {buyer.pre_viewing_notes}
              </Typography>
            </Box>
          )}
          
          {buyer.viewing_notes && (
            <Box>
              <Typography variant="body2" color="text.secondary">
                内覧時伝達事項:
              </Typography>
              <Typography variant="body2">
                {buyer.viewing_notes}
              </Typography>
            </Box>
          )}
        </Box>
      )}
    </Paper>
  );
};
```

## Data Models

### Buyer Interface (既存に追加)

```typescript
interface Buyer {
  // 既存フィールド
  id: string;
  name: string;
  inquiry_source?: string;
  inquiry_date?: string;
  viewing_date?: string;
  pre_viewing_notes?: string;
  viewing_notes?: string;
  
  // 新規フィールド
  latest_status?: string; // 最新状況
  viewing_result_follow_up?: string; // 内覧結果・後続対応
}
```

### Database Schema

既存のbuyersテーブルに以下のカラムが存在するか確認が必要：
- `latest_status` (TEXT)
- `viewing_result_follow_up` (TEXT)

存在しない場合は、以下のマイグレーションが必要：

```sql
-- Migration: Add latest_status and viewing_result_follow_up to buyers table

ALTER TABLE buyers 
ADD COLUMN IF NOT EXISTS latest_status TEXT,
ADD COLUMN IF NOT EXISTS viewing_result_follow_up TEXT;

COMMENT ON COLUMN buyers.latest_status IS '最新状況';
COMMENT ON COLUMN buyers.viewing_result_follow_up IS '内覧結果・後続対応';
```

## Correctness Properties

*プロパティとは、システムのすべての有効な実行において真であるべき特性や動作のことです。これは、人間が読める仕様と機械で検証可能な正確性保証との橋渡しとなります。*

### Property 1: 最新状況フィールドの表示

*For any* buyer record, when the inquiry section is rendered, the latest_status field should be visible in the field list.

**Validates: Requirements 1.1, 1.2**

### Property 2: 内覧結果フィールドの条件付き表示

*For any* buyer record, the viewing_result_follow_up field should be visible if and only if the viewing_date field has a non-null value.

**Validates: Requirements 2.2, 2.3**

### Property 3: Accordionの完全削除

*For any* PropertyInfoCard component instance, the rendered output should not contain any Accordion or collapse/expand UI elements.

**Validates: Requirements 3.1, 3.2**

### Property 4: 物件詳細の単一表示

*For any* BuyerDetailPage render, property details should appear exactly once in the PropertyInfoCard component and not in FIELD_SECTIONS.

**Validates: Requirements 4.1, 4.2**

### Property 5: 伝達事項フィールドの配置

*For any* PropertyInfoCard with buyer data, pre_viewing_notes and viewing_notes should be rendered below the price information section.

**Validates: Requirements 5.3**

### Property 6: データ保持の完全性

*For any* buyer record with existing pre_viewing_notes or viewing_notes, moving these fields to PropertyInfoCard should preserve all data without loss.

**Validates: Requirements 7.1, 7.2**

### Property 7: Null値の安全な処理

*For any* buyer record with null or undefined values for latest_status, viewing_result_follow_up, pre_viewing_notes, or viewing_notes, the UI should render gracefully without errors.

**Validates: Requirements 7.3**

### Property 8: レスポンシブレイアウトの維持

*For any* screen width, the PropertyInfoCard component should maintain proper layout without horizontal scrolling or content overflow.

**Validates: Requirements 8.1, 8.2, 8.3**

## Error Handling

### Missing Field Handling

- latest_statusまたはviewing_result_follow_upがundefinedの場合、空文字列として表示
- pre_viewing_notesとviewing_notesが両方nullの場合、伝達事項セクション全体を非表示

### Conditional Rendering

```typescript
// viewing_result_follow_upの条件付き表示
{buyer.viewing_date && (
  <TextField
    label="内覧結果・後続対応"
    value={buyer.viewing_result_follow_up || ''}
    fullWidth
  />
)}

// 伝達事項セクションの条件付き表示
{(buyer.pre_viewing_notes || buyer.viewing_notes) && (
  <Box>
    {/* 伝達事項の表示 */}
  </Box>
)}
```

## Testing Strategy

### Unit Tests

1. **BuyerDetailPage Tests**
   - FIELD_SECTIONSに「物件詳細」セクションが含まれていないことを確認
   - 問合せ・内覧情報セクションにlatest_statusフィールドが含まれることを確認
   - viewing_dateがある場合にviewing_result_follow_upが表示されることを確認
   - viewing_dateがない場合にviewing_result_follow_upが非表示になることを確認

2. **PropertyInfoCard Tests**
   - Accordionコンポーネントが使用されていないことを確認
   - Paperコンポーネントが使用されていることを確認
   - pre_viewing_notesとviewing_notesが価格情報の下に表示されることを確認
   - 伝達事項が両方nullの場合、セクションが非表示になることを確認

### Property-Based Tests

各正確性プロパティに対して、最低100回の反復でテストを実行：

1. **Property 1 Test**: ランダムなbuyerデータで最新状況フィールドが常に表示されることを確認
2. **Property 2 Test**: viewing_dateの有無に応じてviewing_result_follow_upの表示が切り替わることを確認
3. **Property 3 Test**: レンダリング結果にAccordion要素が含まれないことを確認
4. **Property 4 Test**: 物件詳細が1箇所のみに表示されることを確認
5. **Property 5 Test**: 伝達事項フィールドの配置位置を確認
6. **Property 6 Test**: データ移動後も元のデータが保持されることを確認
7. **Property 7 Test**: null/undefined値で例外が発生しないことを確認
8. **Property 8 Test**: 様々な画面幅でレイアウトが崩れないことを確認

### Integration Tests

- 買主詳細ページ全体のレンダリングテスト
- 実際のbuyerデータを使用したエンドツーエンドテスト
- 既存機能への影響がないことを確認

## Implementation Notes

### Phase 1: PropertyInfoCard の変更
1. AccordionをPaperに置き換え
2. 折りたたみボタンを削除
3. 常時オープン表示のスタイリング調整

### Phase 2: BuyerDetailPage の変更
1. FIELD_SECTIONSから「物件詳細」削除
2. latest_statusフィールド追加
3. viewing_result_follow_upフィールド追加（条件付き）

### Phase 3: 伝達事項フィールドの移動
1. PropertyInfoCardにpropsとしてbuyerを追加
2. pre_viewing_notesとviewing_notesの表示ロジック実装
3. 価格情報の下に配置

### Phase 4: テストとバリデーション
1. ユニットテスト実装
2. プロパティベーステスト実装
3. 統合テスト実行
4. 手動テストとUI確認
