# Tasks

## Overview

物件リストの全フィールドを自動同期する機能を実装します。既存の`PropertyListingSyncService.syncPropertyListingUpdates()`を`EnhancedAutoSyncService`に統合し、公開物件サイトのバッジとURL表示を正しく更新します。

## Task Breakdown

### Phase 1: EnhancedAutoSyncService Integration (1時間)

#### Task 1.1: syncPropertyListingUpdates() メソッド追加
**File**: `backend/src/services/EnhancedAutoSyncService.ts`

**Description**: 物件リスト更新同期を自動同期サービスに統合

**Acceptance Criteria**:
- [ ] `syncPropertyListingUpdates()`メソッドを追加
- [ ] `PropertyListingSyncService.syncPropertyListingUpdates()`を呼び出し
- [ ] エラーハンドリングを実装
- [ ] ログ出力を実装（開始、完了、エラー）
- [ ] 更新件数とエラー件数を記録

**Estimated Time**: 30分

---

#### Task 1.2: runFullSync() メソッド更新
**File**: `backend/src/services/EnhancedAutoSyncService.ts`

**Description**: 物件リスト更新同期をフル同期フローに追加

**Acceptance Criteria**:
- [ ] 既存の同期処理の後に`syncPropertyListingUpdates()`を追加
- [ ] 実行順序: 売主 → 買主 → 作業タスク → 物件リスト更新
- [ ] エラーが発生しても次の同期を継続
- [ ] 全体のサマリーに結果を含める

**Estimated Time**: 30分

---

### Phase 2: PropertyListingSyncService Verification (30分)

#### Task 2.1: syncPropertyListingUpdates() メソッド確認
**File**: `backend/src/services/PropertyListingSyncService.ts`

**Description**: 既存の包括的UPDATE機能が正しく動作することを確認

**Acceptance Criteria**:
- [ ] 全フィールドの同期ロジックを確認
- [ ] 変更検出ロジックを確認
- [ ] バッチ処理ロジックを確認
- [ ] エラーハンドリングを確認
- [ ] 必要に応じて改善

**Estimated Time**: 30分

---

### Phase 3: Frontend Badge Update (1時間)

#### Task 3.1: PublicPropertyCard バッジ表示確認
**File**: `frontend/src/components/PublicPropertyCard.tsx`

**Description**: 公開物件サイトのバッジ表示ロジックを確認・更新

**Acceptance Criteria**:
- [ ] `atbbStatusDisplayMapper`を使用していることを確認
- [ ] ATBB状態バッジが正しく表示されることを確認
- [ ] 専任バッジが正しく表示されることを確認
- [ ] バッジのスタイルが適切であることを確認
- [ ] 必要に応じて改善

**Estimated Time**: 30分

---

#### Task 3.2: バッジ表示のテスト
**File**: `frontend/src/components/__tests__/PublicPropertyCard.test.tsx`

**Description**: バッジ表示のテストを作成・実行

**Acceptance Criteria**:
- [ ] ATBB状態に応じたバッジ表示のテスト
- [ ] 専任状態に応じたバッジ表示のテスト
- [ ] バッジの色とテキストのテスト
- [ ] エッジケースのテスト

**Estimated Time**: 30分

---

### Phase 4: Frontend Public URL Display (1時間)

#### Task 4.1: PropertyListingsPage URL表示追加
**File**: `frontend/src/pages/PropertyListingsPage.tsx`

**Description**: 物件リスト画面に公開URLカラムを追加

**Acceptance Criteria**:
- [ ] 「公開URL」カラムを追加
- [ ] `PublicUrlCell`コンポーネントを使用
- [ ] カラムの位置を適切に配置
- [ ] レスポンシブ対応

**Estimated Time**: 30分

---

#### Task 4.2: PublicUrlCell コンポーネント作成
**File**: `frontend/src/components/PublicUrlCell.tsx`

**Description**: 公開URLを表示するセルコンポーネントを作成

**Acceptance Criteria**:
- [ ] サイト表示フラグが「Y」の場合、公開URLを表示
- [ ] サイト表示フラグが「N」の場合、「非公開」を表示
- [ ] URLをクリックすると新しいタブで開く
- [ ] 外部リンクアイコンを表示
- [ ] スタイルを適切に設定

**Estimated Time**: 30分

---

### Phase 5: Testing & Validation (1.5時間)

#### Task 5.1: 統合テスト実行
**File**: `backend/test-property-listing-comprehensive-sync.ts`

**Description**: 包括的な同期機能の統合テストを実行

**Acceptance Criteria**:
- [ ] スプレッドシートで物件情報を更新
- [ ] 自動同期を実行
- [ ] DBに反映されることを確認
- [ ] 公開物件サイトのバッジが更新されることを確認
- [ ] 物件リスト画面の公開URLが表示されることを確認

