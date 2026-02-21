# 「当日TEL（内容）」サブカテゴリフィルタリング機能 - 設計書

## アーキテクチャ概要

### システム構成

```
┌─────────────────────────────────────────────────────────────┐
│                    フロントエンド                              │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────┐         ┌──────────────────┐          │
│  │ SellersPage.tsx  │         │ CallModePage.tsx │          │
│  │                  │         │                  │          │
│  │ - selectedCategory        │ - selectedCategory          │
│  │ - selectedVisitAssignee   │ - selectedVisitAssignee     │
│  │                  │         │                  │          │
│  │ - APIパラメータ構築│         │ - URLパラメータ読取│          │
│  │ - 通話モード遷移  │         │ - サイドバー表示  │          │
│  └────────┬─────────┘         └────────┬─────────┘          │
│           │                            │                     │
│           │                            │                     │
│           └────────────┬───────────────┘                     │
│                        │                                     │
│              ┌─────────▼─────────┐                          │
│              │ SellerStatusSidebar│                          │
│              │                    │                          │
│              │ - todayCallWithInfoGroups                     │
│              │ - onCategorySelect │                          │
│              │ - サブカテゴリボタン│                          │
│              └────────────────────┘                          │
│                                                               │
└───────────────────────┬───────────────────────────────────────┘
                        │
                        │ GET /api/sellers?
                        │   category=todayCallWithInfo&
                        │   todayCallWithInfoLabel=当日TEL(メール を優先して希望)
                        │
┌───────────────────────▼───────────────────────────────────────┐
│                    バックエンド                                │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────┐                                        │
│  │ sellers.ts       │                                        │
│  │ (ルーティング)    │                                        │
│  │                  │                                        │
│  │ - todayCallWithInfoLabel                                  │
│  │   パラメータ受取  │                                        │
│  └────────┬─────────┘                                        │
│           │                                                   │
│           │                                                   │
│  ┌────────▼─────────┐                                        │
│  │ SellerService    │                                        │
│  │                  │                                        │
│  │ - GetSellersParams                                        │
│  │   + todayCallWithInfoLabel                                │
│  │                  │                                        │
│  │ - getSellers()   │                                        │
│  │   フィルタリング  │                                        │
│  └──────────────────┘                                        │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

## データフロー

### 1. 一覧ページでサブカテゴリを選択

```
ユーザー
  │
  │ クリック: 「当日TEL(メール を優先して希望)」
  │
  ▼
SellerStatusSidebar
  │
  │ onCategorySelect('todayCallWithInfo', '当日TEL(メール を優先して希望)')
  │
  ▼
SellersPage
  │
  │ setSelectedCategory('todayCallWithInfo')
  │ setSelectedVisitAssignee('当日TEL(メール を優先して希望)')
  │
  │ APIパラメータ構築:
  │   category: 'todayCallWithInfo'
  │   todayCallWithInfoLabel: '当日TEL(メール を優先して希望)'
  │
  ▼
Backend API
  │
  │ SellerService.getSellers({
  │   category: 'todayCallWithInfo',
  │   todayCallWithInfoLabel: '当日TEL(メール を優先して希望)'
  │ })
  │
  │ フィルタリング:
  │   .eq('status', '当日TEL分')
  │   .not('todayCallContent', 'is', null)
  │   .eq('todayCallContent', '当日TEL(メール を優先して希望)')
  │
  ▼
一覧表示
  │
  │ 「当日TEL(メール を優先して希望)」のみ表示
  │
```

### 2. 通話モードページに遷移

```
ユーザー
  │
  │ クリック: 「通話モード」ボタン
  │
  ▼
SellersPage.handleCallModeClick()
  │
  │ URLパラメータ構築:
  │   sellerNumber: AA9492
  │   category: todayCallWithInfo
  │   visitAssignee: 当日TEL(メール を優先して希望)
  │
  │ navigate('/call-mode?sellerNumber=AA9492&category=todayCallWithInfo&visitAssignee=当日TEL(メール を優先して希望)')
  │
  ▼
CallModePage
  │
  │ 初期化useEffect:
  │   URLパラメータから読み取り
  │   setSelectedCategory('todayCallWithInfo')
  │   setSelectedVisitAssignee('当日TEL(メール を優先して希望)')
  │
  ▼
