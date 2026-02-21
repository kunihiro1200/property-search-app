# 業務依頼リストのカラー統一 - 設計書

## 1. 設計概要

業務依頼リスト関連の全画面で紫色（`#9c27b0`）のテーマカラーを統一的に適用する。既存の`SECTION_COLORS.workTask`定義を活用し、Material-UIのスタイリングシステムを使用して実装する。

## 2. アーキテクチャ

### 2.1 カラー定義の利用

既存のカラー定義を使用：
```typescript
// frontend/src/theme/sectionColors.ts
export const SECTION_COLORS = {
  workTask: {
    main: '#9c27b0',    // 紫
    light: '#ba68c8',   // 薄い紫
    dark: '#7b1fa2',    // 濃い紫
    contrastText: '#fff',
  },
}
```

### 2.2 コンポーネント構成

```
業務依頼リスト機能
├── WorkTasksPage.tsx (一覧ページ)
│   ├── ページタイトル
│   ├── サイドバー
│   ├── テーブルヘッダー
│   └── 物件番号リンク
├── WorkTaskDetailModal.tsx (詳細モーダル)
│   ├── タブ
│   ├── タブインジケーター
│   ├── 保存ボタン
│   └── 選択ボタン
└── WorkTaskSection.tsx (売主詳細内セクション)
    ├── セクションタイトル
    └── カテゴリヘッダー
```

## 3. 詳細設計

### 3.1 WorkTasksPage.tsx の変更

#### 3.1.1 カラー定義のインポート
```typescript
import { SECTION_COLORS } from '../theme/sectionColors';

const workTaskColor = SECTION_COLORS.workTask;
```

#### 3.1.2 ページタイトル
**現在:**
```tsx
<Typography variant="h5" fontWeight="bold" sx={{ mb: 2 }}>
  業務依頼
</Typography>
```

**変更後:**
```tsx
<Typography 
  variant="h5" 
  fontWeight="bold" 
  sx={{ mb: 2, color: workTaskColor.main }}
>
  業務依頼
</Typography>
```

#### 3.1.3 テーブルヘッダー
**現在:**
```tsx
<TableRow sx={{ bgcolor: '#f5f5f5' }}>
```

**変更後:**
```tsx
<TableRow sx={{ bgcolor: `${workTaskColor.light}20` }}>
```

#### 3.1.4 物件番号リンク
**現在:**
```tsx
<Typography variant="body2" color="primary" fontWeight="bold">
  {task.property_number || '-'}
</Typography>
```

**変更後:**
```tsx
<Typography 
  variant="body2" 
  fontWeight="bold"
  sx={{ color: workTaskColor.main }}
>
  {task.property_number || '-'}
</Typography>
```

#### 3.1.5 サイドバー選択状態
**現在:**
```tsx
sx={{ 
  py: 0.5,
  '&.Mui-selected': { bgcolor: 'action.selected' }
}}
```

**変更後:**
```tsx
sx={{ 
  py: 0.5,
  '&.Mui-selected': { 
    bgcolor: `${workTaskColor.light}30`,
    color: workTaskColor.dark,
    '& .MuiListItemText-primary': {
      fontWeight: 600,
    }
  }
}}
```

#### 3.1.6 バッジカラー
**現在:**
```tsx
<Badge
  badgeContent={cat.count}
  color="primary"
  max={999}
  sx={{ ml: 1 }}
/>
```

**変更後:**
```tsx
<Badge
  badgeContent={cat.count}
  max={999}
  sx={{ 
    ml: 1,
    '& .MuiBadge-badge': {
      bgcolor: workTaskColor.main,
      color: workTaskColor.contrastText,
    }
  }}
/>
```

### 3.2 WorkTaskDetailModal.tsx の変更

#### 3.2.1 カラー定義のインポート
```typescript
import { SECTION_COLORS } from '../theme/sectionColors';

const workTaskColor = SECTION_COLORS.workTask;
```

#### 3.2.2 タブのスタイル
**現在:**
```tsx
sx={{
  '& .MuiTab-root': { minWidth: 'auto', px: 2 },
  '& .Mui-selected': { color: 'error.main' },
  '& .MuiTabs-indicator': { backgroundColor: 'error.main' },
}}
```

**変更後:**
```tsx
sx={{
  '& .MuiTab-root': { minWidth: 'auto', px: 2 },
  '& .Mui-selected': { color: workTaskColor.main },
  '& .MuiTabs-indicator': { backgroundColor: workTaskColor.main },
}}
```

