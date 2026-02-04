# サイドバーカテゴリー表示順序変更 - 設計書

## 概要

売主リストページのサイドバーにおいて、「担当(イニシャル)」カテゴリーの表示順序を最後に移動する。

---

## アーキテクチャ

### 変更対象コンポーネント

```
SellerStatusSidebar (frontend/src/components/SellerStatusSidebar.tsx)
  └── renderAllCategories() 関数
      └── カテゴリーのレンダリング順序を変更
```

### 影響範囲

**変更あり**:
- `frontend/src/components/SellerStatusSidebar.tsx` - サイドバーコンポーネント

**変更なし**:
- `backend/src/services/SellerService.supabase.ts` - バックエンドAPI
- `frontend/src/utils/sellerStatusFilters.ts` - フィルタリングロジック
- `frontend/src/pages/SellersPage.tsx` - 売主リストページ

---

## 詳細設計

### 1. renderAllCategories() 関数の変更

**ファイル**: `frontend/src/components/SellerStatusSidebar.tsx`

**現在の実装**:
```typescript
const renderAllCategories = () => {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
      {/* All */}
      <Button>All</Button>
      
      {/* 担当(イニシャル) - 現在ここ */}
      {categoryCounts?.assigneeGroups && categoryCounts.assigneeGroups.length > 0 && (
        categoryCounts.assigneeGroups.map((group) => {
          // ... 担当(イニシャル)のレンダリング
        })
      )}
      
      {/* ③当日TEL分 */}
      {renderCategoryButton('todayCall', '③当日TEL分', '#d32f2f')}
      
      {/* 当日TEL(内容別) */}
      {todayCallWithInfoGroups.map((group) => {
        // ... 当日TEL(内容別)のレンダリング
      })}
      
      {/* ⑤未査定 */}
      {renderCategoryButton('unvaluated', '⑤未査定', '#ed6c02')}
      
      {/* ⑥査定（郵送） */}
      {renderCategoryButton('mailingPending', '⑥査定（郵送）', '#0288d1')}
      
      {/* ⑦当日TEL_未着手 */}
      {renderCategoryButton('todayCallNotStarted', '⑦当日TEL_未着手', '#ff9800')}
      
      {/* ⑧Pinrich空欄 */}
      {renderCategoryButton('pinrichEmpty', '⑧Pinrich空欄', '#795548')}
    </Box>
  );
};
```

**変更後の実装**:
```typescript
const renderAllCategories = () => {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
      {/* All */}
      <Button>All</Button>
      
      {/* ③当日TEL分 */}
      {renderCategoryButton('todayCall', '③当日TEL分', '#d32f2f')}
      
      {/* 当日TEL(内容別) */}
      {todayCallWithInfoGroups.map((group) => {
        // ... 当日TEL(内容別)のレンダリング
      })}
      
      {/* ⑤未査定 */}
      {renderCategoryButton('unvaluated', '⑤未査定', '#ed6c02')}
      
      {/* ⑥査定（郵送） */}
      {renderCategoryButton('mailingPending', '⑥査定（郵送）', '#0288d1')}
      
      {/* ⑦当日TEL_未着手 */}
      {renderCategoryButton('todayCallNotStarted', '⑦当日TEL_未着手', '#ff9800')}
      
      {/* ⑧Pinrich空欄 */}
      {renderCategoryButton('pinrichEmpty', '⑧Pinrich空欄', '#795548')}
      
      {/* 担当(イニシャル) - 最後に移動 */}
      {categoryCounts?.assigneeGroups && categoryCounts.assigneeGroups.length > 0 && (
        categoryCounts.assigneeGroups.map((group) => {
          // ... 担当(イニシャル)のレンダリング
        })
      )}
    </Box>
  );
};
```

### 変更内容の詳細

**変更箇所**: `categoryCounts?.assigneeGroups`のレンダリングブロック

**変更前の位置**: 
- `<Button>All</Button>`の直後（2番目）

**変更後の位置**:
- `{renderCategoryButton('pinrichEmpty', ...)}`の直後（最後）

