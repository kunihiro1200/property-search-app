# CC205・AA13774物件同期バグ修正 設計ドキュメント

## Overview

物件CC205およびAA13774がスプレッドシートに存在するにもかかわらず、公開物件サイトに表示されない問題を修正する。

**新情報（再調査結果）**:
CC205（CCプレフィックス）だけでなく、AA13774（AAプレフィックス）も同期されていないことが判明した。
AAプレフィックスはソートロジックのNaN問題の影響を受けないため、ソートバグだけが原因ではない。

コードの詳細調査により、以下の複数の根本原因が特定された：

1. **Google Sheets APIクォータ超過**（最有力・過去に実証済み）
2. **ソートロジックのNaN問題**（CC205に影響・確定）
3. **readAll()の二重呼び出し**（クォータ消費を悪化させる）

修正方針：
- 主要修正: Phase 4.5とPhase 4.6でGoogleSheetsClientを共有し、APIリクエスト数を削減する
- 副次修正: ソートロジックをプレフィックスに依存しない汎用的な実装に変更する

## Glossary

- **Bug_Condition (C)**: バグが発生する条件 — スプレッドシートに存在する物件がDBのproperty_listingsテーブルに追加されない
- **Property (P)**: 期待される正しい動作 — 全プレフィックス形式の物件番号が正しく検出・追加される
- **Preservation**: 修正によって変更されてはならない既存の動作 — AAプレフィックス物件の同期、is_hiddenフィルタリング、他のAPIエンドポイントの動作
- **detectNewProperties**: PropertyListingSyncService内のメソッド。スプレッドシートにあってDBにない物件番号を検出する
- **syncNewProperties**: PropertyListingSyncService内のメソッド。detectNewPropertiesを呼び出し、新規物件をDBに追加する
- **syncNewPropertyAddition**: EnhancedAutoSyncService内のメソッド。Phase 4.6を実行する
- **property_listings**: 公開物件サイトのデータソースとなるSupabaseテーブル
- **Phase 4.6**: EnhancedAutoSyncService.runFullSync()内の新規物件追加同期フェーズ
- **クォータ超過**: Google Sheets APIの1分あたり60リクエスト制限を超えた状態

## Bug Details

### Bug Condition

Phase 4.5〜4.8の各フェーズが毎回独立してGoogleSheetsClientを作成しreadAll()を呼ぶため、
1回のrunFullSyncで物件リストスプレッドシートへのAPIリクエストが最低4〜5回発生する。
これによりGoogle Sheets APIのクォータを超過し、Phase 4.6が失敗してCC205・AA13774が追加されない。

また、CC205のような非AAプレフィックスの物件番号では、ソートロジックのNaN問題も発生する。

**Formal Specification:**

```
FUNCTION isBugCondition(propertyNumber)
  INPUT: propertyNumber of type string
  OUTPUT: boolean

  RETURN propertyNumber IS IN spreadsheet_物件シート
         AND propertyNumber IS NOT IN property_listings
         AND (
           googleSheetsApiQuotaExceeded()
           OR (
             prefix(propertyNumber) != 'AA'
             AND sortBehaviorIsUndefined(propertyNumber)
           )
         )
END FUNCTION
```

### Examples

- CC205がスプレッドシートに存在し、DBに存在しない場合：
  - クォータ超過時: Phase 4.6全体が失敗 → CC205は追加されない
  - クォータ正常時: parseInt('CC205'.replace('AA', ''), 10) → NaN → ソート不定 → 処理が不安定
  - 期待: CC205がDBに追加される

- AA13774がスプレッドシートに存在し、DBに存在しない場合：
  - クォータ超過時: Phase 4.6全体が失敗 → AA13774は追加されない
  - クォータ正常時: parseInt('AA13774'.replace('AA', ''), 10) → 13774 → ソート正常 → 追加されるはず
  - 期待: AA13774がDBに追加される
  - 重要: AA13774が同期されないのはクォータ超過が原因であり、ソートバグの影響ではない

- syncNewProperties内でのreadAll()の二重呼び出し：
  - detectNewProperties()で1回目のreadAll()（物件番号収集）
  - syncNewProperties()内で2回目のreadAll()（スプレッドシートデータ取得）
  - 合計2回のAPIリクエストが発生（Phase 4.6だけで）

## Expected Behavior

### Preservation Requirements

**変更されない動作:**
- AAプレフィックスの物件（AA13501など）の同期は引き続き正常に動作する
- is_hidden = trueの物件は公開一覧から引き続き除外される
- atbb_statusによる公開フィルタリングは変更されない
- 売主管理システム（backend/src/）の動作は影響を受けない
- 公開物件サイトの他のAPIエンドポイント（画像取得、詳細取得など）は変更されない
- Phase 4.5（物件リスト更新同期）の動作は変更されない