**Estimated Time**: 45分

---

#### Task 5.2: エンドツーエンドテスト
**Description**: 実際のユーザーフローでテスト

**Acceptance Criteria**:
- [ ] スプレッドシートでATBB状態を変更
- [ ] 5分待機（自動同期）
- [ ] 公開物件サイトでバッジが更新されることを確認
- [ ] 物件リスト画面で公開URLが表示されることを確認
- [ ] 公開URLをクリックして公開サイトが開くことを確認

**Estimated Time**: 45分

---

### Phase 6: Documentation & Deployment (1時間)

#### Task 6.1: ユーザーガイド作成
**File**: `.kiro/specs/property-listing-atbb-status-auto-sync/USER_GUIDE.md`

**Description**: ユーザー向けのガイドを作成

**Acceptance Criteria**:
- [ ] 機能の概要を説明
- [ ] 使用方法を記載
- [ ] スクリーンショットを追加
- [ ] トラブルシューティングを記載
- [ ] FAQを記載

**Estimated Time**: 30分

---

#### Task 6.2: 本番環境デプロイ
**Description**: 本番環境に機能をデプロイ

**Acceptance Criteria**:
- [ ] バックエンドをデプロイ
- [ ] フロントエンドをデプロイ
- [ ] 自動同期が動作することを確認
- [ ] モニタリングを設定
- [ ] ユーザーに通知

**Estimated Time**: 30分

---

## Task Dependencies

```
Phase 1: EnhancedAutoSyncService Integration
├── Task 1.1: syncPropertyListingUpdates()
└── Task 1.2: runFullSync() update
     │
     ▼
Phase 2: PropertyListingSyncService Verification
└── Task 2.1: Verify existing functionality
     │
     ├─────────────────┬─────────────────┐
     ▼                 ▼                 ▼
Phase 3: Badge      Phase 4: URL      Phase 5: Testing
Task 3.1            Task 4.1          Task 5.1
Task 3.2            Task 4.2          Task 5.2
     │                 │                 │
     └─────────────────┴─────────────────┘
                       ▼
              Phase 6: Documentation & Deployment
              Task 6.1
              Task 6.2
```

## Progress Tracking

### Phase 1: EnhancedAutoSyncService Integration
- [ ] Task 1.1: syncPropertyListingUpdates() メソッド追加
- [ ] Task 1.2: runFullSync() メソッド更新

### Phase 2: PropertyListingSyncService Verification
- [ ] Task 2.1: syncPropertyListingUpdates() メソッド確認

### Phase 3: Frontend Badge Update
- [ ] Task 3.1: PublicPropertyCard バッジ表示確認
- [ ] Task 3.2: バッジ表示のテスト

### Phase 4: Frontend Public URL Display
- [ ] Task 4.1: PropertyListingsPage URL表示追加
- [ ] Task 4.2: PublicUrlCell コンポーネント作成

### Phase 5: Testing & Validation
- [ ] Task 5.1: 統合テスト実行
- [ ] Task 5.2: エンドツーエンドテスト

### Phase 6: Documentation & Deployment
- [ ] Task 6.1: ユーザーガイド作成
- [ ] Task 6.2: 本番環境デプロイ

## Total Estimated Time

- Phase 1: 1時間
- Phase 2: 30分
- Phase 3: 1時間
- Phase 4: 1時間
- Phase 5: 1.5時間
- Phase 6: 1時間

**Total: 6時間**

## Notes

### 優先順位

1. **High Priority**: Phase 1-2 (統合と検証)
2. **Medium Priority**: Phase 3-4 (フロントエンド更新)
3. **Low Priority**: Phase 5-6 (テストとデプロイ)

### 既存機能の活用

- `PropertyListingSyncService.syncPropertyListingUpdates()`は既に実装済み
- 全フィールドの同期ロジックが含まれている
- 変更検出とバッチ処理が実装済み
- 新規実装は最小限で済む

### リスク

- **スプレッドシートAPI制限**: 既存のバッチサイズで対応済み
- **DB更新エラー**: 既存のエラーハンドリングで対応済み
- **フロントエンドキャッシュ**: キャッシュクリアで対応

### 成功基準

- ✅ スプレッドシートで物件情報を更新すると、5分以内にシステムに反映される
- ✅ 公開物件サイトのバッジが物件の状態を正確に反映している
- ✅ 物件リスト画面で公開URLが正しく表示される
- ✅ 同期エラー率が1%未満である
- ✅ ユーザーからの「情報が更新されない」という問���合わせがゼロになる

## Related Documents

- `requirements.md` - 要件定義
- `design.md` - 設計書
- `backend/PROPERTY_LISTING_UPDATE_SYNC_FIX_COMPLETE.md` - 既存の実装完了報告
- `.kiro/specs/property-listing-update-sync/` - 既存の物件リスト更新同期spec
