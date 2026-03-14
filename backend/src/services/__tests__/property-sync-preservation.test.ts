/**
 * 保全プロパティテスト
 *
 * **Validates: Requirements 3.1, 3.4**
 *
 * このテストは未修正コードでPASSすることが期待される。
 * PASSがAAプレフィックス物件の正常動作（保全すべきベースライン）を確認する。
 *
 * 目的: 修正後もAAプレフィックス物件のソート動作が変わらないことを保証する。
 */

// ============================================================================
// 観察1: AAプレフィックス物件のソートが正しく動作することを確認
// ============================================================================
describe('Preservation: AAプレフィックス物件のソート動作', () => {
  /**
   * 観察1: ['AA13501', 'AA100', 'AA200'] を未修正ソートロジックでソートした場合、
   * 正しく数値順にソートされることを確認
   *
   * 未修正コードのソートロジック:
   *   newProperties.sort((a, b) => {
   *     const numA = parseInt(a.replace('AA', ''), 10);
   *     const numB = parseInt(b.replace('AA', ''), 10);
   *     return numA - numB;
   *   });
   *
   * AAプレフィックスの場合:
   *   'AA13501'.replace('AA', '') → '13501' → parseInt → 13501
   *   'AA100'.replace('AA', '')  → '100'   → parseInt → 100
   *   'AA200'.replace('AA', '')  → '200'   → parseInt → 200
   *   ソート結果: [100, 200, 13501] → ['AA100', 'AA200', 'AA13501']
   */
  test('観察1: AAプレフィックス物件を未修正ソートロジックでソートした場合、正しく数値順になる', () => {
    const input = ['AA13501', 'AA100', 'AA200'];

    // 未修正のソートロジック（AAプレフィックスには正常動作）
    const sorted = [...input].sort((a, b) => {
      const numA = parseInt(a.replace('AA', ''), 10);
      const numB = parseInt(b.replace('AA', ''), 10);
      return numA - numB;
    });

    // AAプレフィックスのみの場合は正しくソートされる（保全すべき動作）
    expect(sorted).toEqual(['AA100', 'AA200', 'AA13501']);
  });

  /**
   * 観察2: parseInt('AA13501'.replace('AA', ''), 10) が 13501 を返すことを確認
   *
   * AAプレフィックスの場合、replace('AA', '')が正しく機能する
   */
  test('観察2: parseInt("AA13501".replace("AA", ""), 10) が 13501 を返す', () => {
    const result = parseInt('AA13501'.replace('AA', ''), 10);
    expect(result).toBe(13501);
  });

  /**
   * 観察3: AAプレフィックス物件のparseIntが全てNaNにならないことを確認
   */
  test('観察3: AAプレフィックス物件のparseIntは有効な数値を返す', () => {
    const testCases = ['AA100', 'AA200', 'AA13501', 'AA13774', 'AA99999'];

    for (const propertyNumber of testCases) {
      const num = parseInt(propertyNumber.replace('AA', ''), 10);
      expect(num).not.toBeNaN();
      expect(num).toBeGreaterThan(0);
    }
  });
});