**スコープ:**
修正は以下の2箇所に限定する：
1. PropertyListingSyncService.detectNewProperties()のソートロジック
2. EnhancedAutoSyncService.runFullSync()内でのGoogleSheetsClient共有化

## Hypothesized Root Cause

コードの詳細調査により、以下の根本原因を特定した：

1. **Google Sheets APIクォータ超過**（最有力・過去に実証済み）
   - backend/CC100_SYNC_ISSUE_REPORT.mdに同様の問題が記録されている（2026年1月26日）
   - Phase 4.5: syncPropertyListingUpdates → 新しいGoogleSheetsClientを作成 → readAll() 1回
   - Phase 4.6: syncNewPropertyAddition → 新しいGoogleSheetsClientを作成 → readAll() 2回（detectNewPropertiesで1回 + syncNewPropertiesで1回）
   - Phase 4.8: syncHiddenPropertyListings → 新しいGoogleSheetsClientを作成 → readAll() 1回
   - 合計: 1回のrunFullSyncで物件リストスプレッドシートへ最低4回のAPIリクエスト
   - 5分ごとに実行されるため、短時間に大量のリクエストが発生しクォータを超過

2. **ハードコードされたAAプレフィックス前提のソートロジック**（CC205に影響・確定）
   - backend/src/services/PropertyListingSyncService.tsのdetectNewProperties()メソッド（行975-979）
   - CC205ではreplace('AA', '')が何も置換せず、parseIntがNaNを返す
   - JavaScriptのArray.sortはNaNを含む比較で不定動作になる
   - ただし、差分検出自体は正しく動作しており、ソートは処理順序の最適化のみ

3. **syncNewProperties内でのreadAll()の二重呼び出し**（確定）
   - detectNewProperties()で1回目のreadAll()
   - syncNewProperties()内で2回目のreadAll()（スプレッドシートデータ取得）
   - 同じデータを2回取得しており、APIリクエストの無駄遣い

## Correctness Properties

Property 1: Bug Condition - 新規物件の同期

_For any_ 物件番号において、バグ条件が成立する（isBugConditionがtrueを返す）場合、
修正後の同期処理は当該物件番号をproperty_listingsテーブルに正しく追加するべきである。
これはCC205（CCプレフィックス）とAA13774（AAプレフィックス）の両方に適用される。

**Validates: Requirements 2.1, 2.4**

Property 2: Preservation - 既存物件の同期動作維持

_For any_ 物件番号において、バグ条件が成立しない（isBugConditionがfalseを返す）場合、
修正後の同期処理は修正前と同一の結果を返し、
既存の同期動作（AAプレフィックス物件の追加・更新・削除）を変更しないべきである。

**Validates: Requirements 3.1, 3.4**

## Fix Implementation

### Changes Required

**File 1**: `backend/src/services/PropertyListingSyncService.ts`

**Function**: `detectNewProperties`

**Change 1: ソートロジックの汎用化**

変更前（バグあり）:

```typescript
newProperties.sort((a, b) => {
  const numA = parseInt(a.replace('AA', ''), 10);
  const numB = parseInt(b.replace('AA', ''), 10);
  return numA - numB;
});
```

変更後（修正済み）:

```typescript
newProperties.sort((a, b) => {
  const prefixA = a.replace(/[0-9]/g, '');
  const prefixB = b.replace(/[0-9]/g, '');
  const numA = parseInt(a.replace(/^[A-Za-z]+/, ''), 10);
  const numB = parseInt(b.replace(/^[A-Za-z]+/, ''), 10);
  if (prefixA !== prefixB) return prefixA.localeCompare(prefixB);
  if (isNaN(numA) || isNaN(numB)) return a.localeCompare(b);
  return numA - numB;
});
```

**Change 2: readAll()の二重呼び出しを解消**

detectNewProperties()の戻り値にスプレッドシートデータも含めることで、
syncNewProperties()内での2回目のreadAll()を不要にする。

```typescript
// detectNewPropertiesの戻り値を拡張
async detectNewProperties(): Promise<{
  newPropertyNumbers: string[];
  spreadsheetRows: Map<string, any>;
}> {
  // ...既存の差分検出ロジック...
  const spreadsheetRows = new Map(
    spreadsheetData.map(row => [String(row['物件番号'] || '').trim(), row])
  );
  return { newPropertyNumbers: newProperties, spreadsheetRows };
}

// syncNewPropertiesでは取得済みデータを再利用（readAll()不要）
async syncNewProperties(): Promise<...> {
  const { newPropertyNumbers, spreadsheetRows } = await this.detectNewProperties();
  // spreadsheetRowsを直接使用（readAll()を再度呼ばない）
}
```

**File 2**: `backend/src/services/EnhancedAutoSyncService.ts`

**Function**: `runFullSync`

**Change 3: Phase 4.5とPhase 4.6でGoogleSheetsClientを共有**

