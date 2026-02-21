# 設計：「当日TEL（内容）」を独立した本カテゴリに変更

## 概要

「④当日TEL（内容）」という親カテゴリを削除し、各コミュニケーション情報を独立した本カテゴリとして表示する機能を実装します。

**重要**: 「当日TEL(○○)」の括弧内には今後様々な値が入る可能性があります（例: 「当日TEL(夕方)」「当日TEL(メール を優先して希望)」「当日TEL(午前中)」など）。これら全てが独立した本カテゴリとして扱われます。

---

## アーキテクチャ

### 変更対象ファイル

#### バックエンド

1. **`backend/src/services/SellerService.supabase.ts`**
   - `getSidebarCounts()`メソッドを修正
   - `todayCallWithInfo`カウントを削除
   - `todayCallWithInfoGroups`を独立したカテゴリとして扱う

2. **`backend/src/routes/sellers.ts`**
   - 変更なし（既存のフィルタリングロジックをそのまま使用）

#### フロントエンド

1. **`frontend/src/components/SellerStatusSidebar.tsx`**
   - 「④当日TEL（内容）」親カテゴリの表示を削除
   - `todayCallWithInfoGroups`を独立したカテゴリとして表示
   - 番号を削除

2. **`frontend/src/pages/SellersPage.tsx`**
   - `sidebarCounts`の型定義から`todayCallWithInfo`を削除
   - `todayCallWithInfoGroups`のみを使用

3. **`frontend/src/pages/CallModePage.tsx`**
   - 同様の変更を適用

---

## データフロー

### 1. サイドバーカウント取得

```
フロントエンド
  ↓
GET /api/sellers/sidebar-counts
  ↓
SellerService.getSidebarCounts()
  ↓
{
  todayCall: 10,
  todayCallAssigned: 5,
  todayCallWithInfoGroups: [  ← これを独立したカテゴリとして扱う
    { label: "当日TEL(夕方)", count: 1 },
    { label: "当日TEL(メール を優先して希望)", count: 2 },
    { label: "当日TEL(午前中)", count: 1 }
  ],
  ...
}
  ↓
フロントエンド（サイドバーに表示）
```

### 2. カテゴリクリック時のフィルタリング

```
ユーザーが「当日TEL(夕方)」をクリック
  ↓
onCategoryChange('todayCallWithInfo', '当日TEL(夕方)')
  ↓
URLパラメータを更新: ?category=todayCallWithInfo&todayCallWithInfoLabel=当日TEL(夕方)
  ↓
GET /api/sellers?category=todayCallWithInfo&todayCallWithInfoLabel=当日TEL(夕方)
  ↓
SellerService.listSellers({ category: 'todayCallWithInfo', todayCallWithInfoLabel: '当日TEL(夕方)' })
  ↓
フィルタリングされた売主一覧を返す
  ↓
フロントエンド（一覧に表示）
```

---

## 実装詳細

### 1. バックエンド: `SellerService.getSidebarCounts()`

**変更内容**:
- `todayCallWithInfo`カウントを削除
- `todayCallWithInfoGroups`のみを返す

**変更前**:
```typescript
return {
  todayCall: todayCallSellers.length,
  todayCallWithInfo: todayCallWithInfoSellers.length,  // ← 削除
  todayCallWithInfoGroups: this.groupTodayCallWithInfo(todayCallWithInfoSellers),
  ...
};
```

**変更後**:
```typescript
return {
  todayCall: todayCallSellers.length,
  // todayCallWithInfo を削除
  todayCallWithInfoGroups: this.groupTodayCallWithInfo(todayCallWithInfoSellers),
  ...
};
```

---

### 2. フロントエンド: `SellerStatusSidebar.tsx`

**変更内容**:
- 「④当日TEL（内容）」親カテゴリの表示を削除
- `todayCallWithInfoGroups`を独立したカテゴリとして表示
- 番号を削除

**変更前**:
```tsx
{/* ④当日TEL（内容）- 内容別にグループ化 */}
{(() => {
  if (todayCallWithInfoGroups.length === 0) return null;
  
  return (
    <Box key="todayCallWithInfo">
      {todayCallWithInfoGroups.map((group) => (
        <Button key={group.label} fullWidth onClick={...}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <span>{group.label}</span>
            <Chip label={group.count} size="small" />
          </Box>
        </Button>
      ))}
    </Box>
  );
})()}
```

**変更後**:
```tsx
{/* コミュニケーション情報別カテゴリ - 独立した本カテゴリとして表示 */}
{todayCallWithInfoGroups.map((group) => (
  <Button
    key={group.label}
    fullWidth
    variant={
      selectedCategory === 'todayCallWithInfo' &&
      selectedTodayCallWithInfoLabel === group.label
        ? 'contained'
        : 'text'
    }
    color="secondary"
    onClick={() => onCategoryChange('todayCallWithInfo', group.label)}
    sx={{
      justifyContent: 'space-between',
      textTransform: 'none',
      py: 1,
    }}
  >
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <span>{group.label}</span>
    </Box>
    <Chip
      label={group.count}
      size="small"
      color={
        selectedCategory === 'todayCallWithInfo' &&
        selectedTodayCallWithInfoLabel === group.label
          ? 'secondary'
          : 'default'
      }
    />
  </Button>
))}
```