SellerStatusSidebar
  │
  │ selectedCategory: 'todayCallWithInfo'
  │ selectedVisitAssignee: '当日TEL(メール を優先して希望)'
  │
  │ サイドバーで選択状態を表示
  │
```

## 詳細設計

### 1. バックエンド

#### 1.1 GetSellersParamsインターフェース

**ファイル**: `backend/src/services/SellerService.supabase.ts`

**変更前**:
```typescript
export interface GetSellersParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
  category?: string;
  visitAssignee?: string;
}
```

**変更後**:
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

#### 1.2 sellers.tsルーティング

**ファイル**: `backend/src/routes/sellers.ts`

**変更前**:
```typescript
const {
  page = 1,
  limit = 50,
  sortBy = 'sellerNumber',
  sortOrder = 'asc',
  search,
  category,
  visitAssignee,
} = req.query;

const result = await sellerService.getSellers({
  page: Number(page),
  limit: Number(limit),
  sortBy: sortBy as string,
  sortOrder: sortOrder as 'asc' | 'desc',
  search: search as string | undefined,
  category: category as string | undefined,
  visitAssignee: visitAssignee as string | undefined,
});
```

**変更後**:
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

#### 1.3 SellerService.getSellers()フィルタリングロジック

**ファイル**: `backend/src/services/SellerService.supabase.ts`

**変更箇所**: `case 'todayCallWithInfo':`

**変更前**:
```typescript
case 'todayCallWithInfo':
  // 当日TEL（内容）= 当日TEL分 かつ 内容あり
  query = query
    .eq('status', '当日TEL分')
    .not('todayCallContent', 'is', null)
    .neq('todayCallContent', '');
  break;
```

**変更後**:
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

### 2. フロントエンド - 一覧ページ

#### 2.1 APIパラメータ構築

**ファイル**: `frontend/src/pages/SellersPage.tsx`

**変更前**:
```typescript
if (selectedCategory) {
  params.category = selectedCategory;
}
if (selectedVisitAssignee) {
  params.visitAssignee = selectedVisitAssignee;
}
```

**変更後**:
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

**説明**:
- `todayCallWithInfo`カテゴリの時、`selectedVisitAssignee`を`todayCallWithInfoLabel`として送信
- 他のカテゴリの時は、従来通り`visitAssignee`として送信

#### 2.2 通話モードページへの遷移

**ファイル**: `frontend/src/pages/SellersPage.tsx`

**変更前**:
```typescript
const handleCallModeClick = (seller: Seller) => {
  navigate(`/call-mode?sellerNumber=${seller.sellerNumber}`);
};
```

**変更後**:
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

### 3. フロントエンド - サイドバー

#### 3.1 サブカテゴリボタンのクリック処理

**ファイル**: `frontend/src/components/SellerStatusSidebar.tsx`

**変更前**:
```typescript
onClick={() => onCategorySelect('todayCallWithInfo', undefined)}
```

**変更後**:
```typescript
onClick={() => onCategorySelect('todayCallWithInfo', group.label)}
```

**説明**:
- `group.label`（例：「当日TEL(メール を優先して希望)」）を`onCategorySelect`に渡す
- `onCategorySelect`の第2引数は`visitAssignee`だが、`todayCallWithInfo`カテゴリの時は`todayCallWithInfoLabel`として扱われる

### 4. フロントエンド - 通話モードページ

#### 4.1 State定義

**ファイル**: `frontend/src/pages/CallModePage.tsx`

**追加**:
```typescript
const [selectedCategory, setSelectedCategory] = useState<string>('all');
const [selectedVisitAssignee, setSelectedVisitAssignee] = useState<string | undefined>(undefined);
```

#### 4.2 初期化useEffect

**ファイル**: `frontend/src/pages/CallModePage.tsx`

**変更前**:
```typescript
useEffect(() => {
  const initializeCallMode = async () => {
    // 初期化処理
  };
  
  initializeCallMode();
}, []);
```

**変更後**:
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

#### 4.3 SellerStatusSidebarへのprops渡し

**ファイル**: `frontend/src/pages/CallModePage.tsx`

**変更前**:
```typescript
<SellerStatusSidebar
  categoryCounts={sidebarCounts}
  selectedCategory="all"
  selectedVisitAssignee={undefined}
  onCategorySelect={() => {}}
  isCallMode={true}
  sellers={sellers}
  loading={false}