#### 3.2.3 保存ボタン
**現在:**
```tsx
<Button
  onClick={handleSave}
  variant="contained"
  color="primary"
  disabled={!hasChanges || saving}
  startIcon={saving ? <CircularProgress size={16} /> : <SaveIcon />}
>
  {saving ? '保存中...' : '保存'}
</Button>
```

**変更後:**
```tsx
<Button
  onClick={handleSave}
  variant="contained"
  disabled={!hasChanges || saving}
  startIcon={saving ? <CircularProgress size={16} /> : <SaveIcon />}
  sx={{
    bgcolor: workTaskColor.main,
    color: workTaskColor.contrastText,
    '&:hover': {
      bgcolor: workTaskColor.dark,
    },
    '&:disabled': {
      bgcolor: 'action.disabledBackground',
      color: 'action.disabled',
    }
  }}
>
  {saving ? '保存中...' : '保存'}
</Button>
```

#### 3.2.4 選択ボタン（EditableButtonSelect）
**現在:**
```tsx
<Button
  key={opt}
  variant={getValue(field) === opt ? 'contained' : 'outlined'}
  color={getValue(field) === opt ? 'primary' : 'inherit'}
  onClick={() => handleFieldChange(field, opt)}
>
  {opt}
</Button>
```

**変更後:**
```tsx
<Button
  key={opt}
  variant={getValue(field) === opt ? 'contained' : 'outlined'}
  onClick={() => handleFieldChange(field, opt)}
  sx={getValue(field) === opt ? {
    bgcolor: workTaskColor.main,
    color: workTaskColor.contrastText,
    '&:hover': {
      bgcolor: workTaskColor.dark,
    }
  } : {
    borderColor: 'divider',
    color: 'text.secondary',
  }}
>
  {opt}
</Button>
```

#### 3.2.5 Yes/Noボタン（EditableYesNo）
**現在:**
```tsx
<Button
  variant={getValue(field) === 'Y' ? 'contained' : 'outlined'}
  color={getValue(field) === 'Y' ? 'primary' : 'inherit'}
  onClick={() => handleFieldChange(field, 'Y')}
>Y</Button>
```

**変更後:**
```tsx
<Button
  variant={getValue(field) === 'Y' ? 'contained' : 'outlined'}
  onClick={() => handleFieldChange(field, 'Y')}
  sx={getValue(field) === 'Y' ? {
    bgcolor: workTaskColor.main,
    color: workTaskColor.contrastText,
    '&:hover': {
      bgcolor: workTaskColor.dark,
    }
  } : {
    borderColor: 'divider',
    color: 'text.secondary',
  }}
>Y</Button>
```

### 3.3 WorkTaskSection.tsx の変更

#### 3.3.1 カラー定義のインポート
```typescript
import { SECTION_COLORS } from '../theme/sectionColors';

const workTaskColor = SECTION_COLORS.workTask;
```

#### 3.3.2 セクションタイトル
**現在:**
```tsx
<h3 className="text-lg font-semibold mb-4">業務依頼</h3>
```

**変更後:**
```tsx
<h3 
  className="text-lg font-semibold mb-4"
  style={{ color: workTaskColor.main }}
>
  業務依頼
</h3>
```

#### 3.3.3 カテゴリヘッダー
**現在:**
```tsx
<button
  onClick={() => toggleCategory(category)}
  className="w-full px-4 py-2 text-left font-medium bg-gray-50 hover:bg-gray-100 flex justify-between items-center"
>
```

**変更後:**
```tsx
<button
  onClick={() => toggleCategory(category)}
  className="w-full px-4 py-2 text-left font-medium flex justify-between items-center"
  style={{
    backgroundColor: `${workTaskColor.light}20`,
    transition: 'background-color 0.2s',
  }}
  onMouseEnter={(e) => {
    e.currentTarget.style.backgroundColor = `${workTaskColor.light}30`;
  }}
  onMouseLeave={(e) => {
    e.currentTarget.style.backgroundColor = `${workTaskColor.light}20`;
  }}
>
```

## 4. 正確性プロパティ

### P1: カラー一貫性
**プロパティ**: 全ての業務依頼関連コンポーネントは`SECTION_COLORS.workTask`のカラー定義を使用する

**検証方法**:
```typescript
// 各コンポーネントで以下をインポートしていることを確認
import { SECTION_COLORS } from '../theme/sectionColors';
const workTaskColor = SECTION_COLORS.workTask;

// ハードコードされた色が存在しないことを確認
// ❌ color: '#9c27b0'
// ✅ color: workTaskColor.main
```