---

### 3. フロントエンド: `SellersPage.tsx`

**変更内容**:
- `sidebarCounts`の型定義から`todayCallWithInfo`を削除

**変更前**:
```typescript
const [sidebarCounts, setSidebarCounts] = useState<{
  todayCall: number;
  todayCallWithInfo: number;  // ← 削除
  todayCallWithInfoGroups: { label: string; count: number }[];
  ...
}>({
  todayCall: 0,
  todayCallWithInfo: 0,  // ← 削除
  todayCallWithInfoGroups: [],
  ...
});
```

**変更後**:
```typescript
const [sidebarCounts, setSidebarCounts] = useState<{
  todayCall: number;
  // todayCallWithInfo を削除
  todayCallWithInfoGroups: { label: string; count: number }[];
  ...
}>({
  todayCall: 0,
  // todayCallWithInfo を削除
  todayCallWithInfoGroups: [],
  ...
});
```

---

### 4. フロントエンド: `CallModePage.tsx`

**変更内容**:
- `SellersPage.tsx`と同様の変更を適用

---

## 表示順序

サイドバーのカテゴリ表示順序：

1. ①訪問予定（イニシャル別）
2. ②訪問済み（イニシャル別）
3. ③当日TEL分
4. 当日TEL（担当）（イニシャル別）
5. **コミュニケーション情報別カテゴリ**（件数の多い順） ← 新しい位置
6. ⑤未査定
7. ⑥査定（郵送）
8. ⑦当日TEL_未着手
9. ⑧Pinrich空欄

---

## テストケース

### テストケース1: サイドバー表示

**前提条件**:
- AA4163（連絡方法: 夕方）が存在
- AA13489（連絡方法: メール を優先して希望）が存在

**期待される結果**:
- サイドバーに「当日TEL(夕方)」が表示される（件数: 1）
- サイドバーに「当日TEL(メール を優先して希望)」が表示される（件数: 1以上）
- 「④当日TEL（内容）」は表示されない

---

### テストケース2: カテゴリクリック

**前提条件**:
- サイドバーに「当日TEL(夕方)」が表示されている

**操作**:
1. 「当日TEL(夕方)」をクリック

**期待される結果**:
- 売主一覧にAA4163のみが表示される
- URLパラメータが`?category=todayCallWithInfo&todayCallWithInfoLabel=当日TEL(夕方)`になる
- 「当日TEL(夕方)」ボタンがハイライトされる

---

### テストケース3: ページリロード

**前提条件**:
- URLパラメータが`?category=todayCallWithInfo&todayCallWithInfoLabel=当日TEL(夕方)`

**操作**:
1. ページをリロード

**期待される結果**:
- 売主一覧にAA4163のみが表示される
- 「当日TEL(夕方)」ボタンがハイライトされる

---

## 正確性プロパティ

### プロパティ1: カテゴリの一意性

**プロパティ**: 各コミュニケーション情報カテゴリは一意である

**検証方法**:
```typescript
const labels = todayCallWithInfoGroups.map(g => g.label);
const uniqueLabels = new Set(labels);
assert(labels.length === uniqueLabels.size);
```

---

### プロパティ2: カウントの正確性

**プロパティ**: 各カテゴリのカウントは、実際の売主数と一致する

**検証方法**:
```typescript
for (const group of todayCallWithInfoGroups) {
  const sellers = await listSellers({
    category: 'todayCallWithInfo',
    todayCallWithInfoLabel: group.label
  });
  assert(sellers.length === group.count);
}
```

---

### プロパティ3: フィルタリングの正確性

**プロパティ**: カテゴリをクリックすると、そのカテゴリに属する売主のみが表示される

**検証方法**:
```typescript
const sellers = await listSellers({
  category: 'todayCallWithInfo',
  todayCallWithInfoLabel: '当日TEL(夕方)'
});

for (const seller of sellers) {
  const label = getTodayCallWithInfoLabel(seller);
  assert(label === '当日TEL(夕方)');
}
```

---

## マイグレーション

### データベース

- 変更なし

### API

- `/api/sellers/sidebar-counts`のレスポンスから`todayCallWithInfo`を削除
- 既存のクライアントとの互換性を保つため、段階的に削除

---

## ロールバック計画

### ステップ1: フロントエンドのロールバック

```bash
git revert <commit-hash>
```

### ステップ2: バックエンドのロールバック

```bash
git revert <commit-hash>
```

---

## パフォーマンス考慮事項

- `todayCallWithInfoGroups`の計算は既存のロジックを使用するため、パフォーマンスへの影響はない
- サイドバーの表示は1秒以内に完了する

---

## セキュリティ考慮事項

- 変更なし（既存のセキュリティ対策をそのまま使用）

---

## 参考資料

- `.kiro/steering/sidebar-status-definition.md` - サイドバーステータス定義
- `.kiro/specs/today-call-with-info-subcategory-filtering/` - 既存のサブカテゴリフィルタリング機能
