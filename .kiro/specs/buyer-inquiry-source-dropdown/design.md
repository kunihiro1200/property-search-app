# Design Document

## Overview

買主詳細ページの「問合せ元」フィールドを、テキスト入力からドロップダウン選択に変更する機能の設計。Material-UIのAutocompleteコンポーネントを使用し、38個の定義済み選択肢をカテゴリ別にグループ化して表示する。検索機能により、ユーザーは素早く目的の選択肢を見つけることができる。

## Architecture

### Component Structure

```
BuyerDetailPage
  └─ InquirySourceSelect (新規作成)
       └─ MUI Autocomplete
            ├─ TextField (入力フィールド)
            └─ Popper (ドロップダウンメニュー)
                 └─ ListSubheader (カテゴリヘッダー)
```

### Data Flow

1. ユーザーがドロップダウンをクリック
2. Autocompleteコンポーネントが選択肢リストを表示
3. ユーザーが検索または選択
4. 選択値がBuyerDetailPageのstateに反映
5. 保存時にAPIを通じてバックエンドに送信

## Components and Interfaces

### 1. InquirySourceOptions Constant

**ファイル**: `frontend/src/utils/buyerInquirySourceOptions.ts`

```typescript
export interface InquirySourceOption {
  value: string;
  label: string;
  category: string;
}

export const INQUIRY_SOURCE_CATEGORIES = [
  '電話系',
  'メール系',
  '配信系',
  '来店',
  '売主',
  'Pinrich系',
  'その他',
] as const;

export type InquirySourceCategory = typeof INQUIRY_SOURCE_CATEGORIES[number];

export const INQUIRY_SOURCE_OPTIONS: InquirySourceOption[] = [
  // 電話系
  { value: '電話(at home)', label: '電話(at home)', category: '電話系' },
  { value: '電話(スーモ)', label: '電話(スーモ)', category: '電話系' },
  { value: '電話(HOME\'S/goo)', label: '電話(HOME\'S/goo)', category: '電話系' },
  { value: '電話(いふうHP)', label: '電話(いふうHP)', category: '電話系' },
  { value: '電話(看板)', label: '電話(看板)', category: '電話系' },
  { value: '電話(チラシ)', label: '電話(チラシ)', category: '電話系' },
  { value: '電話(流入元不明)', label: '電話(流入元不明)', category: '電話系' },
  { value: '電話(業者)', label: '電話(業者)', category: '電話系' },
  
  // メール系
  { value: 'メール(at home)', label: 'メール(at home)', category: 'メール系' },
  { value: 'メール(スーモ)', label: 'メール(スーモ)', category: 'メール系' },
  { value: 'メール(いふうHP)', label: 'メール(いふうHP)', category: 'メール系' },
  { value: 'メール(チラシ)', label: 'メール(チラシ)', category: 'メール系' },
  { value: 'メール(看板)', label: 'メール(看板)', category: 'メール系' },
  { value: 'メール(流入元不明)', label: 'メール(流入元不明)', category: 'メール系' },
  
  // 配信系
  { value: '公開前配信メール', label: '公開前配信メール', category: '配信系' },
  { value: '値下げ配信メール', label: '値下げ配信メール', category: '配信系' },
  
  // 来店
  { value: '来店', label: '来店', category: '来店' },
  
  // 売主
  { value: '売主', label: '売主', category: '売主' },
  
  // Pinrich系
  { value: 'ピンリッチ(at home)', label: 'ピンリッチ(at home)', category: 'Pinrich系' },
  { value: 'ピンリッチ(スーモ)', label: 'ピンリッチ(スーモ)', category: 'Pinrich系' },
  { value: 'ピンリッチ(いふうHP)', label: 'ピンリッチ(いふうHP)', category: 'Pinrich系' },
  { value: 'ピンリッチ(内覧)', label: 'ピンリッチ(内覧)', category: 'Pinrich系' },
  { value: 'ピンリッチ(売主)', label: 'ピンリッチ(売主)', category: 'Pinrich系' },
  { value: 'ピンリッチ(チラシ)', label: 'ピンリッチ(チラシ)', category: 'Pinrich系' },
  { value: 'ピンリッチ(看板)', label: 'ピンリッチ(看板)', category: 'Pinrich系' },
  { value: 'ピンリッチ(電話)', label: 'ピンリッチ(電話)', category: 'Pinrich系' },
  { value: 'ピンリッチ(メール署名欄)', label: 'ピンリッチ(メール署名欄)', category: 'Pinrich系' },
  { value: 'ピンリッチ(物件問合せ)', label: 'ピンリッチ(物件問合せ)', category: 'Pinrich系' },
  { value: 'ピンリッチ(不明)', label: 'ピンリッチ(不明)', category: 'Pinrich系' },
  
  // その他
  { value: '全く不明', label: '全く不明', category: 'その他' },
  { value: '知合', label: '知合', category: 'その他' },
  { value: '配信希望', label: '配信希望', category: 'その他' },
  { value: 'アンケート', label: 'アンケート', category: 'その他' },
  { value: '2件目以降', label: '2件目以降', category: 'その他' },
  { value: '紹介', label: '紹介', category: 'その他' },
];

// カテゴリ別にグループ化されたオプションを取得
export const getGroupedInquirySourceOptions = (): InquirySourceOption[] => {
  return INQUIRY_SOURCE_OPTIONS;
};

// 特定のカテゴリのオプションを取得
export const getInquirySourceOptionsByCategory = (
  category: InquirySourceCategory
): InquirySourceOption[] => {
  return INQUIRY_SOURCE_OPTIONS.filter(option => option.category === category);
};
```

