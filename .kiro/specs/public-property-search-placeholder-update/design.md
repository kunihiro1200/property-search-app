# Design Document: 検索バープレースホルダー更新

## Architecture Overview

### Component Structure
```
UnifiedSearchBar (共通コンポーネント)
├── デフォルトプレースホルダー: '所在地で検索'
└── カスタムプレースホルダーのサポート

使用箇所:
├── PublicPropertiesPage (物件一覧ページ)
├── PublicPropertyHero (ヒーローセクション)
└── その他の公開ページ
```

## Component Design

### UnifiedSearchBar Component

**Props Interface:**
```typescript
interface UnifiedSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSearch: () => void;
  placeholder?: string;  // デフォルト: '所在地で検索'
  className?: string;
}
```

**Default Behavior:**
- プレースホルダーが指定されない場合、`'所在地で検索'` を表示
- 既存のカスタムプレースホルダー機能は維持

## Implementation Details

### 変更箇所

#### 1. UnifiedSearchBar.tsx
```typescript
// Before
placeholder = '物件番号（AA12345）または所在地で検索'

// After
placeholder = '所在地で検索'
```

#### 2. PublicPropertiesPage.tsx
```typescript
// Before
<UnifiedSearchBar
  placeholder="物件番号（AA13129）または所在地で検索"
/>

// After
<UnifiedSearchBar
  placeholder="所在地で検索"
/>
```

#### 3. PublicPropertyHero.tsx
- デフォルトプレースホルダーを使用
- 変更不要

## Search Logic (変更なし)

### 検索タイプの自動判定
```typescript
// useUnifiedSearch hook
const detectSearchType = (query: string): 'property_number' | 'location' | null => {
  if (!query.trim()) return null;
  
  // AA形式の物件番号を検出
  if (/^AA\d+/.test(query.trim())) {
    return 'property_number';
  }
  
  // それ以外は所在地検索
  return 'location';
};
```

### 検索処理フロー
1. ユーザーが検索クエリを入力
2. `detectSearchType` で検索タイプを自動判定
3. 物件番号形式 → `propertyNumber` パラメータで検索
4. その他 → `location` パラメータで検索

## User Experience

### Before
```
┌─────────────────────────────────────────────────┐
│ 物件番号（AA12345）または所在地で検索  [検索]  │
└─────────────────────────────────────────────────┘
```
- 長いプレースホルダーテキスト
- 物件番号の例が表示され、一般ユーザーには不要な情報

### After
```
┌─────────────────────────────────────────────────┐
│ 所在地で検索                          [検索]  │
└─────────────────────────────────────────────────┘
```
- シンプルで明確なプレースホルダー
- 一般ユーザーにとって理解しやすい
- 物件番号検索は引き続き機能（内部機能として）

## Accessibility

### 変更なし
- `aria-label` 属性は維持
- キーボードナビゲーションは維持
- スクリーンリーダー対応は維持

## Responsive Design

### 変更なし
- モバイル表示は維持
- タブレット表示は維持
- デスクトップ表示は維持

## Testing Considerations

### Manual Testing
1. 所在地検索のテスト
   - 「大分市」などの所在地を入力
   - 検索結果が正しく表示されることを確認

2. 物件番号検索のテスト（内部機能）
   - 「AA12345」などの物件番号を入力
   - 検索結果が正しく表示されることを確認

3. プレースホルダー表示のテスト
   - すべての公開ページで「所在地で検索」が表示されることを確認

### Edge Cases
- 空の検索クエリ
- 特殊文字を含む検索クエリ
- 非常に長い検索クエリ

## Performance Impact
- パフォーマンスへの影響なし
- 文字列の変更のみ

## Security Considerations
- セキュリティへの影響なし
- 検索ロジックの変更なし

## Rollback Plan
変更が最小限のため、簡単にロールバック可能:
1. `UnifiedSearchBar.tsx` のデフォルトプレースホルダーを元に戻す
2. `PublicPropertiesPage.tsx` のカスタムプレースホルダーを元に戻す

## Future Enhancements
- 検索候補の表示（オートコンプリート）
- 検索履歴の保存
- 高度な検索フィルター
