# Implementation Tasks

## Task 1: BuyerCandidateService の作成

**File:** `backend/src/services/BuyerCandidateService.ts`

**Description:** 買主候補を抽出するサービスクラスを作成する

**Requirements:**
- 最新状況/問合せ時確度によるフィルタリング
- エリア条件によるフィルタリング
- 種別条件によるフィルタリング
- 価格帯条件によるフィルタリング
- 受付日の降順ソート
- 最大50件の制限

**Acceptance Criteria:**
- [x] BuyerCandidateService クラスが作成されている
- [x] getCandidatesForProperty メソッドが実装されている
- [x] 全てのフィルタリング条件が正しく動作する
- [x] 受付日の降順でソートされる
- [x] 最大50件まで返却される

---

## Task 2: API エンドポイントの追加

**File:** `backend/src/routes/propertyListings.ts`

**Description:** 買主候補リスト取得APIエンドポイントを追加する

**Requirements:**
- GET /api/property-listings/:propertyNumber/buyer-candidates
- 物件が存在しない場合は404エラー
- 適切なエラーハンドリング

**Acceptance Criteria:**
- [x] エンドポイントが追加されている
- [x] 正常系で買主候補リストが返却される
- [x] 物件が存在しない場合に404エラーが返却される
- [x] エラーハンドリングが適切に実装されている

---

## Task 3: BuyerCandidateList コンポーネントの作成

**File:** `frontend/src/components/BuyerCandidateList.tsx`

**Description:** 買主候補リストを表示するReactコンポーネントを作成する

**Requirements:**
- 買主候補リストの表示
- 買主番号クリックで買主詳細画面に遷移
- ローディング状態の表示
- 候補がない場合のメッセージ表示

**Acceptance Criteria:**
- [x] コンポーネントが作成されている
- [x] 買主候補リストが正しく表示される
- [x] 買主番号クリックで詳細画面に遷移する
- [x] ローディング状態が表示される
- [x] 候補がない場合にメッセージが表示される

---

## Task 4: PropertyListingDetailPage への統合

**File:** `frontend/src/pages/PropertyListingDetailPage.tsx`

**Description:** 物件詳細画面に買主候補リストコンポーネントを統合する

**Requirements:**
- 右カラムに買主候補リストセクションを追加
- 既存の買主リストの下に配置
- 物件データを買主候補リストに渡す

**Acceptance Criteria:**
- [x] 買主候補リストセクションが追加されている
- [x] 物件データが正しく渡されている
- [x] UIが既存のデザインと調和している