### 2. BuyerDetailPage Modification

**ファイル**: `frontend/src/pages/BuyerDetailPage.tsx`

**変更点**:
- `inquiry_source`フィールドの表示ロジックを変更
- 編集モード時にAutocompleteコンポーネントを使用
- 表示モード時は従来通りテキスト表示

**実装例**:
```typescript
import { Autocomplete } from '@mui/material';
import { INQUIRY_SOURCE_OPTIONS } from '../utils/buyerInquirySourceOptions';

// FIELD_SECTIONSの問合せ・内覧情報セクション内
{field.key === 'inquiry_source' && isEditing ? (
  <Autocomplete
    fullWidth
    size="small"
    options={INQUIRY_SOURCE_OPTIONS}
    groupBy={(option) => option.category}
    getOptionLabel={(option) => option.label}
    value={INQUIRY_SOURCE_OPTIONS.find(opt => opt.value === value) || null}
    onChange={(_, newValue) => handleFieldChange(field.key, newValue?.value || '')}
    renderInput={(params) => (
      <TextField
        {...params}
        placeholder="問合せ元を選択"
        sx={{ mt: 0.5 }}
      />
    )}
    renderGroup={(params) => (
      <li key={params.key}>
        <Typography
          component="div"
          sx={{
            position: 'sticky',
            top: -8,
            padding: '4px 10px',
            color: 'primary.main',
            backgroundColor: 'background.paper',
            fontWeight: 'bold',
            fontSize: '0.875rem',
          }}
        >
          {params.group}
        </Typography>
        <ul style={{ padding: 0 }}>{params.children}</ul>
      </li>
    )}
  />
) : field.key === 'inquiry_source' ? (
  <Typography variant="body2">
    {formatValue(value, field.type)}
  </Typography>
) : (
  // 既存のTextField実装
)}
```

## Data Models

### InquirySourceOption Interface

```typescript
interface InquirySourceOption {
  value: string;      // データベースに保存される値
  label: string;      // UIに表示されるラベル
  category: string;   // カテゴリ名（グループ化に使用）
}
```

### Buyer Interface (既存)

