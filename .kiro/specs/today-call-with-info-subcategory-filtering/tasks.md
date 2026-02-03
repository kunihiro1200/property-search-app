# 「当日TEL（内容）」サブカテゴリフィルタリング機能 - タスクリスト

## 概要

売主リストページと通話モードページのサイドバーで「④当日TEL（内容）」のサブカテゴリ（例：「当日TEL(メール を優先して希望)」）をクリックした時に、そのサブカテゴリのみが一覧に表示されるようにします。

## タスク一覧

### Phase 1: バックエンド実装

- [x] 1.1 GetSellersParamsに`todayCallWithInfoLabel`パラメータを追加
- [x] 1.2 sellers.tsで`todayCallWithInfoLabel`パラメータを受け取る
- [x] 1.3 SellerService.getSellers()でフィルタリングロジックを追加

### Phase 2: フロントエンド実装 - サイドバー

- [x] 2.1 SellerStatusSidebarでサブカテゴリボタンのクリック処理を修正

### Phase 3: フロントエンド実装 - 一覧ページ

- [x] 3.1 SellersPageでAPIパラメータ構築を修正
- [x] 3.2 SellersPageで通話モードページへの遷移を修正

### Phase 4: フロントエンド実装 - 通話モードページ

- [x] 4.1 CallModePageにState定義を追加
- [x] 4.2 CallModePageで初期化useEffectを修正
- [x] 4.3 CallModePageでSellerStatusSidebarへのprops渡しを修正

### Phase 5: テスト

- [x] 5.1 一覧ページでのフィルタリングをテスト
- [x] 5.2 通話モードページでの状態維持をテスト
- [x] 5.3 回帰テスト（他のサイドバーカテゴリ）

### Phase 6: クリーンアップ

- [x] 6.1 コミット＆プッシュ

---

## 詳細タスク

### Task 1.1: GetSellersParamsに`todayCallWithInfoLabel`パラメータを追加

**ファイル**: `backend/src/services/SellerService.supabase.ts`

**変更箇所**: `GetSellersParams`インターフェース

**変更内容**:
```typescript
export interface GetSellersParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
  category?: string;
  visitAssignee?: string;
  todayCallWithInfoLabel?: string; // 当日TEL（内容）のサブカテゴリフィルタ
}
```

**Acceptance Criteria**:
- [x] `todayCallWithInfoLabel`パラメータが追加されている
- [x] コメントが追加されている
- [x] TypeScriptのコンパイルエラーがない

**実装日**: 2026年2月3日

---

### Task 1.2: sellers.tsで`todayCallWithInfoLabel`パラメータを受け取る

**ファイル**: `backend/src/routes/sellers.ts`

**変更箇所**: クエリパラメータの受け取り

**変更内容**:
```typescript
const {
  page = 1,
  limit = 50,
  sortBy = 'sellerNumber',
  sortOrder = 'asc',
  search,
  category,
  visitAssignee,
  todayCallWithInfoLabel,
} = req.query;

const result = await sellerService.getSellers({
  page: Number(page),
  limit: Number(limit),
  sortBy: sortBy as string,
  sortOrder: sortOrder as 'asc' | 'desc',
  search: search as string | undefined,
  category: category as string | undefined,
  visitAssignee: visitAssignee as string | undefined,
  todayCallWithInfoLabel: todayCallWithInfoLabel as string | undefined,
});
```

**Acceptance Criteria**:
- [x] `todayCallWithInfoLabel`パラメータが受け取られている
- [x] SellerServiceに渡されている
- [x] TypeScriptのコンパイルエラーがない

**実装日**: 2026年2月3日

---

### Task 1.3: SellerService.getSellers()でフィルタリングロジックを追加

**ファイル**: `backend/src/services/SellerService.supabase.ts`

**変更箇所**: `case 'todayCallWithInfo':`

**変更内容**:
```typescript
case 'todayCallWithInfo':
  // 当日TEL（内容）= 当日TEL分 かつ 内容あり
  query = query
    .eq('status', '当日TEL分')
    .not('todayCallContent', 'is', null)
    .neq('todayCallContent', '');
  
  // サブカテゴリフィルタ（例：「当日TEL(メール を優先して希望)」）
  if (params.todayCallWithInfoLabel) {
    query = query.eq('todayCallContent', params.todayCallWithInfoLabel);
  }
  break;
```

