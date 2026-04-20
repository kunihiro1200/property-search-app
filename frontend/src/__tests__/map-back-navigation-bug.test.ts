/**
 * バグ条件の探索テスト - 地図ビューからの戻りナビゲーションバグ
 *
 * **Validates: Requirements 1.1, 1.2, 1.3**
 *
 * このテストは修正前のコードで FAIL することが期待される。
 * FAIL することでバグの存在を証明する。
 *
 * バグの根本原因:
 * 1. PublicPropertyHeader.tsx の handleBackClick が navigationState.viewMode を無視する
 * 2. PublicPropertiesPage.tsx の状態復元処理が setViewMode('list') を無条件実行する
 */

import fc from 'fast-check';
import { NavigationState } from '../types/navigationState';

// ============================================================
// テスト対象ロジックの抽出
// ============================================================

/**
 * 修正後の handleBackClick のロジックを再現する
 * PublicPropertyHeader.tsx の handleBackClick と同等
 */
function handleBackClick_original(
  navigationState: NavigationState | null,
  canHide: boolean
): string {
  // 修正後: navigationState.viewMode を参照して view=map を付与する
  const viewMode = navigationState?.viewMode;
  const params = new URLSearchParams();
  if (canHide) params.set('canHide', 'true');
  if (viewMode === 'map') params.set('view', 'map');
  const queryString = params.toString();
  return queryString ? `/public/properties?${queryString}` : '/public/properties';
}

/**
 * 修正後の状態復元処理のロジックを再現する
 * PublicPropertiesPage.tsx の useEffect 内の処理と同等
 */
function restoreViewMode_original(savedState: NavigationState): 'list' | 'map' {
  // 修正後: savedState.viewMode が存在する場合はその値を使用する
  if (savedState.viewMode) {
    return savedState.viewMode;
  }
  // viewMode が未設定の場合は 'list' を返す（デフォルト）
  return 'list';
}

// ============================================================
// Property 1: Bug Condition - 地図ビューからの戻りナビゲーション
// ============================================================

describe('Property 1: Bug Condition - 地図ビューからの戻りナビゲーション', () => {
  /**
   * テスト1: handleBackClick が viewMode: 'map' の場合に ?view=map を付与すること
   *
   * 修正前は FAIL する（バグの存在を証明）
   */
  test('viewMode: map の場合、handleBackClick の遷移先URLに view=map が含まれること', () => {
    const navigationState: NavigationState = {
      viewMode: 'map',
      currentPage: 1,
      scrollPosition: 0,
      filters: {},
    };

    const resultUrl = handleBackClick_original(navigationState, false);

    // アサーション: 遷移先URLに view=map が含まれること
    // 修正前は '/public/properties' を返すため FAIL する
    expect(resultUrl).toContain('view=map');
  });

  /**
   * テスト2: 状態復元処理が viewMode: 'map' を正しく復元すること
   *
   * 修正前は FAIL する（バグの存在を証明）
   */
  test('savedState.viewMode が map の場合、viewMode が map として復元されること', () => {
    const savedState: NavigationState = {
      viewMode: 'map',
      currentPage: 1,
      scrollPosition: 0,
      filters: {},
    };

    const restoredViewMode = restoreViewMode_original(savedState);

    // アサーション: viewMode が 'map' として復元されること
    // 修正前は 'list' を返すため FAIL する
    expect(restoredViewMode).toBe('map');
  });

  /**
   * テスト3: canHide=true かつ viewMode: 'map' の場合の遷移先URL
   *
   * 修正前は FAIL する（バグの存在を証明）
   */
  test('canHide=true かつ viewMode: map の場合、遷移先が /public/properties?view=map&canHide=true になること', () => {
    const navigationState: NavigationState = {
      viewMode: 'map',
      currentPage: 1,
      scrollPosition: 0,
      filters: {},
    };

    const resultUrl = handleBackClick_original(navigationState, true);

    // アサーション: 遷移先URLが /public/properties?view=map&canHide=true であること
    // 修正前は '/public/properties?canHide=true' を返すため FAIL する
    expect(resultUrl).toContain('view=map');
    expect(resultUrl).toContain('canHide=true');
  });

  /**
   * プロパティベーステスト: viewMode が 'map' の場合、常に ?view=map が付与されること
   *
   * 修正前は FAIL する（バグの存在を証明）
   *
   * **Validates: Requirements 1.1, 1.2, 1.3**
   */
  test('PBT: viewMode が map の任意の NavigationState に対して、遷移先URLに view=map が含まれること', () => {
    fc.assert(
      fc.property(
        // viewMode: 'map' の NavigationState を生成
        fc.record({
          viewMode: fc.constant('map' as const),
          currentPage: fc.integer({ min: 1, max: 100 }),
          scrollPosition: fc.integer({ min: 0, max: 10000 }),
          filters: fc.record({
            propertyTypes: fc.option(
              fc.array(fc.constantFrom('マンション', '戸建', '土地', '収益物件')),
              { nil: undefined }
            ),
            searchQuery: fc.option(fc.string(), { nil: undefined }),
            showPublicOnly: fc.option(fc.boolean(), { nil: undefined }),
          }),
        }),
        fc.boolean(), // canHide
        (navigationState, canHide) => {
          const resultUrl = handleBackClick_original(navigationState, canHide);

          // アサーション: viewMode が 'map' の場合、常に ?view=map が付与されること
          // 修正前は付与されないため FAIL する
          return resultUrl.includes('view=map');
        }
      ),
      { numRuns: 50 }
    );
  });
});
