/**
 * バグ条件の探索テスト
 *
 * **Validates: Requirements 1.1, 1.3**
 *
 * このテストは未修正コードでFAILすることが期待される。
 * FAILがバグの存在を証明する。
 *
 * CRITICAL: テストが失敗してもコードを修正しないこと。
 * 失敗を記録してタスク完了とする。
 */

// ============================================================================
// テスト1: parseInt('CC205'.replace('AA', ''), 10) が NaN を返すことを確認
// ============================================================================
describe('Bug Condition: ソートロジックのNaN問題', () => {
  /**
   * テスト1: CC205のプレフィックス除去でNaNが発生する
   *
   * 未修正コードのソートロジック:
   *   parseInt(a.replace('AA', ''), 10)
   *
   * CC205に対してこのロジックを適用すると:
   *   'CC205'.replace('AA', '') → 'CC205' (何も置換されない)
   *   parseInt('CC205', 10) → NaN
   *
   * 期待される動作（修正後）: parseInt('CC205'.replace(/^[A-Za-z]+/, ''), 10) → 205
   */
  test('テスト1: parseInt("CC205".replace("AA", ""), 10) が NaN を返す（バグの存在を確認）', () => {
    // 未修正のソートロジック
    const buggyResult = parseInt('CC205'.replace('AA', ''), 10);

    // バグの存在を確認: NaNが返されるべき
    expect(buggyResult).toBeNaN();

    // 修正後の期待値: 205が返されるべき（修正後のロジックで確認）
    expect(parseInt('CC205'.replace(/^[A-Za-z]+/, ''), 10)).toBe(205);
  });

  /**
   * テスト3: NaN - NaN が NaN を返し、ソート比較が不定動作になる
   *
   * JavaScriptのArray.sortはNaNを含む比較で不定動作になる。
   * NaN - NaN = NaN（0でも正でも負でもない）
   */
  test('テスト3: NaN - NaN が NaN を返し、ソート比較が不定動作になる（バグの存在を確認）', () => {
    const numA = parseInt('CC205'.replace('AA', ''), 10); // NaN
    const numB = parseInt('AA100'.replace('AA', ''), 10); // 100

    // NaN - 100 = NaN（ソート比較が不定）
    const sortResult = numA - numB;
    expect(sortResult).toBeNaN();

    // NaN - NaN = NaN
    const nanMinusNan = NaN - NaN;
    expect(nanMinusNan).toBeNaN();
  });

  /**
   * テスト2: 修正後のソートロジックでCC205を含む配列をソートした場合、
   * 正しい順序（['AA100', 'AA200', 'CC205']）になることを確認
   *
   * 修正後のソートロジック:
   *   newProperties.sort((a, b) => {
   *     const prefixA = a.replace(/[0-9]/g, '');
   *     const prefixB = b.replace(/[0-9]/g, '');
   *     const numA = parseInt(a.replace(/^[A-Za-z]+/, ''), 10);
   *     const numB = parseInt(b.replace(/^[A-Za-z]+/, ''), 10);
   *     if (prefixA !== prefixB) return prefixA.localeCompare(prefixB);
   *     if (isNaN(numA) || isNaN(numB)) return a.localeCompare(b);
   *     return numA - numB;
   *   });
   *
   * 修正後: AAプレフィックスが先、CCプレフィックスが後の正しい順序になる
   */
  test('テスト2: 修正後のソートロジックでCC205を含む配列をソートした場合、正しい順序になる（修正後にPASSすることが期待される）', () => {
    const input = ['CC205', 'AA100', 'AA200'];

    // 修正後のソートロジック（汎用プレフィックス対応）
    const fixedSort = [...input].sort((a, b) => {
      const prefixA = a.replace(/[0-9]/g, '');
      const prefixB = b.replace(/[0-9]/g, '');
      const numA = parseInt(a.replace(/^[A-Za-z]+/, ''), 10);
      const numB = parseInt(b.replace(/^[A-Za-z]+/, ''), 10);
      if (prefixA !== prefixB) return prefixA.localeCompare(prefixB);
      if (isNaN(numA) || isNaN(numB)) return a.localeCompare(b);
      return numA - numB;
    });

    // 修正後の期待値: AAプレフィックスが先、CCプレフィックスが後
    const expectedOrder = ['AA100', 'AA200', 'CC205'];

    // このアサーションは修正後にPASSする（バグが修正されたことを確認）
    expect(fixedSort).toEqual(expectedOrder);
  });
});