```typescript
interface Buyer {
  id: string;
  buyer_number: string;
  name: string;
  inquiry_source: string;  // この値がドロップダウンで選択される
  // ... その他のフィールド
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Dropdown displays all options
*For any* inquiry source dropdown, when opened, all 38 predefined options should be available for selection
**Validates: Requirements 1.2**

### Property 2: Selected value updates state
*For any* option selected from the dropdown, the inquiry_source field in the buyer state should be updated with the selected value
**Validates: Requirements 1.3**

### Property 3: Category grouping is maintained
*For any* set of inquiry source options, they should be grouped by their category property, and category headers should appear in the correct order
**Validates: Requirements 2.1, 2.2**

### Property 4: Search filters options correctly
*For any* search query entered in the dropdown, only options whose labels contain the search query (case-insensitive) should be displayed
**Validates: Requirements 3.2**

### Property 5: Options constant is importable
*For any* component that needs inquiry source options, importing INQUIRY_SOURCE_OPTIONS from the utility file should provide access to all 38 options with their category information
**Validates: Requirements 4.1, 4.2, 4.3**

## Error Handling

### Invalid Value Handling

- **既存データとの互換性**: データベースに定義外の値が存在する場合、ドロップダウンには表示されないが、テキストとして表示される
- **空値の処理**: inquiry_sourceがnullまたは空文字の場合、プレースホルダー「問合せ元を選択」が表示される

### UI Error States

- **ネットワークエラー**: 保存時のエラーはSnackbarで表示（既存の実装を使用）
- **バリデーションエラー**: 現時点では必須フィールドではないため、空値も許可

## Testing Strategy

### Unit Tests

1. **InquirySourceOptions Constant Tests**
   - 38個の選択肢が正しく定義されているか
   - 各選択肢にvalue, label, categoryが存在するか
   - カテゴリが正しく分類されているか

2. **Component Rendering Tests**
   - Autocompleteコンポーネントが正しくレンダリングされるか
   - 編集モードと表示モードで適切なコンポーネントが表示されるか
   - カテゴリヘッダーが正しく表示されるか

3. **User Interaction Tests**
   - ドロップダウンを開いたときに全選択肢が表示されるか
   - 選択肢を選択したときにstateが更新されるか
   - 検索機能が正しく動作するか

### Integration Tests

1. **BuyerDetailPage Integration**
   - 買主詳細ページで問合せ元フィールドが正しく表示されるか
   - 編集→保存のフローが正常に動作するか
   - 既存データが正しく表示されるか

### Manual Testing Checklist

1. ドロップダウンを開いて全38選択肢が表示されることを確認
2. カテゴリ別にグループ化されていることを確認
3. 検索機能で選択肢がフィルタリングされることを確認
4. 選択肢を選択して保存できることを確認
5. 保存後、選択した値が正しく表示されることを確認
6. 既存データ（定義外の値を含む）が正しく表示されることを確認

## Implementation Notes

### Material-UI Autocomplete Features

- **groupBy**: カテゴリ別にオプションをグループ化
- **renderGroup**: カテゴリヘッダーのカスタマイズ
- **getOptionLabel**: 表示ラベルの取得
- **filterOptions**: デフォルトの検索機能（日本語対応）

### Performance Considerations

- 選択肢は38個と少ないため、パフォーマンス最適化は不要
- 定数として定義することで、再レンダリング時の再計算を回避

### Accessibility

- Autocompleteコンポーネントは標準でARIA属性をサポート
- キーボードナビゲーション（↑↓キーで選択、Enterで確定）が可能
- スクリーンリーダー対応

## Future Enhancements

1. **バックエンドバリデーション**: 定義外の値を拒否するバリデーションの追加
2. **選択肢の動的管理**: 管理画面から選択肢を追加・編集できる機能
3. **使用頻度の表示**: よく使われる選択肢を上位に表示
4. **カスタム値の許可**: 定義外の値も入力できるオプション（freeSolo）
