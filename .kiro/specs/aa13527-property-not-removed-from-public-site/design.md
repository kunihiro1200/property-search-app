# AA13527 スプレッドシート削除物件が公開サイトに残り続けるバグ 修正設計

## Overview

スプレッドシートから削除された物件AA13527が、公開物件サイトに表示され続けているバグの修正設計。

根本原因は `EnhancedAutoSyncService.runFullSync()` に「スプレッドシートから消えた物件を非表示にするフェーズ」が存在しないこと。Phase 4.5（更新）・Phase 4.6（追加）はあるが、**Phase 4.8（非表示化）が欠落**している。

修正方針：
1. `property_listings` テーブルに `is_hidden` カラムを追加
2. `EnhancedAutoSyncService` に Phase 4.8 として `syncHiddenPropertyListings()` を追加
3. `PropertyListingService`（公開サイト側）のクエリに `is_hidden = false` フィルターを追加

## Glossary

- **Bug_Condition (C)**: バグが発現する条件 — DBの `property_listings` に存在し、かつスプレッドシートに存在しない物件番号で、`is_hidden = false` のもの
- **Property (P)**: 期待される正しい動作 — `is_hidden = true` の物件は公開物件サイトのAPI（一覧・詳細）から除外される
- **Preservation**: 修正によって変えてはいけない既存の動作 — スプレッドシートに存在する物件の同期・表示・詳細取得
- **syncHiddenPropertyListings**: `EnhancedAutoSyncService` に追加するメソッド。DBにあってスプレッドシートにない物件を検出し `is_hidden = true` に設定する
- **is_hidden**: `property_listings` テーブルに追加する `boolean DEFAULT false` カラム。スプレッドシートから削除された物件を論理的に非表示にするフラグ
- **Phase 4.8**: `runFullSync()` に追加する新しいフェーズ。物件の非表示同期を担当

## Bug Details

### Fault Condition

バグは、スプレッドシートから物件が削除された後に定期同期が実行されても、その物件が `is_hidden = true` にならないために発現する。`runFullSync()` には物件の追加・更新フェーズはあるが、削除（非表示化）フェーズが存在しない。

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type { propertyNumber: string }
  OUTPUT: boolean

  dbRecord := getFromPropertyListings(input.propertyNumber)
  sheetRecord := getFromSpreadsheet(input.propertyNumber)

  RETURN dbRecord IS NOT NULL
         AND sheetRecord IS NULL
         AND dbRecord.is_hidden = false
END FUNCTION
```

### Examples

- **AA13527**: スプレッドシートから削除済み → DBに `is_hidden = false` で残存 → 公開サイトに表示される（バグ）
- **AA13527（修正後）**: 定期同期実行 → `is_hidden = true` に更新 → 公開サイトから除外される（期待動作）
- **AA13500（スプレッドシートに存在）**: `is_hidden = false` のまま → 公開サイトに表示される（正常）
- **AA13527（再登録後）**: スプレッドシートに再追加 → `is_hidden = false` に戻る → 公開サイトに再表示される（期待動作）

## Expected Behavior

### Preservation Requirements

**変えてはいけない動作:**
- スプレッドシートに存在する物件（`is_hidden = false`）は引き続き公開サイトに表示される
- 既存の `atbb_status` による公開/非公開フィルタリングは変わらない
- `getPublicPropertyById` / `getPublicPropertyByNumber` の詳細取得は正常に動作する
- Phase 4.5（物件リスト更新同期）・Phase 4.6（新規物件追加同期）は変わらない
- 売主同期（Phase 1〜3）は変わらない

**スコープ:**
`is_hidden` フラグの追加と `syncHiddenPropertyListings()` の追加のみ。既存の同期ロジック・クエリロジックへの変更は最小限に留める。

## Hypothesized Root Cause

1. **Phase 4.8 の欠落**: `runFullSync()` に物件の非表示化フェーズが存在しない。Phase 4.5（更新）・Phase 4.6（追加）はあるが、「スプレッドシートから消えた物件を検出して非表示にする」処理がない。

2. **`is_hidden` カラムの不在**: `property_listings` テーブルに非表示フラグが存在しないため、スプレッドシートから削除された物件を論理的に除外する手段がない。

3. **公開サイトクエリのフィルター不足**: `PropertyListingService.getPublicProperties()` 等のクエリに `is_hidden` フィルターが存在しない（カラム自体がないため）。

## Correctness Properties

Property 1: Fault Condition - スプレッドシート削除物件の非表示化

_For any_ 物件番号において、バグ条件（DBに存在しスプレッドシートに存在しない）が成立する場合、修正後の `syncHiddenPropertyListings()` は該当物件の `is_hidden` を `true` に設定し、`getPublicProperties()` のレスポンスからその物件を除外しなければならない。

**Validates: Requirements 2.3, 2.4**

Property 2: Preservation - スプレッドシート存在物件の表示継続

_For any_ 物件番号において、バグ条件が成立しない（スプレッドシートに存在する）場合、修正後の `syncHiddenPropertyListings()` は `is_hidden` を変更せず、`getPublicProperties()` は修正前と同じ結果を返さなければならない。

**Validates: Requirements 3.1, 3.2, 3.3, 3.4**

## Fix Implementation

### Changes Required

**修正前提**: `is_hidden` カラムが `property_listings` テーブルに存在することが必要。

---

**File 1**: `backend/supabase/migrations/YYYYMMDDHHMMSS_add_is_hidden_to_property_listings.sql`

```sql
ALTER TABLE property_listings
  ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_property_listings_is_hidden
  ON property_listings (is_hidden);
