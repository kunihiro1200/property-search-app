# タスク：「当日TEL（内容）」を独立した本カテゴリに変更

## タスク一覧

- [x] 1. バックエンド: `getSidebarCounts()`から`todayCallWithInfo`を削除
- [x] 2. フロントエンド: `SellerStatusSidebar.tsx`を修正
  - [x] 2.1 「④当日TEL（内容）」親カテゴリの表示を削除
  - [x] 2.2 `todayCallWithInfoGroups`を独立したカテゴリとして表示
- [x] 3. フロントエンド: `SellersPage.tsx`を修正
  - [x] 3.1 `sidebarCounts`の型定義から`todayCallWithInfo`を削除
  - [x] 3.2 初期値から`todayCallWithInfo`を削除
- [x] 4. フロントエンド: `CallModePage.tsx`を修正
  - [x] 4.1 `sidebarCounts`の型定義から`todayCallWithInfo`を削除
  - [x] 4.2 初期値から`todayCallWithInfo`を削除
- [x] 5. ステアリングドキュメントを更新
  - [x] 5.1 `sidebar-status-definition.md`から「④当日TEL（内容）」を削除
  - [x] 5.2 新しいカテゴリの定義を追加
- [x] 6. テスト
  - [x] 6.1 サイドバーに「④当日TEL（内容）」が表示されないことを確認
  - [x] 6.2 各コミュニケーション情報カテゴリが独立して表示されることを確認
  - [x] 6.3 カテゴリをクリックしてフィルタリングが正しく動作することを確認
  - [x] 6.4 通話モードページでも同じように動作することを確認

---

## タスク詳細

### 1. バックエンド: `getSidebarCounts()`から`todayCallWithInfo`を削除

**ファイル**: `backend/src/services/SellerService.supabase.ts`

**変更内容**:
- `getSidebarCounts()`メソッドの戻り値から`todayCallWithInfo`を削除
- `todayCallWithInfoGroups`のみを返す

**変更箇所**:
```typescript
// 行1050-1070付近
return {
  todayCall: todayCallSellers.length,
  // todayCallWithInfo: todayCallWithInfoSellers.length, ← この行を削除
  todayCallAssigned: todayCallAssignedCount,
  visitScheduled: visitScheduledCount,
  visitCompleted: visitCompletedCount,
  unvaluated: unvaluatedSellers.length,
  mailingPending: mailingPendingSellers.length,
  todayCallNotStarted: todayCallNotStartedSellers.length,
  pinrichEmpty: pinrichEmptySellers.length,
  visitScheduledByAssignee,
  visitCompletedByAssignee,
  todayCallWithInfoGroups,
};
```

---

### 2. フロントエンド: `SellerStatusSidebar.tsx`を修正

**ファイル**: `frontend/src/components/SellerStatusSidebar.tsx`

#### 2.1 「④当日TEL（内容）」親カテゴリの表示を削除

**変更内容**:
- 「④当日TEL（内容）」という親カテゴリの表示を削除
- サブカテゴリのネスト構造を削除