runFullSync内でPhase 4.5とPhase 4.6を実行する前に、1回だけGoogleSheetsClientを作成して
PropertyListingSyncServiceインスタンスを共有する。

```typescript
// Phase 4.5と4.6の前に共有クライアントを1回だけ作成
const { GoogleSheetsClient } = await import('./GoogleSheetsClient');
const { PropertyListingSyncService } = await import('./PropertyListingSyncService');
const sharedSheetsClient = new GoogleSheetsClient({
  spreadsheetId: '1tI_iXaiLuWBggs5y0RH7qzkbHs9wnLLdRekAmjkhcLY',
  sheetName: '物件',
  serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json',
});
await sharedSheetsClient.authenticate();
const sharedSyncService = new PropertyListingSyncService(sharedSheetsClient);

// Phase 4.5: 共有サービスを使用
const plResult = await sharedSyncService.syncUpdatedPropertyListings();

// Phase 4.6: 同じ共有サービスを使用（新しいクライアントを作成しない）
const newPropResult = await sharedSyncService.syncNewProperties();
```

効果: 1回のrunFullSyncで物件リストスプレッドシートへのAPIリクエストが4〜5回から1〜2回に削減される。

## Testing Strategy

### Validation Approach

2フェーズのアプローチ：まず未修正コードでバグを再現し、次に修正後の動作を検証する。

### Exploratory Bug Condition Checking

**Goal**: 未修正コードでCC205・AA13774が同期されない原因を確認する。

**Test Plan**:
1. detectNewPropertiesのソートロジックを単体テストで検証（CC205のNaN問題）
2. runFullSync実行時のAPIリクエスト数をカウントし、クォータ超過の可能性を確認

**Test Cases**:
1. CC205ソートテスト: ['CC205', 'AA100', 'AA200']をソートした場合、CC205の位置が不定になることを確認（未修正コードで失敗）
2. NaN検出テスト: parseInt('CC205'.replace('AA', ''), 10)がNaNを返すことを確認
3. AA13774ソートテスト: ['AA13774', 'AA100']をソートした場合、正しくソートされることを確認（ソートバグの影響なし）
4. APIリクエスト数テスト: runFullSync実行時に物件リストスプレッドシートへのAPIリクエストが何回発生するかカウント

**Expected Counterexamples**:
- parseInt('CC205'.replace('AA', ''), 10) → NaN
- NaN - NaN → NaN（ソート比較が不定）
- クォータ超過時: Phase 4.6が「New property addition sync failed: Quota exceeded」エラーで失敗

### Fix Checking

**Goal**: 修正後、CC205・AA13774の両方が正しく検出・追加されることを検証する。

**Pseudocode:**

```
FOR ALL propertyNumber WHERE isBugCondition(propertyNumber) DO
  result := syncNewProperties_fixed()
  ASSERT propertyNumber IN property_listings
  ASSERT result.added > 0
END FOR
```

### Preservation Checking

**Goal**: 修正後、AAプレフィックス物件の同期動作が変わらないことを検証する。

**Pseudocode:**

```
FOR ALL propertyNumber WHERE NOT isBugCondition(propertyNumber) DO
  ASSERT detectNewProperties_original([propertyNumber]) = detectNewProperties_fixed([propertyNumber])
END FOR
```

**Testing Approach**: プロパティベーステストを推奨。
- ランダムなAAプレフィックス物件番号を生成して、修正前後で同一の結果を返すことを検証

**Test Cases**:
1. AAプレフィックス保全テスト: AA13501〜AA13600の範囲でソートが正しく動作することを確認
2. 混在ソートテスト: AA・CC・BBが混在する配列が正しくソートされることを確認
3. APIリクエスト削減テスト: 修正後、Phase 4.5+4.6でreadAll()の呼び出し回数が削減されることを確認

### Unit Tests

- detectNewPropertiesのソートロジックに対する単体テスト（各プレフィックス形式）
- parseIntの挙動確認テスト（NaN検出）
- 修正後のソート関数に対するエッジケーステスト（空文字、数字のみ、アルファベットのみ）
- syncNewProperties内でのreadAll()呼び出し回数テスト

### Property-Based Tests

- ランダムなプレフィックス（AA, BB, CC）と番号の組み合わせを生成し、ソート後の配列が正しい順序になることを検証
- 修正前後で、AAプレフィックス物件のみの配列に対するソート結果が同一であることを検証

### Integration Tests

- Phase 4.6（syncNewPropertyAddition）を実行し、CC205・AA13774がDBに追加されることを確認
- 修正後、/api/public/propertiesエンドポイントがCC205・AA13774を返すことを確認
- 既存のAA物件が引き続き正常に表示されることを確認
- 修正後のAPIリクエスト数が削減されていることを確認（クォータ超過リスクの低減）
