# 「当日TEL（内容）」サブカテゴリフィルタリング機能 - 要件定義

## 問題の概要

売主リストページと通話モードページのサイドバーで「④当日TEL（内容）」のサブカテゴリ（例：「当日TEL(メール を優先して希望)」）をクリックした時に、そのサブカテゴリのみが一覧に表示されるようにする。

## 背景

### 現在の動作

- サイドバーに「当日TEL(メール を優先して希望)」「当日TEL(午前中)」などのサブカテゴリが表示される
- サブカテゴリをクリックしても、全ての「当日TEL（内容）」が表示される
- 特定のサブカテゴリのみをフィルタリングできない

### 期待される動作

- 「当日TEL(メール を優先して希望)」をクリックすると、そのサブカテゴリのみが一覧に表示される
- 通話モードページに遷移した時も、選択したサブカテゴリが維持される
- サイドバーで選択状態が視覚的に分かる

## User Stories

### US-1: サブカテゴリフィルタリング（一覧ページ）

**As a** ユーザー  
**I want to** 「当日TEL(メール を優先して希望)」をクリックした時に、そのサブカテゴリのみを表示したい  
**So that** 特定の連絡方法の売主のみを効率的に確認できる

**Acceptance Criteria**:
1. サブカテゴリをクリックすると、そのサブカテゴリのみが一覧に表示される
2. 一覧の件数がサブカテゴリの件数と一致する
3. サイドバーで選択状態が視覚的に分かる
4. 他のサブカテゴリをクリックすると、表示が切り替わる

### US-2: サブカテゴリフィルタリング（通話モードページ）

**As a** ユーザー  
**I want to** 一覧ページでサブカテゴリを選択した後、通話モードページに遷移しても選択状態が維持されたい  
**So that** 通話モードページでも同じサブカテゴリの売主を確認できる

**Acceptance Criteria**:
1. 一覧ページでサブカテゴリを選択
2. 通話モードページに遷移
3. サイドバーで選択状態が維持される
4. 同じサブカテゴリの売主が表示される

## 機能要件

### FR-1: バックエンド - サブカテゴリフィルタリングAPI

**要件**:
1. `GetSellersParams`に`todayCallWithInfoLabel`パラメータを追加
2. `todayCallWithInfo`カテゴリの時、`todayCallWithInfoLabel`でフィルタリング
3. `todayCallContent`フィールドと`todayCallWithInfoLabel`を比較

**実装箇所**:
- `backend/src/services/SellerService.supabase.ts`
  - `GetSellersParams`インターフェース
  - `getSellers`メソッドのフィルタリングロジック
- `backend/src/routes/sellers.ts`
  - `todayCallWithInfoLabel`パラメータの受け取り

### FR-2: フロントエンド - 一覧ページ（SellersPage.tsx）

**要件**:
1. サブカテゴリをクリックした時、`todayCallWithInfoLabel`パラメータをAPIに送信
2. `selectedVisitAssignee`を`todayCallWithInfoLabel`として再利用
3. 通話モードページに遷移する時、URLパラメータで`category`と`visitAssignee`を渡す

**実装箇所**:
- `frontend/src/pages/SellersPage.tsx`
  - APIパラメータの構築
  - `handleCallModeClick`関数

### FR-3: フロントエンド - サイドバー（SellerStatusSidebar.tsx）

**要件**:
1. サブカテゴリボタンをクリックした時、`group.label`を`onCategorySelect`に渡す
2. `onCategorySelect('todayCallWithInfo', group.label)`を呼び出す

**実装箇所**:
- `frontend/src/components/SellerStatusSidebar.tsx`
  - `todayCallWithInfoGroups.map`のボタンクリック処理

### FR-4: フロントエンド - 通話モードページ（CallModePage.tsx）

**要件**:
1. `selectedCategory`と`selectedVisitAssignee`のstateを追加
2. URLパラメータから`category`と`visitAssignee`を読み取る
3. `SellerStatusSidebar`に`selectedCategory`と`selectedVisitAssignee`を渡す
4. `onCategorySelect`で状態を更新

**実装箇所**:
- `frontend/src/pages/CallModePage.tsx`
  - State定義
  - 初期化useEffect
  - SellerStatusSidebarへのprops渡し

## 非機能要件

### NFR-1: パフォーマンス

- フィルタリングのレスポンス時間: 500ms以内
- URLパラメータの読み取り: 即座

### NFR-2: 保守性

- 既存の`visitAssignee`パラメータを再利用
- 新しいAPIエンドポイントは不要
- 型定義が明確

### NFR-3: 互換性

- 他のサイドバーカテゴリの動作に影響を与えない
- 訪問予定/訪問済みのフィルタリングに影響を与えない

## 制約条件

### 技術的制約

1. **システム隔離ルール**を遵守する
   - 売主管理システム（`backend/src/`）のみを修正
   - 公開物件サイト（`backend/api/`）は触らない

2. **既存のパラメータを再利用**
   - `visitAssignee`パラメータを`todayCallWithInfoLabel`として再利用
   - 新しいAPIエンドポイントは作成しない

### ビジネス制約

1. **緊急度**: 中（ユーザーが特定のサブカテゴリのみを確認したい）
2. **影響範囲**: 売主リストページと通話モードページ
3. **リリース**: 修正後すぐにデプロイ可能

## 成功基準

### 定量的基準

1. **フィルタリング**:
   - サブカテゴリをクリックすると、そのサブカテゴリのみが表示される
   - 一覧の件数がサブカテゴリの件数と一致する

2. **状態維持**:
   - 通話モードページに遷移しても、選択状態が維持される
   - URLパラメータに`category`と`visitAssignee`が含まれる

### 定性的基準

1. **ユーザビリティ**:
   - サブカテゴリをクリックするだけでフィルタリングできる
   - 選択状態が視覚的に分かる

2. **保守性**:
   - 既存のパラメータを再利用
   - 新しいAPIエンドポイントは不要

## リスクと対策

### リスク1: `visitAssignee`パラメータの再利用による混乱

**対策**:
- `todayCallWithInfo`カテゴリの時のみ、`visitAssignee`を`todayCallWithInfoLabel`として扱う
- コメントで明確に記載

### リスク2: 通話モードページでの状態維持の失敗

**対策**:
- URLパラメータで状態を渡す
- 初期化useEffectでURLパラメータを読み取る

## 次のステップ

1. ✅ 要件定義書を作成（このドキュメント）
2. ⏳ 設計書を作成
3. ⏳ 実装タスクリストを作成
4. ⏳ 実装
5. ⏳ テスト
6. ⏳ コミット＆プッシュ

---

**作成日**: 2026年2月3日  
**作成者**: Kiro AI  
**ステータス**: Draft（設計書作成待ち）