**変更箇所**:
```tsx
// 行200-230付近
{/* ④当日TEL（内容）- 内容別にグループ化 */}
{(() => {
  // グループが0件の場合は非表示
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

↓ 削除して、以下に置き換え

#### 2.2 `todayCallWithInfoGroups`を独立したカテゴリとして表示

**変更内容**:
- `todayCallWithInfoGroups`を独立したカテゴリとして表示
- 番号を削除
- ハイライト処理を追加

**新しいコード**:
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

### 3. フロントエンド: `SellersPage.tsx`を修正

**ファイル**: `frontend/src/pages/SellersPage.tsx`

#### 3.1 `sidebarCounts`の型定義から`todayCallWithInfo`を削除

**変更箇所**:
```typescript
// 行50-70付近
const [sidebarCounts, setSidebarCounts] = useState<{
  todayCall: number;
  todayCallWithInfo: number;  // ← この行を削除
  todayCallAssigned: number;
  visitScheduled: number;
  visitCompleted: number;
  unvaluated: number;
  mailingPending: number;
  todayCallNotStarted: number;
  pinrichEmpty: number;
  visitScheduledByAssignee: { initial: string; count: number }[];
  visitCompletedByAssignee: { initial: string; count: number }[];
  todayCallWithInfoGroups: { label: string; count: number }[];
}>({
  // ...
});
```

#### 3.2 初期値から`todayCallWithInfo`を削除

**変更箇所**:
```typescript
// 行70-90付近
}>({
  todayCall: 0,
  todayCallWithInfo: 0,  // ← この行を削除
  todayCallAssigned: 0,
  visitScheduled: 0,
  visitCompleted: 0,
  unvaluated: 0,
  mailingPending: 0,
  todayCallNotStarted: 0,
  pinrichEmpty: 0,
  visitScheduledByAssignee: [],
  visitCompletedByAssignee: [],
  todayCallWithInfoGroups: [],
});
```

---

### 4. フロントエンド: `CallModePage.tsx`を修正

**ファイル**: `frontend/src/pages/CallModePage.tsx`

#### 4.1 `sidebarCounts`の型定義から`todayCallWithInfo`を削除

**変更内容**: `SellersPage.tsx`と同様

#### 4.2 初期値から`todayCallWithInfo`を削除

**変更内容**: `SellersPage.tsx`と同様

---

### 5. ステアリングドキュメントを更新

**ファイル**: `.kiro/steering/sidebar-status-definition.md`

#### 5.1 `sidebar-status-definition.md`から「④当日TEL（内容）」を削除

**変更内容**:
- 「### 4. 「当日TEL（内容）」」セクションを削除

#### 5.2 新しいカテゴリの定義を追加

**追加内容**:
```markdown
### 4. コミュニケーション情報別カテゴリ

**サイドバー表示**: `当日TEL(夕方)`、`当日TEL(メール を優先して希望)` など
**色**: 紫（secondary）

**条件**:
- 状況（当社）に「追客中」が含まれる
- 次電日が今日以前
- **コミュニケーション情報のいずれかに入力がある**
- **営担（visitAssignee）が空**

**表示例**:
- 当日TEL(夕方)
- 当日TEL(メール を優先して希望)
- 当日TEL(午前中)

**ラベルの優先順位**:
1. 連絡方法（contact_method）
2. 連絡取りやすい時間（preferred_contact_time）
3. 電話担当（phone_contact_person）

**重要**: 
- 各コミュニケーション情報は独立したカテゴリとして表示される
- 件数の多い順にソートされる
- 番号は振らない
- **「当日TEL(○○)」の括弧内には今後様々な値が入る可能性がある**
- **どのような値が入っても、全て独立した本カテゴリとして扱う**
- **親カテゴリでグループ化しない**
```

---

### 6. テスト

#### 6.1 サイドバーに「④当日TEL（内容）」が表示されないことを確認

**手順**:
1. 売主リストページを開く
2. サイドバーを確認

**期待される結果**:
- 「④当日TEL（内容）」が表示されない

---

#### 6.2 各コミュニケーション情報カテゴリが独立して表示されることを確認

**手順**:
1. 売主リストページを開く
2. サイドバーを確認

**期待される結果**:
- 「当日TEL(夕方)」が表示される
- 「当日TEL(メール を優先して希望)」が表示される
- 各カテゴリに件数が表示される
- 件数の多い順にソートされている

---

#### 6.3 カテゴリをクリックしてフィルタリングが正しく動作することを確認

**手順**:
1. 売主リストページを開く
2. 「当日TEL(夕方)」をクリック

**期待される結果**:
- 売主一覧にAA4163のみが表示される
- URLパラメータが`?category=todayCallWithInfo&todayCallWithInfoLabel=当日TEL(夕方)`になる
- 「当日TEL(夕方)」ボタンがハイライトされる

---

#### 6.4 通話モードページでも同じように動作することを確認

**手順**:
1. 通話モードページを開く
2. サイドバーを確認
3. 「当日TEL(夕方)」をクリック

**期待される結果**:
- サイドバーに「④当日TEL（内容）」が表示されない
- 各コミュニケーション情報カテゴリが独立して表示される
- カテゴリをクリックすると、正しくフィルタリングされる

---

## 完了条件

- [ ] 全てのタスクが完了している
- [ ] 全てのテストが成功している
- [ ] サイドバーに「④当日TEL（内容）」が表示されない
- [ ] 各コミュニケーション情報カテゴリが独立して表示される
- [ ] カテゴリをクリックすると、正しくフィルタリングされる
- [ ] 通話モードページでも同じように動作する