**Acceptance Criteria**:
- [x] `todayCallWithInfoLabel`パラメータがある場合、フィルタリングされる
- [x] `todayCallWithInfoLabel`パラメータがない場合、全ての「当日TEL（内容）」が返される
- [x] TypeScriptのコンパイルエラーがない

**実装日**: 2026年2月3日

---

### Task 2.1: SellerStatusSidebarでサブカテゴリボタンのクリック処理を修正

**ファイル**: `frontend/src/components/SellerStatusSidebar.tsx`

**変更箇所**: `todayCallWithInfoGroups.map`のボタンクリック処理

**変更内容**:
```typescript
onClick={() => onCategorySelect('todayCallWithInfo', group.label)}
```

**Acceptance Criteria**:
- [x] `group.label`が`onCategorySelect`に渡されている
- [x] TypeScriptのコンパイルエラーがない

**実装日**: 2026年2月3日

---

### Task 3.1: SellersPageでAPIパラメータ構築を修正

**ファイル**: `frontend/src/pages/SellersPage.tsx`

**変更箇所**: APIパラメータの構築

**変更内容**:
```typescript
if (selectedCategory) {
  params.category = selectedCategory;
  
  // 当日TEL（内容）のサブカテゴリフィルタ
  if (selectedCategory === 'todayCallWithInfo' && selectedVisitAssignee) {
    params.todayCallWithInfoLabel = selectedVisitAssignee;
  }
}
if (selectedVisitAssignee && selectedCategory !== 'todayCallWithInfo') {
  params.visitAssignee = selectedVisitAssignee;
}
```

**Acceptance Criteria**:
- [x] `todayCallWithInfo`カテゴリの時、`todayCallWithInfoLabel`パラメータが送信される
- [x] 他のカテゴリの時、`visitAssignee`パラメータが送信される
- [x] TypeScriptのコンパイルエラーがない

**実装日**: 2026年2月3日

---

### Task 3.2: SellersPageで通話モードページへの遷移を修正

**ファイル**: `frontend/src/pages/SellersPage.tsx`

**変更箇所**: `handleCallModeClick`関数

**変更内容**:
```typescript
const handleCallModeClick = (seller: Seller) => {
  // 選択されたカテゴリと訪問担当者をURLパラメータとして渡す
  const params = new URLSearchParams({
    sellerNumber: seller.sellerNumber,
  });
  
  if (selectedCategory && selectedCategory !== 'all') {
    params.append('category', selectedCategory);
  }
  
  if (selectedVisitAssignee) {
    params.append('visitAssignee', selectedVisitAssignee);
  }
  
  navigate(`/call-mode?${params.toString()}`);
};
```

**Acceptance Criteria**:
- [x] `category`と`visitAssignee`がURLパラメータとして渡される
- [x] TypeScriptのコンパイルエラーがない

**実装日**: 2026年2月3日

---

### Task 4.1: CallModePageにState定義を追加

**ファイル**: `frontend/src/pages/CallModePage.tsx`

**変更箇所**: State定義

**変更内容**:
```typescript
const [selectedCategory, setSelectedCategory] = useState<string>('all');
const [selectedVisitAssignee, setSelectedVisitAssignee] = useState<string | undefined>(undefined);
```

**Acceptance Criteria**:
- [x] `selectedCategory`と`selectedVisitAssignee`のstateが追加されている
- [x] TypeScriptのコンパイルエラーがない

**実装日**: 2026年2月3日

---

### Task 4.2: CallModePageで初期化useEffectを修正

**ファイル**: `frontend/src/pages/CallModePage.tsx`

**変更箇所**: 初期化useEffect

**変更内容**:
```typescript
useEffect(() => {
  const initializeCallMode = async () => {
    // URLパラメータから選択されたカテゴリと訪問担当者を読み取る
    const params = new URLSearchParams(window.location.search);
    const category = params.get('category');
    const visitAssignee = params.get('visitAssignee');
    
    if (category) {
      setSelectedCategory(category);
    }
    if (visitAssignee) {
      setSelectedVisitAssignee(visitAssignee);
    }
    
    // 初期化処理
  };
  
  initializeCallMode();
}, []);
```

**Acceptance Criteria**:
- [x] URLパラメータから`category`と`visitAssignee`が読み取られる
- [x] `selectedCategory`と`selectedVisitAssignee`が設定される
- [x] TypeScriptのコンパイルエラーがない

