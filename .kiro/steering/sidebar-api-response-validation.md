# サイドバーAPIレスポンス検証ルール（絶対に守るべきルール）

## ⚠️ 最重要：サイドバーカウントAPIは完全なデータを返す必要がある

売主リストページのサイドバーは、`/api/sellers/sidebar-counts`エンドポイントから取得したデータを使用して表示されます。
**このAPIレスポンスに不足があると、サイドバーのカテゴリが表示されなくなります。**

---

## 📋 必須フィールド一覧

### `/api/sellers/sidebar-counts`のレスポンス型

```typescript
{
  todayCall: number;
  todayCallWithInfo: number;
  todayCallAssigned: number;
  visitScheduled: number;
  visitCompleted: number;
  unvaluated: number;
  mailingPending: number;
  todayCallNotStarted: number;
  pinrichEmpty: number;
  visitScheduledByAssignee: { initial: string; count: number }[];
  visitCompletedByAssignee: { initial: string; count: number }[];
  todayCallAssignedByAssignee: { initial: string; count: number }[];  // ← 追加！
  todayCallWithInfoGroups: { label: string; count: number }[];  // ← 最重要！
}
```

---

## 🚨 過去の問題：todayCallWithInfoGroupsが欠落

### 問題（2026年2月3日）

**症状**: 
- AA9492が「④当日TEL（内容）」カテゴリに表示されない
- サイドバーに「④当日TEL（内容）」カテゴリ自体が表示されない

**根本原因**:
1. **バックエンド**: `SellerService.getSidebarCounts()`が`todayCallWithInfoGroups`を返していなかった
2. **フロントエンド**: `SellersPage.tsx`で`visitScheduledByAssignee`と`visitCompletedByAssignee`が重複定義されていた（型エラー）

**影響**:
- `SellerStatusSidebar.tsx`の`todayCallWithInfoGroups`が空配列になる
- サイドバーのレンダリングロジックで「グループが0件の場合は非表示」となり、カテゴリが表示されない

---

## ✅ 正しい実装

### 1. バックエンド（`backend/src/services/SellerService.supabase.ts`）

**`getSidebarCounts`メソッドの戻り値**:

```typescript
async getSidebarCounts(): Promise<{
  todayCall: number;
  todayCallWithInfo: number;
  todayCallAssigned: number;
  visitScheduled: number;
  visitCompleted: number;
  unvaluated: number;
  mailingPending: number;
  todayCallNotStarted: number;
  pinrichEmpty: number;
  visitScheduledByAssignee: { initial: string; count: number }[];
  visitCompletedByAssignee: { initial: string; count: number }[];
  todayCallWithInfoGroups: { label: string; count: number }[];  // ← 必須！
}> {
  // ... 実装
  
  // 当日TEL（内容）をグループ化
  const todayCallWithInfoGroups = this.groupTodayCallWithInfo(todayCallWithInfoSellers);
  
  return {
    todayCall: todayCallSellers.length,
    todayCallWithInfo: todayCallWithInfoSellers.length,
    // ... 他のフィールド
    todayCallWithInfoGroups,  // ← 必ず含める！
  };
}
```

**グループ化ロジック**:

```typescript
private groupTodayCallWithInfo(sellers: any[]): { label: string; count: number }[] {
  const groups: { [key: string]: any[] } = {};
  
  sellers.forEach(seller => {
    // 優先順位: 連絡方法 > 連絡取りやすい時間 > 電話担当
    let label = '';
    if (seller.contact_method) {
      label = `当日TEL(${seller.contact_method})`;
    } else if (seller.preferred_contact_time) {
      label = `当日TEL(${seller.preferred_contact_time})`;
    } else if (seller.phone_contact_person) {
      label = `当日TEL(${seller.phone_contact_person})`;
    } else {
      label = '当日TEL(その他)';
    }
    
    if (!groups[label]) {
      groups[label] = [];
    }
    groups[label].push(seller);
  });
  
  return Object.entries(groups)
    .map(([label, sellers]) => ({
      label,
      count: sellers.length,
    }))
    .sort((a, b) => b.count - a.count);
}
```

---

### 2. フロントエンド（`frontend/src/pages/SellersPage.tsx`）

**`sidebarCounts`の型定義と初期値**:

```typescript
const [sidebarCounts, setSidebarCounts] = useState<{
  todayCall: number;
  todayCallWithInfo: number;
  todayCallAssigned: number;
  visitScheduled: number;
  visitCompleted: number;
  unvaluated: number;
  mailingPending: number;
  todayCallNotStarted: number;
  pinrichEmpty: number;
  visitScheduledByAssignee: { initial: string; count: number }[];
  visitCompletedByAssignee: { initial: string; count: number }[];
  todayCallWithInfoGroups: { label: string; count: number }[];  // ← 必須！
}>({
  todayCall: 0,
  todayCallWithInfo: 0,
  todayCallAssigned: 0,
  visitScheduled: 0,
  visitCompleted: 0,
  unvaluated: 0,
  mailingPending: 0,
  todayCallNotStarted: 0,
  pinrichEmpty: 0,
  visitScheduledByAssignee: [],
  visitCompletedByAssignee: [],
  todayCallWithInfoGroups: [],  // ← 必須！
});
```

**重要**: 
- ✅ 各フィールドは**1回だけ**定義する
- ❌ 重複定義は型エラーの原因になる

---

### 3. フロントエンド（`frontend/src/components/SellerStatusSidebar.tsx`）

**`todayCallWithInfoGroups`の使用**:

