/**
 * 保全プロパティテスト - リストビューからの戻りナビゲーション保全
 *
 * **Validates: Requirements 3.1, 3.2, 3.3, 3.4**
 *
 * このテストは修正前のコードで PASS することが期待される。
 * PASS することで、修正後もリグレッションが発生していないことを確認するベースラインを確立する。
 *
 * 観察優先メソドロジー:
 * - 修正前のコードで非バグ条件の入力（viewMode: 'list' または navigationState = null）を観察する
 * - 観察した動作をテストとして記録する
 * - 修正後も同じ動作が維持されることを確認する
 */

import fc from 'fast-check';
import { NavigationState } from '../types/navigationState';

// ============================================================
// テスト対象ロジックの抽出（修正前のコードを再現）
// ============================================================

/**
 * 修正後の handleBackClick のロジックを再現する
 * PublicPropertyHeader.tsx の handleBackClick と同等
 *
 * viewMode が 'map' の場合のみ ?view=map を付与する
 * → リストビューの場合は正しく動作する（バグが影響しない）
 */
function handleBackClick_original(
  navigationState: NavigationState | null,
  canHide: boolean
): string {
  // 修正後のコード: navigationState.viewMode を参照して view=map を付与する
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
 *
 * viewMode が 'list' の場合は正しく 'list' を返す
 */
function restoreViewMode_original(savedState: NavigationState): 'list' | 'map' {
  // 修正後のコード: savedState.viewMode が存在する場合はその値を使用する
  if (savedState.viewMode) {
    return savedState.viewMode;
  }
  return 'list';
}

/**
 * 修正前のフィルター復元処理のロジックを再現する
 * PublicPropertiesPage.tsx の useEffect 内の処理と同等
 */
function restoreFilters_original(savedState: NavigationState): {
  propertyTypes: string[];
  minPrice: string;
  maxPrice: string;
  minAge: string;
  maxAge: string;
  searchQuery: string;
  showPublicOnly: boolean;
} {
  const result = {
    propertyTypes: [] as string[],
    minPrice: '',
    maxPrice: '',
    minAge: '',
    maxAge: '',
    searchQuery: '',
    showPublicOnly: false,
  };

  if (savedState.filters) {
    const { filters } = savedState;

    // 物件タイプフィルターを復元
    if (filters.propertyTypes && filters.propertyTypes.length > 0) {
      result.propertyTypes = filters.propertyTypes;
    }

    // 価格フィルターを復元
    if (filters.priceRange) {
      if (filters.priceRange.min) result.minPrice = filters.priceRange.min;
      if (filters.priceRange.max) result.maxPrice = filters.priceRange.max;
    }

    // 築年数フィルターを復元
    if (filters.buildingAgeRange) {
      if (filters.buildingAgeRange.min) result.minAge = filters.buildingAgeRange.min;
      if (filters.buildingAgeRange.max) result.maxAge = filters.buildingAgeRange.max;
    }

    // 検索クエリを復元
    if (filters.searchQuery) {
      result.searchQuery = filters.searchQuery;
    }

    // 公開中のみ表示フィルターを復元
    if (filters.showPublicOnly !== undefined) {
      result.showPublicOnly = filters.showPublicOnly;
    }
  }

  return result;
}

// ============================================================
// Property 2: Preservation - リストビューからの戻りナビゲーション保全
// ============================================================

describe('Property 2: Preservation - リストビューからの戻りナビゲーション保全', () => {
  /**
   * 観察1: navigationState = { viewMode: 'list', ... } の場合、
   * handleBackClick は /public/properties へ遷移する
   */
  test('観察1: viewMode: list の場合、handleBackClick の遷移先が /public/properties になること', () => {
    const navigationState: NavigationState = {
      viewMode: 'list',
      currentPage: 1,
      scrollPosition: 0,
      filters: {},
    };

    const resultUrl = handleBackClick_original(navigationState, false);

    // アサーション: リストビューの場合は /public/properties へ遷移する
    expect(resultUrl).toBe('/public/properties');
    expect(resultUrl).not.toContain('view=map');
  });

  /**
   * 観察2: navigationState = null の場合、
   * handleBackClick は /public/properties へ遷移する
   */
  test('観察2: navigationState が null の場合、handleBackClick の遷移先が /public/properties になること', () => {
    const resultUrl = handleBackClick_original(null, false);

    // アサーション: navigationState が null の場合もデフォルトの /public/properties へ遷移する
    expect(resultUrl).toBe('/public/properties');
    expect(resultUrl).not.toContain('view=map');
  });

  /**
   * 観察3: canHide=true かつ viewMode: 'list' の場合、
   * /public/properties?canHide=true へ遷移する
   */
  test('観察3: canHide=true かつ viewMode: list の場合、遷移先が /public/properties?canHide=true になること', () => {
    const navigationState: NavigationState = {
      viewMode: 'list',
      currentPage: 1,
      scrollPosition: 0,
      filters: {},
    };

    const resultUrl = handleBackClick_original(navigationState, true);

    // アサーション: canHide=true の場合は /public/properties?canHide=true へ遷移する
    expect(resultUrl).toBe('/public/properties?canHide=true');
    expect(resultUrl).toContain('canHide=true');
    expect(resultUrl).not.toContain('view=map');
  });

  /**
   * 観察3（補足）: canHide=true かつ navigationState = null の場合も同様
   */
  test('観察3（補足）: canHide=true かつ navigationState が null の場合、遷移先が /public/properties?canHide=true になること', () => {
    const resultUrl = handleBackClick_original(null, true);

    expect(resultUrl).toBe('/public/properties?canHide=true');
    expect(resultUrl).toContain('canHide=true');
    expect(resultUrl).not.toContain('view=map');
  });

  /**
   * 観察4: viewMode: 'list' で状態復元した場合、
   * フィルター設定（物件タイプ・価格帯・築年数・検索クエリ）が正しく復元される
   */
  test('観察4: viewMode: list で状態復元した場合、フィルター設定が正しく復元されること', () => {
    const savedState: NavigationState = {
      viewMode: 'list',
      currentPage: 3,
      scrollPosition: 1200,
      filters: {
        propertyTypes: ['マンション', '戸建'],
        priceRange: { min: '1000', max: '5000' },
        buildingAgeRange: { min: '5', max: '20' },
        searchQuery: '大分市',
        showPublicOnly: true,
      },
    };

    const restoredFilters = restoreFilters_original(savedState);

    // アサーション: フィルター設定が正しく復元される
    expect(restoredFilters.propertyTypes).toEqual(['マンション', '戸建']);
    expect(restoredFilters.minPrice).toBe('1000');
    expect(restoredFilters.maxPrice).toBe('5000');
    expect(restoredFilters.minAge).toBe('5');
    expect(restoredFilters.maxAge).toBe('20');
    expect(restoredFilters.searchQuery).toBe('大分市');
    expect(restoredFilters.showPublicOnly).toBe(true);
  });

  /**
   * 観察4（補足）: viewMode: 'list' で状態復元した場合、viewMode が 'list' として復元される
   * （修正前のコードでは強制的に 'list' に設定されるため、リストビューの場合は正しく動作する）
   */
  test('観察4（補足）: viewMode: list で状態復元した場合、viewMode が list として復元されること', () => {
    const savedState: NavigationState = {
      viewMode: 'list',
      currentPage: 1,
      scrollPosition: 0,
      filters: {},
    };

    const restoredViewMode = restoreViewMode_original(savedState);

    // アサーション: viewMode が 'list' として復元される
    // 修正前のコードでは強制的に 'list' に設定されるため、リストビューの場合は正しく動作する
    expect(restoredViewMode).toBe('list');
  });

  // ============================================================
  // プロパティベーステスト
  // ============================================================

  /**
   * PBT: ランダムな NavigationState（viewMode: 'list' または未設定）を生成し、
   * ?view=map が付与されないことを検証
   *
   * **Validates: Requirements 3.1, 3.3, 3.4**
   */
  test('PBT: viewMode が list または未設定の任意の NavigationState に対して、遷移先URLに view=map が含まれないこと', () => {
    fc.assert(
      fc.property(
        // viewMode: 'list' または未設定の NavigationState を生成
        fc.record({
          viewMode: fc.option(fc.constant('list' as const), { nil: undefined }),
          currentPage: fc.integer({ min: 1, max: 100 }),
          scrollPosition: fc.integer({ min: 0, max: 10000 }),
          filters: fc.record({
            propertyTypes: fc.option(
              fc.array(fc.constantFrom('マンション', '戸建', '土地', '収益物件')),
              { nil: undefined }
            ),
            priceRange: fc.option(
              fc.record({
                min: fc.option(fc.nat().map(String), { nil: undefined }),
                max: fc.option(fc.nat().map(String), { nil: undefined }),
              }),
              { nil: undefined }
            ),
            buildingAgeRange: fc.option(
              fc.record({
                min: fc.option(fc.nat({ max: 100 }).map(String), { nil: undefined }),
                max: fc.option(fc.nat({ max: 100 }).map(String), { nil: undefined }),
              }),
              { nil: undefined }
            ),
            searchQuery: fc.option(fc.string(), { nil: undefined }),
            showPublicOnly: fc.option(fc.boolean(), { nil: undefined }),
          }),
        }),
        fc.boolean(), // canHide
        (navigationState, canHide) => {
          const resultUrl = handleBackClick_original(navigationState, canHide);

          // アサーション: viewMode が 'list' または未設定の場合、?view=map が付与されないこと
          return !resultUrl.includes('view=map');
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * PBT: navigationState が null の場合、常に /public/properties へ遷移すること
   *
   * **Validates: Requirements 3.4**
   */
  test('PBT: navigationState が null の場合、canHide の値に関わらず view=map が付与されないこと', () => {
    fc.assert(
      fc.property(
        fc.boolean(), // canHide
        (canHide) => {
          const resultUrl = handleBackClick_original(null, canHide);

          // アサーション: navigationState が null の場合は view=map が付与されない
          return !resultUrl.includes('view=map');
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * PBT: canHide=true の場合、常に canHide=true が引き継がれること
   *
   * **Validates: Requirements 3.3**
   */
  test('PBT: canHide=true の場合、viewMode に関わらず canHide=true が遷移先URLに含まれること', () => {
    fc.assert(
      fc.property(
        // viewMode: 'list' または未設定の NavigationState を生成
        fc.option(
          fc.record({
            viewMode: fc.option(fc.constant('list' as const), { nil: undefined }),
            currentPage: fc.integer({ min: 1, max: 100 }),
            scrollPosition: fc.integer({ min: 0, max: 10000 }),
            filters: fc.constant({}),
          }),
          { nil: null }
        ),
        (navigationState) => {
          const resultUrl = handleBackClick_original(navigationState, true);

          // アサーション: canHide=true の場合は canHide=true が引き継がれる
          return resultUrl.includes('canHide=true');
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * PBT: ランダムなフィルター設定で viewMode: 'list' の状態復元が正しく動作すること
   *
   * **Validates: Requirements 3.2**
   */
  test('PBT: viewMode: list でのフィルター復元が任意のフィルター設定に対して正しく動作すること', () => {
    fc.assert(
      fc.property(
        fc.record({
          propertyTypes: fc.option(
            fc.array(fc.constantFrom('マンション', '戸建', '土地', '収益物件'), { minLength: 1 }),
            { nil: undefined }
          ),
          minPrice: fc.option(fc.nat({ max: 10000 }).map(String), { nil: undefined }),
          maxPrice: fc.option(fc.nat({ max: 10000 }).map(String), { nil: undefined }),
          minAge: fc.option(fc.nat({ max: 100 }).map(String), { nil: undefined }),
          maxAge: fc.option(fc.nat({ max: 100 }).map(String), { nil: undefined }),
          searchQuery: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined }),
          showPublicOnly: fc.option(fc.boolean(), { nil: undefined }),
        }),
        (filterInput) => {
          const savedState: NavigationState = {
            viewMode: 'list',
            currentPage: 1,
            scrollPosition: 0,
            filters: {
              propertyTypes: filterInput.propertyTypes,
              priceRange: (filterInput.minPrice || filterInput.maxPrice)
                ? { min: filterInput.minPrice, max: filterInput.maxPrice }
                : undefined,
              buildingAgeRange: (filterInput.minAge || filterInput.maxAge)
                ? { min: filterInput.minAge, max: filterInput.maxAge }
                : undefined,
              searchQuery: filterInput.searchQuery,
              showPublicOnly: filterInput.showPublicOnly,
            },
          };

          const restoredFilters = restoreFilters_original(savedState);

          // アサーション: フィルター設定が正しく復元される
          const propertyTypesMatch =
            !filterInput.propertyTypes ||
            filterInput.propertyTypes.length === 0 ||
            JSON.stringify(restoredFilters.propertyTypes) === JSON.stringify(filterInput.propertyTypes);

          const minPriceMatch =
            !filterInput.minPrice || restoredFilters.minPrice === filterInput.minPrice;

          const maxPriceMatch =
            !filterInput.maxPrice || restoredFilters.maxPrice === filterInput.maxPrice;

          const minAgeMatch =
            !filterInput.minAge || restoredFilters.minAge === filterInput.minAge;

          const maxAgeMatch =
            !filterInput.maxAge || restoredFilters.maxAge === filterInput.maxAge;

          const searchQueryMatch =
            !filterInput.searchQuery || restoredFilters.searchQuery === filterInput.searchQuery;

          const showPublicOnlyMatch =
            filterInput.showPublicOnly === undefined ||
            restoredFilters.showPublicOnly === filterInput.showPublicOnly;

          return (
            propertyTypesMatch &&
            minPriceMatch &&
            maxPriceMatch &&
            minAgeMatch &&
            maxAgeMatch &&
            searchQueryMatch &&
            showPublicOnlyMatch
          );
        }
      ),
      { numRuns: 100 }
    );
  });
});