```

---

**File 2**: `backend/src/services/EnhancedAutoSyncService.ts`

**追加メソッド**: `syncHiddenPropertyListings()`

```
FUNCTION syncHiddenPropertyListings()
  1. スプレッドシートから全物件番号を取得（PROPERTY_LIST_SPREADSHEET_ID）
  2. DBの property_listings から全物件番号を取得（ページネーション対応）
  3. DBにあってスプレッドシートにない物件番号を検出
  4. 検出した物件の is_hidden = true に更新
  5. スプレッドシートに再登録された物件（is_hidden=true かつスプレッドシートに存在）の is_hidden = false に更新
  6. 結果を返す
END FUNCTION
```

**`runFullSync()` への追加**: Phase 4.7 の後に Phase 4.8 として呼び出す。

---

**File 3**: `backend/api/src/services/PropertyListingService.ts`

**変更箇所**:
1. `getPublicProperties()` のクエリに `.eq('is_hidden', false)` を追加
2. `getPublicPropertyById()` のクエリに `.eq('is_hidden', false)` を追加
3. `getPublicPropertyByNumber()` のクエリに `.eq('is_hidden', false)` を追加
4. `getAllPublicPropertyIds()` のクエリに `.eq('is_hidden', false)` を追加

## Testing Strategy

### Validation Approach

2フェーズのアプローチ：まず未修正コードでバグを再現するテストを書いてバグを確認し、次に修正後のコードで正しい動作を検証する。

### Exploratory Fault Condition Checking

**Goal**: 未修正コードでバグを再現し、根本原因を確認する。

**Test Plan**: `syncHiddenPropertyListings()` が存在しない状態で、スプレッドシートから削除された物件がDBに残り続けることを確認する。

**Test Cases**:
1. **Phase 4.8 欠落テスト**: `runFullSync()` を実行後、スプレッドシートにない物件の `is_hidden` が `false` のままであることを確認（未修正コードで失敗するはず）
2. **APIフィルターなしテスト**: `getPublicProperties()` がスプレッドシートにない物件を返すことを確認（未修正コードで失敗するはず）
3. **AA13527 具体例テスト**: AA13527 が `GET /api/public/properties` のレスポンスに含まれることを確認（未修正コードで失敗するはず）

**Expected Counterexamples**:
- `runFullSync()` 実行後も `is_hidden = false` のまま（Phase 4.8 が存在しないため）
- `getPublicProperties()` が `is_hidden` フィルターなしで全物件を返す

### Fix Checking

**Goal**: バグ条件が成立する全ての入力に対して、修正後の関数が期待動作を示すことを検証する。

**Pseudocode:**
```
FOR ALL propertyNumber WHERE isBugCondition({ propertyNumber }) DO
  syncHiddenPropertyListings_fixed()
  result := getPublicProperties_fixed()
  ASSERT propertyNumber NOT IN result.properties
  ASSERT getIsHidden(propertyNumber) = true
END FOR
```

### Preservation Checking

**Goal**: バグ条件が成立しない全ての入力に対して、修正後の関数が修正前と同じ結果を返すことを検証する。

**Pseudocode:**
```
FOR ALL propertyNumber WHERE NOT isBugCondition({ propertyNumber }) DO
  result_original := getPublicProperties_original()
  result_fixed := getPublicProperties_fixed()
  ASSERT result_original = result_fixed
END FOR
```

**Testing Approach**: プロパティベーステストを推奨。理由：
- 多様な物件番号・状態の組み合わせを自動生成できる
- `is_hidden` フラグの境界値（true/false）を網羅できる
- 既存の `atbb_status` フィルターとの組み合わせを検証できる

**Test Cases**:
1. **スプレッドシート存在物件の表示継続**: `is_hidden = false` の物件が `getPublicProperties()` に含まれることを確認
2. **詳細取得の保存**: `is_hidden = false` の物件の `getPublicPropertyById()` が正常に動作することを確認
3. **再登録物件の復元**: `is_hidden = true` の物件がスプレッドシートに再登録された後、`is_hidden = false` に戻ることを確認

### Unit Tests

- `syncHiddenPropertyListings()` がスプレッドシートにない物件を正しく検出して `is_hidden = true` に設定することを確認
- `syncHiddenPropertyListings()` が再登録物件を `is_hidden = false` に戻すことを確認
- `getPublicProperties()` が `is_hidden = true` の物件を除外することを確認
- `getPublicPropertyById()` が `is_hidden = true` の物件に対して `null` を返すことを確認

### Property-Based Tests

- 任意の `is_hidden = true` の物件番号に対して `getPublicProperties()` がその物件を含まないことを検証
- 任意の `is_hidden = false` の物件番号に対して `syncHiddenPropertyListings()` が `is_hidden` を変更しないことを検証（スプレッドシートに存在する場合）
- 任意のスプレッドシート物件番号セットに対して `syncHiddenPropertyListings()` が差分を正しく計算することを検証

### Integration Tests

- `runFullSync()` 実行後、スプレッドシートにない物件の `is_hidden` が `true` になることを確認
- `runFullSync()` 実行後、スプレッドシートに存在する物件の `is_hidden` が `false` のままであることを確認
- 公開物件サイトの `GET /api/public/properties` が `is_hidden = true` の物件を返さないことを確認