**変更するコード**:
```typescript
// この部分を移動
{categoryCounts?.assigneeGroups && categoryCounts.assigneeGroups.length > 0 && (
  categoryCounts.assigneeGroups.map((group) => {
    const isSelected = selectedVisitAssignee === group.initial;
    const label = `担当(${group.initial})`;
    
    return (
      <Box key={`assignee-${group.initial}`}>
        {/* 担当(イニシャル)ボタン */}
        <Button
          fullWidth
          onClick={() => {
            if (isSelected) {
              onCategorySelect?.('all', undefined);
            } else {
              setExpandedCategory(null);
              onCategorySelect?.('visitScheduled', group.initial);
            }
          }}
          sx={{ 
            justifyContent: 'space-between', 
            textAlign: 'left',
            fontSize: '0.85rem',
            py: 0.75,
            px: 1.5,
            color: isSelected ? 'white' : '#1976d2',
            bgcolor: isSelected ? '#1976d2' : 'transparent',
            borderRadius: 1,
            '&:hover': {
              bgcolor: isSelected ? '#1976d2' : '#1976d215',
            }
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <span>{label}</span>
            <Chip 
              label={group.totalCount} 
              size="small"
              sx={{ 
                height: 20, 
                fontSize: '0.7rem',
                bgcolor: isSelected ? 'rgba(255,255,255,0.3)' : undefined,
                color: isSelected ? 'white' : undefined,
              }}
            />
          </Box>
        </Button>
        
        {/* 当日TEL(イニシャル)サブカテゴリー */}
        {group.todayCallCount > 0 && (
          <Button
            fullWidth
            onClick={() => {
              const isTodayCallSelected = selectedCategory === 'todayCallAssigned' && selectedVisitAssignee === group.initial;
              if (isTodayCallSelected) {
                onCategorySelect?.('all', undefined, undefined);
              } else {
                setExpandedCategory(null);
                onCategorySelect?.('todayCallAssigned', group.initial, undefined);
              }
            }}
            sx={{ 
              justifyContent: 'space-between', 
              textAlign: 'left',
              fontSize: '0.8rem',
              py: 0.5,
              px: 1.5,
              pl: 3,  // インデント
              color: selectedCategory === 'todayCallAssigned' && selectedVisitAssignee === group.initial ? 'white' : '#ff5722',
              bgcolor: selectedCategory === 'todayCallAssigned' && selectedVisitAssignee === group.initial ? '#ff5722' : 'transparent',
              borderRadius: 1,
              '&:hover': {
                bgcolor: selectedCategory === 'todayCallAssigned' && selectedVisitAssignee === group.initial ? '#ff5722' : '#ff572215',
              }
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <span>└ 当日TEL({group.initial})</span>
              <Chip 
                label={group.todayCallCount} 
                size="small"
                sx={{ 
                  height: 18, 
                  fontSize: '0.65rem',
                  bgcolor: selectedCategory === 'todayCallAssigned' && selectedVisitAssignee === group.initial ? 'rgba(255,255,255,0.3)' : undefined,
                  color: selectedCategory === 'todayCallAssigned' && selectedVisitAssignee === group.initial ? 'white' : undefined,
                }}
              />
            </Box>
          </Button>
        )}
        
        {/* その他(イニシャル)サブカテゴリー */}
        {group.otherCount > 0 && (
          <Button
            fullWidth
            onClick={() => {
              const isOtherSelected = selectedCategory === 'visitOther' && selectedVisitAssignee === group.initial;
              if (isOtherSelected) {
                onCategorySelect?.('all', undefined, undefined);
              } else {
                setExpandedCategory(null);
                onCategorySelect?.('visitOther', group.initial, undefined);
              }
            }}
            sx={{ 
              justifyContent: 'space-between', 
              textAlign: 'left',
              fontSize: '0.8rem',
              py: 0.5,
              px: 1.5,
              pl: 3,  // インデント
              color: selectedCategory === 'visitOther' && selectedVisitAssignee === group.initial ? 'white' : '#757575',
              bgcolor: selectedCategory === 'visitOther' && selectedVisitAssignee === group.initial ? '#757575' : 'transparent',
              borderRadius: 1,
              '&:hover': {
                bgcolor: selectedCategory === 'visitOther' && selectedVisitAssignee === group.initial ? '#757575' : '#75757515',
              }
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <span>└ その他({group.initial})</span>
              <Chip 
                label={group.otherCount} 
                size="small"
                sx={{ 
                  height: 18, 
                  fontSize: '0.65rem',
                  bgcolor: selectedCategory === 'visitOther' && selectedVisitAssignee === group.initial ? 'rgba(255,255,255,0.3)' : undefined,
                  color: selectedCategory === 'visitOther' && selectedVisitAssignee === group.initial ? 'white' : undefined,
                }}
              />
            </Box>
          </Button>
        )}
      </Box>
    );
  })
)}
```

---

## データフロー

### 変更なし

データフローは変更されません。レンダリング順序のみが変更されます。

```
1. SellersPage
   ↓ categoryCounts（APIから取得）
2. SellerStatusSidebar
   ↓ renderAllCategories()
3. カテゴリーボタンのレンダリング
   ↓ 順序変更（担当を最後に）
4. ユーザーに表示
```

---

## UI/UX設計

### 変更前のUI

```
┌─────────────────────┐
│ 売主リスト          │
├─────────────────────┤
│ All            [50] │
│ 担当(Y)        [10] │ ← 現在ここ
│   └ 当日TEL(Y)  [2] │
│   └ その他(Y)   [3] │
│ 担当(I)         [8] │
│   └ 当日TEL(I)  [1] │
│ ③当日TEL分     [15] │
│ 当日TEL(夕方)   [5] │
│ ⑤未査定        [12] │
│ ⑥査定（郵送）   [3] │
│ ⑦当日TEL_未着手 [8] │
│ ⑧Pinrich空欄    [4] │
└─────────────────────┘
```

### 変更後のUI