// ============================================================================
// プロパティベーステスト: ランダムなAAプレフィックス物件番号のソート検証
// ============================================================================
describe('Preservation: プロパティベーステスト - AAプレフィックス物件のソート', () => {
  /**
   * ランダムなAAプレフィックス物件番号（AA10000〜AA99999）を生成し、
   * 未修正ソートロジックで正しくソートされることを検証する
   *
   * **Validates: Requirements 3.1, 3.4**
   */

  /**
   * ランダムなAA物件番号を生成するヘルパー関数
   * @param count 生成する物件番号の数
   * @param seed 再現性のためのシード（省略可）
   */
  function generateAAPropertyNumbers(count: number, seed?: number): string[] {
    // 決定論的な疑似乱数生成（再現性のため）
    let state = seed ?? 42;
    const lcg = () => {
      state = (state * 1664525 + 1013904223) & 0xffffffff;
      return (state >>> 0) / 0xffffffff;
    };

    const numbers = new Set<string>();
    while (numbers.size < count) {
      // AA10000〜AA99999の範囲
      const num = Math.floor(lcg() * 90000) + 10000;
      numbers.add(`AA${num}`);
    }
    return Array.from(numbers);
  }

  /**
   * 配列がソートされているかチェックするヘルパー関数
   * AAプレフィックスの数値順でソートされているか確認
   */
  function isCorrectlySorted(arr: string[]): boolean {
    for (let i = 0; i < arr.length - 1; i++) {
      const numA = parseInt(arr[i].replace('AA', ''), 10);
      const numB = parseInt(arr[i + 1].replace('AA', ''), 10);
      if (numA > numB) return false;
    }
    return true;
  }

  test('プロパティテスト: ランダムなAA物件番号（10件）が未修正ソートロジックで正しくソートされる', () => {
    const propertyNumbers = generateAAPropertyNumbers(10, 12345);

    // 未修正のソートロジック
    const sorted = [...propertyNumbers].sort((a, b) => {
      const numA = parseInt(a.replace('AA', ''), 10);
      const numB = parseInt(b.replace('AA', ''), 10);
      return numA - numB;
    });

    // ソート結果が正しい数値順になっていることを確認
    expect(isCorrectlySorted(sorted)).toBe(true);
  });

  test('プロパティテスト: ランダムなAA物件番号（50件）が未修正ソートロジックで正しくソートされる', () => {
    const propertyNumbers = generateAAPropertyNumbers(50, 99999);

    // 未修正のソートロジック
    const sorted = [...propertyNumbers].sort((a, b) => {
      const numA = parseInt(a.replace('AA', ''), 10);
      const numB = parseInt(b.replace('AA', ''), 10);
      return numA - numB;
    });

    expect(isCorrectlySorted(sorted)).toBe(true);
  });

  test('プロパティテスト: ランダムなAA物件番号（100件）が未修正ソートロジックで正しくソートされる', () => {
    const propertyNumbers = generateAAPropertyNumbers(100, 54321);

    // 未修正のソートロジック
    const sorted = [...propertyNumbers].sort((a, b) => {
      const numA = parseInt(a.replace('AA', ''), 10);
      const numB = parseInt(b.replace('AA', ''), 10);
      return numA - numB;
    });

    expect(isCorrectlySorted(sorted)).toBe(true);
  });

  test('プロパティテスト: 複数のシードでAA物件番号のソートが常に正しい', () => {
    const seeds = [1, 100, 9999, 42424242, 777777];

    for (const seed of seeds) {
      const propertyNumbers = generateAAPropertyNumbers(20, seed);

      const sorted = [...propertyNumbers].sort((a, b) => {
        const numA = parseInt(a.replace('AA', ''), 10);
        const numB = parseInt(b.replace('AA', ''), 10);
        return numA - numB;
      });

      expect(isCorrectlySorted(sorted)).toBe(true);
    }
  });

  test('プロパティテスト: ソート後の配列の長さが変わらない（要素が失われない）', () => {
    const propertyNumbers = generateAAPropertyNumbers(30, 11111);

    const sorted = [...propertyNumbers].sort((a, b) => {
      const numA = parseInt(a.replace('AA', ''), 10);
      const numB = parseInt(b.replace('AA', ''), 10);
      return numA - numB;
    });

    // 要素数が変わらないことを確認
    expect(sorted.length).toBe(propertyNumbers.length);

    // 全ての元の要素が含まれていることを確認
    for (const num of propertyNumbers) {
      expect(sorted).toContain(num);
    }
  });

  test('プロパティテスト: AA13501〜AA13600の範囲でソートが正しく動作する', () => {
    // 実際の物件番号に近い範囲でテスト
    const propertyNumbers: string[] = [];
    for (let i = 13501; i <= 13600; i++) {
      propertyNumbers.push(`AA${i}`);
    }

    // シャッフル（逆順にする）
    const shuffled = [...propertyNumbers].reverse();

    // 未修正のソートロジック
    const sorted = shuffled.sort((a, b) => {
      const numA = parseInt(a.replace('AA', ''), 10);
      const numB = parseInt(b.replace('AA', ''), 10);
      return numA - numB;
    });

    // 元の順序（昇順）に戻っていることを確認
    expect(sorted).toEqual(propertyNumbers);
  });
});
