# Implementation Plan

- [x] 1. バグ条件の探索テストを作成する
  - **Property 1: Bug Condition** - 新規物件の同期失敗（CC205・AA13774）
  - **CRITICAL**: このテストは未修正コードで**FAIL**することが期待される — 失敗がバグの存在を証明する
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: このテストは期待される動作をエンコードしており、修正後にパスすることで修正を検証する
  - **GOAL**: バグが存在することを示すカウンターエグザンプルを発見する
  - **Scoped PBT Approach**: 決定論的なバグのため、具体的な失敗ケースにスコープを絞る
  - テスト1: `parseInt('CC205'.replace('AA', ''), 10)` が `NaN` を返すことを確認
  - テスト2: `['CC205', 'AA100', 'AA200']` を未修正のソートロジックでソートした場合、CC205の位置が不定になることを確認
  - テスト3: `NaN - NaN` が `NaN` を返し、ソート比較が不定動作になることを確認
  - テスト4: `detectNewProperties()` 内で `readAll()` が2回呼ばれることを確認（二重呼び出しの検証）
  - 未修正コードでテストを実行する
  - **EXPECTED OUTCOME**: テストが**FAIL**する（これが正しい — バグの存在を証明する）
  - カウンターエグザンプルを記録して根本原因を理解する
  - テストを作成・実行し、失敗を記録したらタスク完了とする
  - _Requirements: 1.1, 1.3_

- [x] 2. 保全プロパティテストを作成する（修正前に実施）
  - **Property 2: Preservation** - AAプレフィックス物件の同期動作維持
  - **IMPORTANT**: 観察優先メソドロジーに従う
  - 未修正コードで非バグ条件の入力（AAプレフィックス物件）の動作を観察する
  - 観察1: `['AA13501', 'AA100', 'AA200']` を未修正ソートロジックでソートした場合、正しく数値順にソートされることを確認
  - 観察2: `parseInt('AA13501'.replace('AA', ''), 10)` が `13501` を返すことを確認
  - 観察3: `detectNewProperties(['AA13501'])` が `['AA13501']` を返すことを確認（差分検出は正常）
  - プロパティベーステスト: ランダムなAAプレフィックス物件番号（AA10000〜AA99999）を生成し、未修正ソートロジックで正しくソートされることを検証
  - 未修正コードでテストを実行する
  - **EXPECTED OUTCOME**: テストが**PASS**する（これが正しい — 保全すべきベースライン動作を確認する）
  - テストを作成・実行し、未修正コードでパスすることを確認したらタスク完了とする
  - _Requirements: 3.1, 3.4_