```
┌─────────────────────┐
│ 売主リスト          │
├─────────────────────┤
│ All            [50] │
│ ③当日TEL分     [15] │
│ 当日TEL(夕方)   [5] │
│ ⑤未査定        [12] │
│ ⑥査定（郵送）   [3] │
│ ⑦当日TEL_未着手 [8] │
│ ⑧Pinrich空欄    [4] │
│ 担当(Y)        [10] │ ← 最後に移動
│   └ 当日TEL(Y)  [2] │
│   └ その他(Y)   [3] │
│ 担当(I)         [8] │
│   └ 当日TEL(I)  [1] │
└─────────────────────┘
```

### UI変更のポイント

1. **「担当(イニシャル)」が最後に表示される**
   - 他のカテゴリーが上に表示される
   - スクロールせずに主要なカテゴリーが見える

2. **サブカテゴリーは維持される**
   - 「└ 当日TEL(イニシャル)」
   - 「└ その他(イニシャル)」

3. **インデントは維持される**
   - サブカテゴリーのインデント（`pl: 3`）

---

## エラーハンドリング

### 変更なし

エラーハンドリングは変更されません。既存のロジックをそのまま使用します。

---

## パフォーマンス考慮事項

### 影響なし

レンダリング順序の変更のみのため、パフォーマンスへの影響はありません。

- ✅ レンダリング速度: 変更なし
- ✅ メモリ使用量: 変更なし
- ✅ APIコール: 変更なし

---

## セキュリティ考慮事項

### 影響なし

セキュリティへの影響はありません。

---

## テスト戦略

### 1. 単体テスト

**対象**: `renderAllCategories()` 関数

**テストケース**:
- カテゴリーの順序が正しいことを確認
- 「担当(イニシャル)」が最後に表示されることを確認

### 2. 統合テスト

**対象**: `SellerStatusSidebar` コンポーネント

**テストケース**:
- サイドバーが正しくレンダリングされることを確認
- カテゴリーのクリック動作が正常に動作することを確認

### 3. E2Eテスト

**対象**: 売主リストページ

**テストケース**:
- サイドバーのカテゴリー順序が正しいことを確認
- 「担当(イニシャル)」をクリックしてフィルタリングが正常に動作することを確認

---

## デプロイ計画

### 1. ローカル環境でのテスト

1. コードを変更
2. ローカルサーバーを起動（`npm run dev`）
3. ブラウザで動作確認

### 2. 本番環境へのデプロイ

1. Gitにコミット
2. Vercelに自動デプロイ
3. 本番環境で動作確認

---

## ロールバック計画

### 問題が発生した場合

1. Gitで前のコミットに戻す
2. Vercelに再デプロイ

**ロールバックコマンド**:
```bash
git revert HEAD
git push origin main
```

---

## 正確性プロパティ

### プロパティ1: カテゴリー順序の正確性

**プロパティ**: 「担当(イニシャル)」カテゴリーは常に最後に表示される

**検証方法**:
```typescript
// renderAllCategories()の戻り値を確認
const categories = renderAllCategories();
const lastCategory = categories.props.children[categories.props.children.length - 1];

// 最後のカテゴリーが「担当(イニシャル)」であることを確認
expect(lastCategory.key).toContain('assignee-');
```

**要件との対応**: 要件1.1

---

### プロパティ2: サブカテゴリーの表示

**プロパティ**: 「担当(イニシャル)」の下に「└ 当日TEL」「└ その他」が表示される

**検証方法**:
```typescript
// 「担当(イニシャル)」カテゴリーを確認
const assigneeCategory = screen.getByText(/担当\(Y\)/);
const todayCallSubCategory = screen.getByText(/└ 当日TEL\(Y\)/);
const otherSubCategory = screen.getByText(/└ その他\(Y\)/);

// サブカテゴリーが存在することを確認
expect(todayCallSubCategory).toBeInTheDocument();
expect(otherSubCategory).toBeInTheDocument();
```

**要件との対応**: 要件1.2

---

### プロパティ3: クリック動作の正確性

**プロパティ**: 「担当(イニシャル)」をクリックすると、該当する売主がフィルタリングされる

**検証方法**:
```typescript
// 「担当(Y)」をクリック
const assigneeButton = screen.getByText(/担当\(Y\)/);
fireEvent.click(assigneeButton);

// onCategorySelectが正しい引数で呼ばれることを確認
expect(onCategorySelect).toHaveBeenCalledWith('visitScheduled', 'Y');
```

**要件との対応**: 要件1.3

---

## 参考資料

### 関連ドキュメント
- `.kiro/steering/sidebar-status-definition.md` - サイドバーステータス定義
- `.kiro/steering/system-isolation-rule.md` - システム隔離ルール

### 関連ファイル
- `frontend/src/components/SellerStatusSidebar.tsx` - サイドバーコンポーネント
- `frontend/src/utils/sellerStatusFilters.ts` - フィルタリングロジック

---

**作成日**: 2026年2月4日  
**作成者**: システム  
**レビュー状態**: 未レビュー
