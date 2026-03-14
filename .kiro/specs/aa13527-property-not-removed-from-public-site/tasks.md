# Implementation Tasks

## Task List

- [x] 1. DBマイグレーション: `is_hidden` カラムを `property_listings` テーブルに追加
  - [x] 1.1 マイグレーションファイルを作成（`backend/supabase/migrations/`）
    - `is_hidden BOOLEAN NOT NULL DEFAULT false` カラムを追加
    - `idx_property_listings_is_hidden` インデックスを作成
  - [x] 1.2 マイグレーションをSupabaseに適用して動作確認

- [ ] 2. 探索的テスト: 未修正コードでバグを再現するテストを作成
  - [ ] 2.1 `syncHiddenPropertyListings()` が存在しないため、スプレッドシートにない物件の `is_hidden` が `false` のままであることを確認するテストを作成（未修正コードで失敗するはず）
  - [ ] 2.2 `getPublicProperties()` が `is_hidden` フィルターなしで全物件を返すことを確認するテストを作成（未修正コードで失敗するはず）

- [x] 3. `EnhancedAutoSyncService` に `syncHiddenPropertyListings()` メソッドを追加
  - [x] 3.1 物件リストスプレッドシートから全物件番号を取得する処理を実装
    - `PROPERTY_LIST_SPREADSHEET_ID = '1tI_iXaiLuWBggs5y0RH7qzkbHs9wnLLdRekAmjkhcLY'`
    - `PROPERTY_LIST_SHEET_NAME = '物件'`
  - [x] 3.2 DBの `property_listings` から全物件番号を取得する処理を実装（ページネーション対応）
  - [x] 3.3 DBにあってスプレッドシートにない物件を検出して `is_hidden = true` に更新する処理を実装
  - [x] 3.4 スプレッドシートに再登録された物件（`is_hidden = true` かつスプレッドシートに存在）を `is_hidden = false` に戻す処理を実装
  - [x] 3.5 `runFullSync()` に Phase 4.8 として `syncHiddenPropertyListings()` を追加

- [x] 4. `PropertyListingService`（公開サイト側）のクエリに `is_hidden` フィルターを追加
  - [x] 4.1 `getPublicProperties()` のクエリに `.eq('is_hidden', false)` を追加
  - [x] 4.2 `getPublicPropertyById()` のクエリに `.eq('is_hidden', false)` を追加
  - [x] 4.3 `getPublicPropertyByNumber()` のクエリに `.eq('is_hidden', false)` を追加
  - [x] 4.4 `getAllPublicPropertyIds()` のクエリに `.eq('is_hidden', false)` を追加

- [ ] 5. 修正確認テスト（Fix Checking）
  - [ ] 5.1 `syncHiddenPropertyListings()` がスプレッドシートにない物件を `is_hidden = true` に設定することを確認するユニットテストを作成・実行
  - [ ] 5.2 `syncHiddenPropertyListings()` が再登録物件を `is_hidden = false` に戻すことを確認するユニットテストを作成・実行
  - [ ] 5.3 `getPublicProperties()` が `is_hidden = true` の物件を除外することを確認するユニットテストを作成・実行
  - [ ] 5.4 `getPublicPropertyById()` が `is_hidden = true` の物件に対して `null` を返すことを確認するユニットテストを作成・実行

- [ ] 6. 保存確認テスト（Preservation Checking）
  - [ ] 6.1 `is_hidden = false` の物件が `getPublicProperties()` に引き続き含まれることを確認するプロパティベーステストを作成・実行（Property 2 の検証）
  - [ ] 6.2 スプレッドシートに存在する物件の `is_hidden` が `syncHiddenPropertyListings()` 実行後も変わらないことを確認するテストを作成・実行
  - [ ] 6.3 `runFullSync()` 実行後、スプレッドシートに存在する物件が引き続き正常に同期されることを確認する統合テストを作成・実行