- [x] 3. CC205・AA13774物件同期バグの修正

  - [x] 3.1 PropertyListingSyncService.tsのソートロジックを汎用化する
    - `backend/src/services/PropertyListingSyncService.ts` の `detectNewProperties()` メソッドを修正
    - 変更前（バグあり）:
      ```typescript
      newProperties.sort((a, b) => {
        const numA = parseInt(a.replace('AA', ''), 10);
        const numB = parseInt(b.replace('AA', ''), 10);
        return numA - numB;
      });
      ```
    - 変更後（修正済み）:
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
    - _Bug_Condition: isBugCondition(propertyNumber) where prefix(propertyNumber) != 'AA' AND sortBehaviorIsUndefined(propertyNumber)_
    - _Expected_Behavior: 全プレフィックス形式の物件番号が正しくソートされ、detectNewProperties()が安定した結果を返す_
    - _Preservation: AAプレフィックス物件のソート動作は変更されない_
    - _Requirements: 2.1, 2.4_

  - [x] 3.2 detectNewProperties()の戻り値にスプレッドシートデータを含めてreadAll()の二重呼び出しを解消する
    - `backend/src/services/PropertyListingSyncService.ts` の `detectNewProperties()` の戻り値を拡張
    - `spreadsheetRows: Map<string, any>` を戻り値に追加する
    - `syncNewProperties()` 内での2回目の `readAll()` 呼び出しを削除し、`detectNewProperties()` から受け取ったデータを再利用する
    - _Bug_Condition: syncNewProperties内でreadAll()が2回呼ばれ、APIリクエストが無駄に消費される_
    - _Expected_Behavior: Phase 4.6全体でreadAll()の呼び出しが1回に削減される_
    - _Preservation: syncNewProperties()の同期結果（追加される物件）は変更されない_
    - _Requirements: 2.1, 2.4_

  - [x] 3.3 EnhancedAutoSyncService.tsでPhase 4.5とPhase 4.6のGoogleSheetsClientを共有する
    - `backend/src/services/EnhancedAutoSyncService.ts` の `runFullSync()` メソッドを修正
    - Phase 4.5とPhase 4.6の前に、1回だけ `GoogleSheetsClient` を作成して `PropertyListingSyncService` インスタンスを共有する
    - 変更前: Phase 4.5とPhase 4.6がそれぞれ独立して `GoogleSheetsClient` を作成する
    - 変更後:
      ```typescript
      // Phase 4.5と4.6の前に共有クライアントを1回だけ作成
      const sharedSheetsClient = new GoogleSheetsClient({ ... });
      await sharedSheetsClient.authenticate();
      const sharedSyncService = new PropertyListingSyncService(sharedSheetsClient);

      // Phase 4.5: 共有サービスを使用
      const plResult = await sharedSyncService.syncUpdatedPropertyListings();

      // Phase 4.6: 同じ共有サービスを使用（新しいクライアントを作成しない）
      const newPropResult = await sharedSyncService.syncNewProperties();
      ```
    - 効果: 1回のrunFullSyncで物件リストスプレッドシートへのAPIリクエストが4〜5回から1〜2回に削減される
    - _Bug_Condition: isBugCondition(propertyNumber) where googleSheetsApiQuotaExceeded()_
    - _Expected_Behavior: Phase 4.6が正常に完了し、CC205・AA13774がproperty_listingsに追加される_
    - _Preservation: Phase 4.5（物件リスト更新同期）の動作は変更されない_
    - _Requirements: 2.1, 2.4, 3.4_

  - [x] 3.4 バグ条件の探索テストが修正後にパスすることを確認する
    - **Property 1: Expected Behavior** - 新規物件の同期成功（CC205・AA13774）
    - **IMPORTANT**: タスク1で作成した**同じテスト**を再実行する — 新しいテストを書かない
    - タスク1のテストは期待される動作をエンコードしており、修正後にパスすることで修正を検証する
    - テスト1: `parseInt('CC205'.replace(/^[A-Za-z]+/, ''), 10)` が `205` を返すことを確認
    - テスト2: `['CC205', 'AA100', 'AA200']` を修正後のソートロジックでソートした場合、`['AA100', 'AA200', 'CC205']` になることを確認
    - テスト3: `detectNewProperties()` 内で `readAll()` が1回だけ呼ばれることを確認
    - 修正後のコードでテストを実行する
    - **EXPECTED OUTCOME**: テストが**PASS**する（バグが修正されたことを確認する）
    - _Requirements: 2.1, 2.4_

  - [x] 3.5 保全テストが引き続きパスすることを確認する
    - **Property 2: Preservation** - AAプレフィックス物件の同期動作維持
    - **IMPORTANT**: タスク2で作成した**同じテスト**を再実行する — 新しいテストを書かない
    - 修正後のコードで保全プロパティテストを実行する
    - **EXPECTED OUTCOME**: テストが**PASS**する（リグレッションがないことを確認する）
    - 全てのAAプレフィックス物件のソート動作が変わらないことを確認する

- [x] 4. チェックポイント — 全テストのパスを確認する
  - タスク1のバグ条件テストがパスすることを確認する
  - タスク2の保全テストがパスすることを確認する
  - TypeScriptのコンパイルエラーがないことを確認する（getDiagnosticsを使用）
  - 疑問点があればユーザーに確認する