/>
```

**変更後**:
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

## テスト計画

### 1. 単体テスト

#### 1.1 バックエンド

**テストケース1**: `todayCallWithInfoLabel`パラメータなし
- **入力**: `{ category: 'todayCallWithInfo' }`
- **期待結果**: 全ての「当日TEL（内容）」が返される

**テストケース2**: `todayCallWithInfoLabel`パラメータあり
- **入力**: `{ category: 'todayCallWithInfo', todayCallWithInfoLabel: '当日TEL(メール を優先して希望)' }`
- **期待結果**: 「当日TEL(メール を優先して希望)」のみが返される

#### 1.2 フロントエンド

**テストケース1**: サブカテゴリボタンのクリック
- **操作**: 「当日TEL(メール を優先して希望)」をクリック
- **期待結果**: `onCategorySelect('todayCallWithInfo', '当日TEL(メール を優先して希望)')`が呼ばれる

**テストケース2**: URLパラメータの読み取り
- **入力**: `/call-mode?sellerNumber=AA9492&category=todayCallWithInfo&visitAssignee=当日TEL(メール を優先して希望)`
- **期待結果**: `selectedCategory`と`selectedVisitAssignee`が正しく設定される

### 2. 統合テスト

#### 2.1 一覧ページでのフィルタリング

**手順**:
1. 売主リストページを開く
2. サイドバーで「当日TEL(メール を優先して希望)」をクリック
3. 一覧を確認

**期待結果**:
- 「当日TEL(メール を優先して希望)」のみが表示される
- 一覧の件数がサブカテゴリの件数と一致する
- サイドバーで選択状態が視覚的に分かる

#### 2.2 通話モードページでの状態維持

**手順**:
1. 売主リストページを開く
2. サイドバーで「当日TEL(メール を優先して希望)」をクリック
3. 一覧から売主を選択
4. 「通話モード」ボタンをクリック
5. 通話モードページを確認

**期待結果**:
- URLパラメータに`category=todayCallWithInfo&visitAssignee=当日TEL(メール を優先して希望)`が含まれる
- サイドバーで「当日TEL(メール を優先して希望)」が選択状態
- 同じサブカテゴリの売主が表示される

### 3. 回帰テスト

#### 3.1 他のサイドバーカテゴリ

**確認項目**:
- 訪問予定/訪問済みのフィルタリングが正常に動作する
- 当日TEL分のフィルタリングが正常に動作する
- 未査定のフィルタリングが正常に動作する

#### 3.2 他のページ

**確認項目**:
- 売主詳細ページが正常に動作する
- 物件リストページが正常に動作する

## パフォーマンス考慮事項

### 1. データベースクエリ

- **インデックス**: `todayCallContent`フィールドにインデックスを追加（必要に応じて）
- **クエリ最適化**: `.eq('todayCallContent', params.todayCallWithInfoLabel)`は高速

### 2. フロントエンド

- **URLパラメータ**: 軽量で高速
- **State更新**: 最小限の再レンダリング

## セキュリティ考慮事項

### 1. SQLインジェクション対策

- Supabaseのクエリビルダーを使用（自動的にエスケープされる）
- ユーザー入力を直接SQLに埋め込まない

### 2. XSS対策

- Reactが自動的にエスケープ
- `group.label`はバックエンドで生成されるため安全

## エラーハンドリング

### 1. バックエンド

- `todayCallWithInfoLabel`が不正な値の場合、空の結果を返す
- エラーログを出力

### 2. フロントエンド

- APIエラー時、エラーメッセージを表示
- URLパラメータが不正な場合、デフォルト値を使用

## デプロイ計画

### 1. デプロイ順序

1. バックエンドをデプロイ
2. フロントエンドをデプロイ

### 2. ロールバック計画

- バックエンド: 前のバージョンに戻す
- フロントエンド: 前のバージョンに戻す

### 3. モニタリング

- APIエラー率を監視
- フィルタリングのレスポンス時間を監視

---

**作成日**: 2026年2月3日  
**作成者**: Kiro AI  
**ステータス**: Draft（実装タスクリスト作成待ち）
