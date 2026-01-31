# システム隔離ルール（絶対に守るべきルール）

## ⚠️ 最重要：5つの独立したシステム

このプロジェクトには**5つの完全に独立したシステム**があります。
**絶対に他のシステムに影響を与える変更をしてはいけません。**

---

## 📋 5つの独立したシステム

### 1. 売主リスト（Seller Management）

**用途**: 売主の管理、追客、通話モード

**フロントエンド**:
- `frontend/src/pages/SellerListPage.tsx`
- `frontend/src/pages/SellerDetailPage.tsx`
- `frontend/src/pages/CallModePage.tsx`
- `frontend/src/components/Seller*.tsx`

**バックエンド**:
- `backend/src/routes/sellers.ts`
- `backend/src/services/SellerService.supabase.ts`
- `backend/src/services/EnhancedAutoSyncService.ts`

**データベース**:
- `sellers`テーブル

**スプレッドシート**:
- 売主リストスプレッドシート

---

### 2. 物件リスト（Property Management）

**用途**: 物件の管理、物件詳細

**フロントエンド**:
- `frontend/src/pages/PropertyListPage.tsx`
- `frontend/src/pages/PropertyDetailPage.tsx`
- `frontend/src/components/Property*.tsx`

**バックエンド**:
- `backend/src/routes/properties.ts`
- `backend/src/services/PropertyService.ts`

**データベース**:
- `property_listings`テーブル
- `property_details`テーブル

**スプレッドシート**:
- 物件リストスプレッドシート（業務リスト）

---

### 3. 買主リスト（Buyer Management）

**用途**: 買主の管理、問い合わせ対応

**フロントエンド**:
- `frontend/src/pages/BuyerListPage.tsx`
- `frontend/src/pages/BuyerDetailPage.tsx`
- `frontend/src/components/Buyer*.tsx`

**バックエンド**:
- `backend/src/routes/buyers.ts`
- `backend/src/services/BuyerService.ts`

**データベース**:
- `buyers`テーブル

**スプレッドシート**:
- 買主リストスプレッドシート

---

### 4. 業務リスト（Work Task Management）

**用途**: 業務タスクの管理

**フロントエンド**:
- `frontend/src/pages/WorkTaskListPage.tsx`
- `frontend/src/components/WorkTask*.tsx`

**バックエンド**:
- `backend/src/routes/work-tasks.ts`
- `backend/src/services/WorkTaskService.ts`

**データベース**:
- `work_tasks`テーブル

**スプレッドシート**:
- 業務リストスプレッドシート

---

### 5. 物件公開サイト（Public Property Site）

**用途**: 一般公開用の物件検索サイト

**フロントエンド**:
- `frontend/src/pages/PublicPropertyListPage.tsx`
- `frontend/src/pages/PublicPropertyDetailPage.tsx`
- `frontend/src/components/PublicProperty*.tsx`

**バックエンド**:
- `backend/api/index.ts` ← **専用のAPIエントリーポイント**
- `backend/api/src/services/PropertyListingService.ts`

**データベース**:
- `property_listings`テーブル（読み取り専用）
- `property_details`テーブル（読み取り専用）

**Vercelプロジェクト**:
- `property-site-frontend`

---

## 🚨 絶対に守るべきルール

### ルール1: 変更は対象システムのファイルのみ

**売主リストの変更時**:
- ✅ `backend/src/services/SellerService.supabase.ts`を編集
- ✅ `frontend/src/pages/SellerDetailPage.tsx`を編集
- ❌ `backend/api/index.ts`を編集してはいけない
- ❌ `backend/src/services/PropertyListingService.ts`を編集してはいけない

**物件公開サイトの変更時**:
- ✅ `backend/api/index.ts`を編集
- ✅ `frontend/src/pages/PublicPropertyDetailPage.tsx`を編集
- ❌ `backend/src/services/SellerService.supabase.ts`を編集してはいけない
- ❌ `backend/src/services/EnhancedAutoSyncService.ts`を編集してはいけない

---

### ルール2: 共通ファイルの変更は慎重に

以下のファイルは**複数のシステムで使用**されています。
変更する場合は、**全てのシステムへの影響を確認**してください。

**共通ファイル一覧**:
- `backend/src/services/GoogleSheetsClient.ts` - 全システムで使用
- `backend/src/services/GoogleDriveService.ts` - 全システムで使用
- `backend/src/types/index.ts` - 全システムで使用
- `backend/src/config/column-mapping.json` - 売主・物件で使用

**共通ファイルを変更する場合のチェックリスト**:
- [ ] 売主リストに影響がないか確認
- [ ] 物件リストに影響がないか確認
- [ ] 買主リストに影響がないか確認
- [ ] 業務リストに影響がないか確認
- [ ] 物件公開サイトに影響がないか確認