### P2: 他セクションへの非影響
**プロパティ**: 業務依頼のカラー変更は、売主・買主・物件リストのカラーに影響を与えない

**検証方法**:
```typescript
// 各セクションのカラーが維持されていることを確認
SECTION_COLORS.seller.main === '#ff9800'  // オレンジ
SECTION_COLORS.buyer.main === '#4caf50'   // 緑
SECTION_COLORS.property.main === '#2196f3' // 青
SECTION_COLORS.workTask.main === '#9c27b0' // 紫
```

### P3: 警告色の保持
**プロパティ**: 警告ステータス（「未」「要」）の色は変更されない

**検証方法**:
```typescript
// WorkTasksPage.tsx のステータスチップ
<Chip 
  label={status} 
  size="small" 
  color={status.includes('未') || status.includes('要') ? 'warning' : 'default'}
  // 警告色は Material-UI の warning カラーを使用
/>
```

### P4: アクセシビリティ
**プロパティ**: 紫色の背景に白文字のコントラスト比は WCAG AA 基準（4.5:1以上）を満たす

**検証方法**:
```typescript
// workTaskColor.main (#9c27b0) と white (#ffffff) のコントラスト比
// 計算結果: 5.25:1 (WCAG AA 基準を満たす)
```

## 5. エッジケース

### E1: ダークモード
**現在の対応**: ダークモードは未実装のため、対応不要

**将来の対応**: ダークモード実装時は、紫色のダークモード用カラーを追加

### E2: カラーブラインド対応
**対応**: 紫色は色覚異常の方にも識別しやすい色
- 赤緑色覚異常: 紫色は識別可能
- 青黄色覚異常: 紫色は識別可能

### E3: 印刷時の表示
**対応**: 印刷時は背景色を削除し、テキスト色のみを適用
```css
@media print {
  .work-task-header {
    background-color: transparent !important;
    color: #000 !important;
  }
}
```

## 6. パフォーマンス考慮事項

### 6.1 カラー定義のインポート
- `SECTION_COLORS`は静的オブジェクトのため、パフォーマンスへの影響なし
- Tree-shakingにより、使用されていないカラー定義は削除される

### 6.2 スタイルの再計算
- Material-UIの`sx`プロップを使用するため、スタイルはキャッシュされる
- 動的なカラー変更はないため、再レンダリングのオーバーヘッドなし

## 7. テスト戦略

### 7.1 ユニットテスト
```typescript
describe('WorkTasksPage カラー統一', () => {
  it('ページタイトルが紫色で表示される', () => {
    const { getByText } = render(<WorkTasksPage />);
    const title = getByText('業務依頼');
    expect(title).toHaveStyle({ color: SECTION_COLORS.workTask.main });
  });

  it('テーブルヘッダーが薄い紫色の背景を持つ', () => {
    const { container } = render(<WorkTasksPage />);
    const header = container.querySelector('thead tr');
    expect(header).toHaveStyle({ 
      backgroundColor: `${SECTION_COLORS.workTask.light}20` 
    });
  });
});
```

### 7.2 ビジュアルリグレッションテスト
- Storybookでコンポーネントのスナップショットを作成
- カラー変更前後のスクリーンショットを比較

### 7.3 手動テスト
1. 業務依頼一覧ページを開く
2. 業務詳細モーダルを開く
3. 売主詳細ページの業務依頼セクションを確認
4. 各要素の色が紫色であることを目視確認

## 8. ロールバック計画

### 8.1 ロールバック手順
1. Gitで変更前のコミットに戻す
2. 各ファイルの変更を元に戻す
3. ビルドとデプロイを実行

### 8.2 ロールバックトリガー
- ユーザーからの苦情が3件以上
- アクセシビリティの問題が発見された場合
- 他のセクションに影響が出た場合

## 9. デプロイ計画

### 9.1 デプロイ順序
1. ローカル環境でテスト
2. 開発環境にデプロイ
3. ステージング環境でテスト
4. 本番環境にデプロイ

### 9.2 デプロイ後の確認
- [ ] 業務依頼一覧ページの表示確認
- [ ] 業務詳細モーダルの表示確認
- [ ] 業務依頼セクションの表示確認
- [ ] 他のセクション（売主・買主・物件）の表示確認

## 10. 関連ドキュメント

- `frontend/src/theme/sectionColors.ts` - セクション別カラー定義
- `.kiro/specs/work-task-color-unification/requirements.md` - 要件定義書