```typescript
// APIから取得したグループ化データを優先、なければvalidSellersから計算
const todayCallWithInfoGroups = useMemo(() => {
  // APIから取得したグループ化データがある場合はそれを使用
  if (categoryCounts?.todayCallWithInfoGroups && categoryCounts.todayCallWithInfoGroups.length > 0) {
    return categoryCounts.todayCallWithInfoGroups;
  }
  // なければvalidSellersから計算（後方互換性のため）
  return groupTodayCallWithInfo(validSellers);
}, [categoryCounts?.todayCallWithInfoGroups, validSellers]);
```

**レンダリングロジック**:

```typescript
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

---

## 🛡️ 今後の予防策

### チェックリスト1: バックエンド修正時

サイドバーカウントAPIを修正する際は、以下を確認：

- [ ] `getSidebarCounts`メソッドの戻り値の型に全てのフィールドが含まれているか？
- [ ] 特に`todayCallWithInfoGroups`が含まれているか？
- [ ] `visitScheduledByAssignee`と`visitCompletedByAssignee`が含まれているか？
- [ ] 実装で全てのフィールドを返しているか？
- [ ] テストスクリプトで確認したか？

**テストスクリプト**:
```bash
npx ts-node backend/test-sidebar-counts-api.ts
```

**期待される出力**:
```json
{
  "todayCall": 10,
  "todayCallWithInfo": 5,
  "todayCallWithInfoGroups": [
    { "label": "当日TEL(メール を優先して希望)", "count": 2 },
    { "label": "当日TEL(午前中)", "count": 3 }
  ],
  "visitScheduledByAssignee": [
    { "initial": "Y", "count": 5 }
  ],
  "visitCompletedByAssignee": [
    { "initial": "I", "count": 3 }
  ]
}
```

---

### チェックリスト2: フロントエンド修正時

`SellersPage.tsx`を修正する際は、以下を確認：

- [ ] `sidebarCounts`の型定義に全てのフィールドが含まれているか？
- [ ] 特に`todayCallWithInfoGroups`が含まれているか？
- [ ] 初期値に全てのフィールドが含まれているか？
- [ ] **フィールドが重複定義されていないか？** ← **最重要！**
- [ ] エラー時のリセット処理に全てのフィールドが含まれているか？

**重複定義の例（❌ 間違い）**:
```typescript
const [sidebarCounts, setSidebarCounts] = useState<{
  visitScheduledByAssignee: { initial: string; count: number }[];
  visitCompletedByAssignee: { initial: string; count: number }[];
  todayCallWithInfoGroups: { label: string; count: number }[];
}>({
  visitScheduledByAssignee: [],
  visitCompletedByAssignee: [],
  todayCallWithInfoGroups: [],
});
  visitScheduledByAssignee: [],  // ← 重複！
  visitCompletedByAssignee: [],  // ← 重複！
});
```

**正しい定義（✅ 正しい）**:
```typescript
const [sidebarCounts, setSidebarCounts] = useState<{
  visitScheduledByAssignee: { initial: string; count: number }[];
  visitCompletedByAssignee: { initial: string; count: number }[];
  todayCallWithInfoGroups: { label: string; count: number }[];
}>({
  visitScheduledByAssignee: [],
  visitCompletedByAssignee: [],
  todayCallWithInfoGroups: [],
});
```

---

### チェックリスト3: 新しいカテゴリを追加する場合

新しいサイドバーカテゴリを追加する際は、以下を確認：

- [ ] バックエンドの`getSidebarCounts`メソッドの戻り値の型に追加
- [ ] バックエンドの実装で新しいフィールドを計算して返す
- [ ] フロントエンドの`sidebarCounts`の型定義に追加
- [ ] フロントエンドの初期値に追加
- [ ] フロントエンドのエラー時のリセット処理に追加
- [ ] `SellerStatusSidebar.tsx`のレンダリングロジックに追加
- [ ] テストスクリプトで確認

---

## 📝 関連ファイル

| ファイル | 役割 |
|---------|------|
| `backend/src/services/SellerService.supabase.ts` | サイドバーカウントAPIの実装 |
| `frontend/src/pages/SellersPage.tsx` | サイドバーカウントの取得と状態管理 |
| `frontend/src/components/SellerStatusSidebar.tsx` | サイドバーのレンダリング |
| `backend/test-sidebar-counts-api.ts` | サイドバーカウントAPIのテストスクリプト |

---

## 🎯 まとめ

**絶対に守るべきルール**:

1. **`getSidebarCounts`メソッドは全てのフィールドを返す**
   - 特に`todayCallWithInfoGroups`を忘れない
   - `visitScheduledByAssignee`と`visitCompletedByAssignee`も忘れない

2. **フロントエンドの型定義と初期値は一致させる**
   - 型定義に含まれる全てのフィールドを初期値にも含める
   - **フィールドを重複定義しない** ← **最重要！**

3. **修正後は必ずテストスクリプトで確認する**
   - `npx ts-node backend/test-sidebar-counts-api.ts`
   - APIレスポンスに全てのフィールドが含まれているか確認

4. **エラー時のリセット処理も忘れない**
   - `fetchSidebarCounts`のcatchブロックで全てのフィールドをリセット

**このルールを徹底することで、サイドバーカテゴリが表示されない問題を完全に防止できます。**

---

**最終更新日**: 2026年2月3日  
**作成理由**: AA9492が「④当日TEL（内容）」カテゴリに表示されない問題を防ぐため  
**問題の根本原因**: 
1. バックエンドの`getSidebarCounts`が`todayCallWithInfoGroups`を返していなかった
2. フロントエンドの`SellersPage.tsx`で`visitScheduledByAssignee`と`visitCompletedByAssignee`が重複定義されていた