---

### ルール3: 日付パース関数の変更は特に注意

**過去の問題**: 売主リストの次電日をシリアル値に対応させた変更が、物件公開サイトに影響を与えた

**日付パース関数の場所**:
- `backend/src/services/EnhancedAutoSyncService.ts` - 売主リスト専用
- `backend/src/services/PropertyListingService.ts` - 物件リスト専用
- `backend/api/src/services/PropertyListingService.ts` - 物件公開サイト専用

**ルール**:
- ✅ 各システム専用の日付パース関数を使用する
- ❌ 共通の日付パース関数を作成して全システムで使用しない
- ❌ 一つのシステムの日付パース関数を変更して他のシステムに影響を与えない

---

### ルール4: PropertyListingServiceは3つ存在する

**重要**: `PropertyListingService`は**3つの異なるファイル**に存在します。

| ファイルパス | 用途 | 変更時の影響 |
|------------|------|------------|
| `backend/src/services/PropertyListingService.ts` | 物件リスト（管理画面） | 物件リストのみ |
| `backend/api/src/services/PropertyListingService.ts` | 物件公開サイト（API） | 物件公開サイトのみ |
| `frontend/src/backend/services/PropertyListingService.ts` | フロントエンド | フロントエンドのみ |

**変更時の注意**:
- 物件公開サイトを修正する場合 → `backend/api/src/services/PropertyListingService.ts`のみ
- 物件リスト（管理画面）を修正する場合 → `backend/src/services/PropertyListingService.ts`のみ
- **3つ全てを同時に変更しない**（必要な場合のみ、慎重に）

---

## 📋 変更前のチェックリスト

### ステップ1: 対象システムを特定

**質問**: どのシステムを変更しますか？

- [ ] 売主リスト
- [ ] 物件リスト
- [ ] 買主リスト
- [ ] 業務リスト
- [ ] 物件公開サイト

### ステップ2: 変更するファイルを確認

**質問**: 変更するファイルは対象システム専用ですか？

- [ ] 対象システム専用のファイルのみを変更する
- [ ] 共通ファイルを変更する場合は、全システムへの影響を確認する

### ステップ3: 影響範囲を確認

**質問**: この変更は他のシステムに影響を与えますか？

- [ ] 売主リストに影響なし
- [ ] 物件リストに影響なし
- [ ] 買主リストに影響なし
- [ ] 業務リストに影響なし
- [ ] 物件公開サイトに影響なし

### ステップ4: テスト

**質問**: 変更後、対象システムのみをテストしましたか？

- [ ] 対象システムの動作確認
- [ ] 他のシステムに影響がないことを確認（必要な場合）

---

## 🎯 実例：過去の問題

### 問題1: 売主リストの次電日変更が物件公開サイトに影響

**原因**: 
- 売主リストの`EnhancedAutoSyncService.ts`で日付パース関数を変更
- その変更が共通の日付パース関数に影響を与えた
- 物件公開サイトの配信日パースが壊れた

**教訓**:
- ✅ 各システム専用の日付パース関数を使用する
- ❌ 共通の日付パース関数を変更しない

### 問題2: PropertyListingServiceの変更が複数システムに影響

**原因**:
- `backend/src/services/PropertyListingService.ts`を変更
- 同じ名前のファイルが3つあることを認識していなかった
- 間違ったファイルを変更してしまった

**教訓**:
- ✅ ファイルパスを必ず確認する
- ✅ 対象システム専用のファイルのみを変更する

---

## 📝 ユーザーからの指示の仕方

### 推奨される指示

```
「売主リストの次電日表示を修正して」
→ 売主リスト専用のファイルのみを変更

「物件公開サイトの配信日ソートを修正して」
→ 物件公開サイト専用のファイルのみを変更

「買主リストの問い合わせ日を修正して」
→ 買主リスト専用のファイルのみを変更
```

### 避けるべき指示

```
❌ 「日付パースを修正して」
→ どのシステムの日付パースか不明

❌ 「PropertyListingServiceを修正して」
→ 3つのうちどれか不明
```

---

## まとめ

**5つの独立したシステム**:
1. 売主リスト
2. 物件リスト
3. 買主リスト
4. 業務リスト
5. 物件公開サイト

**絶対に守るべきルール**:
1. 変更は対象システムのファイルのみ
2. 共通ファイルの変更は慎重に
3. 日付パース関数の変更は特に注意
4. PropertyListingServiceは3つ存在する

**このルールを徹底することで、一つのシステムの変更が他のシステムに影響を与えることを完全に防止できます。**

---

**最終更新日**: 2026年1月31日  
**作成理由**: 売主リストの変更が物件公開サイトに影響を与えた問題を防ぐため