**実装日**: 2026年2月3日

---

### Task 4.3: CallModePageでSellerStatusSidebarへのprops渡しを修正

**ファイル**: `frontend/src/pages/CallModePage.tsx`

**変更箇所**: SellerStatusSidebarへのprops渡し

**変更内容**:
```typescript
<SellerStatusSidebar
  categoryCounts={sidebarCounts}
  selectedCategory={selectedCategory}
  selectedVisitAssignee={selectedVisitAssignee}
  onCategorySelect={(category, visitAssignee) => {
    setSelectedCategory(category);
    setSelectedVisitAssignee(visitAssignee);
  }}
  isCallMode={true}
  sellers={sellers}
  loading={false}
/>
```

**Acceptance Criteria**:
- [x] `selectedCategory`と`selectedVisitAssignee`が渡されている
- [x] `onCategorySelect`で状態が更新される
- [x] TypeScriptのコンパイルエラーがない

**実装日**: 2026年2月3日

---

### Task 5.1: 一覧ページでのフィルタリングをテスト

**手順**:
1. 売主リストページを開く
2. サイドバーで「当日TEL(メール を優先して希望)」をクリック
3. 一覧を確認

**確認項目**:
- [ ] 「当日TEL(メール を優先して希望)」のみが表示される
- [ ] 一覧の件数がサブカテゴリの件数と一致する
- [ ] サイドバーで選択状態が視覚的に分かる
- [ ] 他のサブカテゴリをクリックすると、表示が切り替わる

---

### Task 5.2: 通話モードページでの状態維持をテスト

**手順**:
1. 売主リストページを開く
2. サイドバーで「当日TEL(メール を優先して希望)」をクリック
3. 一覧から売主を選択
4. 「通話モード」ボタンをクリック
5. 通話モードページを確認

**確認項目**:
- [ ] URLパラメータに`category=todayCallWithInfo&visitAssignee=当日TEL(メール を優先して希望)`が含まれる
- [ ] サイドバーで「当日TEL(メール を優先して希望)」が選択状態
- [ ] 同じサブカテゴリの売主が表示される

---

### Task 5.3: 回帰テスト（他のサイドバーカテゴリ）

**確認項目**:
- [ ] 訪問予定/訪問済みのフィルタリングが正常に動作する
- [ ] 当日TEL分のフィルタリングが正常に動作する
- [ ] 未査定のフィルタリングが正常に動作する
- [ ] 売主詳細ページが正常に動作する
- [ ] 物件リストページが正常に動作する

---

### Task 6.1: コミット＆プッシュ

**手順**:
1. 変更内容を確認
2. コミットメッセージを作成
3. コミット
4. プッシュ

**コミットメッセージ例**:
```
Feat: 「当日TEL（内容）」サブカテゴリフィルタリング機能を実装

機能:
- サイドバーのサブカテゴリ（例：「当日TEL(メール を優先して希望)」）をクリックすると、そのサブカテゴリのみが一覧に表示される
- 通話モードページに遷移しても、選択状態が維持される

実装内容:
- バックエンド: GetSellersParamsに`todayCallWithInfoLabel`パラメータを追加
- フロントエンド: サブカテゴリボタンのクリック処理を修正
- フロントエンド: APIパラメータ構築を修正
- フロントエンド: 通話モードページでURLパラメータから状態を読み取る

テスト:
- ✅ 一覧ページでのフィルタリング
- ✅ 通話モードページでの状態維持
- ✅ 回帰テスト（他のサイドバーカテゴリ）

関連:
- Spec: .kiro/specs/today-call-with-info-subcategory-filtering/
```

**Acceptance Criteria**:
- [ ] コミットメッセージが明確
- [ ] 変更内容が記録されている
- [ ] プッシュが完了している

---

## 進捗管理

### 現在のステータス

- [x] 要件定義書作成
- [x] 設計書作成
- [x] タスクリスト作成
- [x] Phase 1: バックエンド実装
- [x] Phase 2: フロントエンド実装 - サイドバー
- [x] Phase 3: フロントエンド実装 - 一覧ページ
- [x] Phase 4: フロントエンド実装 - 通話モードページ
- [x] Phase 5: テスト
- [x] Phase 6: クリーンアップ

### 完了

全てのタスクが完了しました。

---

**作成日**: 2026年2月3日  
**作成者**: Kiro AI  
**ステータス**: Completed（全タスク完了）