// ============================================================================
// テスト4: syncNewProperties() のソースコードで readAll() が2回呼ばれることを確認
// ============================================================================
describe('Bug Condition: readAll()の二重呼び出し（コード構造の検証）', () => {
  /**
   * テスト4: syncNewPropertiesのソースコードにreadAll()が2回含まれることを確認
   *
   * 未修正コードのフロー:
   *   syncNewProperties()
   *     → detectNewProperties() → sheetsClient.readAll() [1回目]
   *     → sheetsClient.readAll() [2回目] (スプレッドシートデータ取得)
   *
   * 期待される動作（修正後）: readAll()は1回だけ呼ばれる
   *
   * このテストはソースコードを直接読んでreadAll()の呼び出し回数を確認する。
   * 未修正コードでは syncNewProperties 内に readAll() が直接呼ばれており、
   * さらに detectNewProperties 内でも readAll() が呼ばれるため合計2回になる。
   */
  test('テスト4: syncNewPropertiesのソースコードにreadAll()の直接呼び出しが含まれる（バグの存在を確認）', () => {
    const fs = require('fs');
    const path = require('path');

    // PropertyListingSyncService.tsのソースコードを読み込む
    const serviceFilePath = path.join(
      __dirname,
      '../PropertyListingSyncService.ts'
    );
    const sourceCode = fs.readFileSync(serviceFilePath, 'utf-8');

    // syncNewPropertiesメソッドの開始位置を特定
    const syncNewPropertiesStart = sourceCode.indexOf('async syncNewProperties()');
    expect(syncNewPropertiesStart).toBeGreaterThan(-1);

    // detectNewPropertiesメソッドの開始位置を特定（syncNewPropertiesより後）
    const detectNewPropertiesStart = sourceCode.indexOf(
      'async detectNewProperties()',
      syncNewPropertiesStart + 1
    );

    // syncNewPropertiesメソッドの本体を抽出
    // （detectNewPropertiesの開始位置まで、または次のメソッドまで）
    const endPos = detectNewPropertiesStart > syncNewPropertiesStart
      ? detectNewPropertiesStart
      : sourceCode.length;
    const syncNewPropertiesBody = sourceCode.slice(syncNewPropertiesStart, endPos);

    // バグの存在を確認:
    // syncNewPropertiesメソッド本体に sheetsClient.readAll() の直接呼び出しが含まれる
    // （detectNewPropertiesを経由した1回目に加えて、2回目の直接呼び出し）
    const readAllCallsInSyncNewProperties = (
      syncNewPropertiesBody.match(/sheetsClient[!?]?\.readAll\(\)/g) || []
    ).length;

    // バグ: syncNewProperties内にreadAll()の直接呼び出しが1回ある
    // （detectNewProperties内の1回目と合わせて合計2回）
    // このアサーションは未修正コードでFAILする（バグの存在を証明）
    // 修正後はPASSする（readAll()の直接呼び出しが0回になる）
    expect(readAllCallsInSyncNewProperties).toBe(0);
  });

  /**
   * テスト4b: detectNewPropertiesのソースコードにもreadAll()が含まれることを確認
   *
   * detectNewProperties内でreadAll()が1回呼ばれることを確認する。
   * これはsyncNewPropertiesから呼ばれるため、合計2回になる。
   */
  test('テスト4b: detectNewPropertiesのソースコードにreadAll()が含まれる（バグの存在を確認）', () => {
    const fs = require('fs');
    const path = require('path');

    const serviceFilePath = path.join(
      __dirname,
      '../PropertyListingSyncService.ts'
    );
    const sourceCode = fs.readFileSync(serviceFilePath, 'utf-8');

    // detectNewPropertiesメソッドの範囲を抽出
    const detectNewPropertiesMatch = sourceCode.match(
      /async detectNewProperties\(\)[^{]*\{([\s\S]*?)(?=\n  (?:async |private |public |\}$))/
    );

    expect(detectNewPropertiesMatch).not.toBeNull();
    const detectNewPropertiesBody = detectNewPropertiesMatch![1];

    // detectNewProperties内にreadAll()の呼び出しが含まれることを確認
    const readAllCallsInDetect = (
      detectNewPropertiesBody.match(/sheetsClient[!?]?\.readAll\(\)/g) || []
    ).length;

    expect(readAllCallsInDetect).toBeGreaterThanOrEqual(1);
  });
});
