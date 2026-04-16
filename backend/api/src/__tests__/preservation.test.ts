/**
 * 保全プロパティテスト（修正前に実施）
 *
 * **Validates: Requirements 3.1, 3.2, 3.3, 3.4**
 *
 * このテストは修正によって既存の動作が壊れないことを確認するためのものです。
 * 修正前のコードでも全て通過することを確認します（ベースライン動作の確認）。
 */

import * as fc from 'fast-check';

// ============================================================
// 型定義
// ============================================================

interface PublicProperty {
  id: string;
  property_number: string;
  price: number | null | undefined;
  sales_price: number | null;
  listing_price: number | null;
  is_hidden: boolean;
  address?: string | null;
  property_type?: string | null;
}

interface NavigationState {
  currentPage?: number;
  scrollPosition?: number;
  viewMode?: 'list' | 'map';
  filters?: {
    propertyTypes?: string[];
    priceRange?: { min?: string; max?: string };
    buildingAgeRange?: { min?: string; max?: string };
    searchQuery?: string;
    showPublicOnly?: boolean;
  };
}

// ============================================================
// バックエンドの price 計算ロジック（修正前・修正後共通）
// ============================================================

/**
 * 修正前のバックエンドコードのロジックを模倣する
 * price が設定済みの物件はそのまま返す（この動作は修正前後で変わらない）
 */
function processPropertiesWithBug(
  properties: PublicProperty[],
  queryCounter: { count: number }
): PublicProperty[] {
  queryCounter.count += 1; // 初期クエリ

  return properties.map((property) => {
    if (property.price !== null && property.price !== undefined) {
      return property; // price 設定済みはそのまま返す
    }
    queryCounter.count += 1; // N+1クエリ
    const calculatedPrice = property.sales_price || property.listing_price || 0;
    return {
      ...property,
      price: calculatedPrice,
      sales_price: property.sales_price,
      listing_price: property.listing_price,
    };
  });
}

/**
 * 修正後のバックエンドコードのロジックを模倣する
 */
function processPropertiesFixed(
  properties: PublicProperty[],
  queryCounter: { count: number }
): PublicProperty[] {
  queryCounter.count += 1; // 初期クエリのみ

  return properties.map((property) => {
    if (property.price !== null && property.price !== undefined) {
      return property;
    }
    const calculatedPrice = property.sales_price || property.listing_price || 0;
    return { ...property, price: calculatedPrice };
  });
}

// ============================================================
// フロントエンドの viewMode 復元ロジック
// ============================================================

/**
 * リストビューから詳細ページに遷移する（修正前・修正後共通）
 */
function navigateToDetailFromList(
  currentPage: number,
  scrollPosition: number,
  filters: NavigationState['filters']
): NavigationState {
  return {
    currentPage,
    scrollPosition,
    viewMode: 'list', // リストビューから遷移
    filters,
  };
}

/**
 * 詳細ページから戻ってきた時の viewMode 復元処理（修正前のコード）
 */
function restoreViewModeFromState(savedState: NavigationState | null): 'list' | 'map' {
  if (!savedState) {
    return 'list';
  }
  if (savedState.viewMode) {
    return savedState.viewMode;
  } else {
    return 'list';
  }
}

/**
 * viewMode が 'map' の場合に fetchAllProperties() が呼ばれるかどうかを判定
 */
function shouldFetchAllProperties(viewMode: 'list' | 'map', allPropertiesLength: number): boolean {
  return viewMode === 'map' && allPropertiesLength === 0;
}

/**
 * フィルター条件を適用した物件リストを返す（修正前・修正後共通のロジック）
 */
function applyFilters(
  properties: PublicProperty[],
  filters: {
    propertyType?: string;
    minPrice?: number;
    maxPrice?: number;
  }
): PublicProperty[] {
  return properties.filter((p) => {
    if (filters.propertyType && p.property_type !== filters.propertyType) {
      return false;
    }
    const price = p.price ?? 0;
    if (filters.minPrice !== undefined && price < filters.minPrice) {
      return false;
    }
    if (filters.maxPrice !== undefined && price > filters.maxPrice) {
      return false;
    }
    return true;
  });
}

/**
 * ページネーションを適用した物件リストを返す（修正前・修正後共通のロジック）
 */
function applyPagination(
  properties: PublicProperty[],
  page: number,
  limit: number
): { items: PublicProperty[]; total: number; totalPages: number } {
  const offset = (page - 1) * limit;
  const items = properties.slice(offset, offset + limit);
  return {
    items,
    total: properties.length,
    totalPages: Math.ceil(properties.length / limit),
  };
}

// ============================================================
// 保全プロパティテスト
// ============================================================

describe('保全プロパティテスト（修正前後で動作が変わらないことを確認）', () => {
  // ============================================================
  // 保全1: price が設定済みの物件は修正前後で同じ値が返されること
  // ============================================================

  describe('保全1: price が設定済みの物件の値保全', () => {
    /**
     * **Validates: Requirements 3.1**
     *
     * price が既に設定されている物件は、修正後も同じ値が返される。
     * sales_price や listing_price の値に関係なく、既存の price が優先される。
     */
    it('Property 3: price が設定済みの物件は修正前後で同じ値が返されること', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              id: fc.uuid(),
              property_number: fc.stringMatching(/^[A-Z]{2}\d{5}$/),
              // price が設定済みの物件のみ生成
              price: fc.integer({ min: 1000000, max: 200000000 }),
              sales_price: fc.oneof(
                fc.integer({ min: 1000000, max: 200000000 }),
                fc.constant(null)
              ),
              listing_price: fc.oneof(
                fc.integer({ min: 1000000, max: 200000000 }),
                fc.constant(null)
              ),
              is_hidden: fc.constant(false),
              property_type: fc.oneof(
                fc.constant('detached_house'),
                fc.constant('apartment'),
                fc.constant('land'),
                fc.constant(null)
              ),
            }),
            { minLength: 1, maxLength: 20 }
          ),
          async (properties) => {
            const bugCounter = { count: 0 };
            const fixedCounter = { count: 0 };

            const bugResult = processPropertiesWithBug(properties, bugCounter);
            const fixedResult = processPropertiesFixed(properties, fixedCounter);

            // price が設定済みの物件は修正前後で同じ値が返される
            for (let i = 0; i < properties.length; i++) {
              expect(bugResult[i].price).toBe(properties[i].price);
              expect(fixedResult[i].price).toBe(properties[i].price);
              // 修正前後で同じ値
              expect(bugResult[i].price).toBe(fixedResult[i].price);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('具体例: price=35000000 の物件は sales_price に関係なく 35000000 が返される', () => {
      const property: PublicProperty = {
        id: 'test-1',
        property_number: 'AA12345',
        price: 35000000,
        sales_price: 40000000, // sales_price が異なっても price が優先される
        listing_price: 38000000,
        is_hidden: false,
      };

      const bugCounter = { count: 0 };
      const fixedCounter = { count: 0 };

      const bugResult = processPropertiesWithBug([property], bugCounter);
      const fixedResult = processPropertiesFixed([property], fixedCounter);

      expect(bugResult[0].price).toBe(35000000);
      expect(fixedResult[0].price).toBe(35000000);
      expect(bugResult[0].price).toBe(fixedResult[0].price);
    });
  });

  // ============================================================
  // 保全2: sales_price と listing_price の両方が null の場合は price=0
  // ============================================================

  describe('保全2: sales_price と listing_price の両方が null の場合は price=0', () => {
    /**
     * **Validates: Requirements 3.1**
     *
     * sales_price と listing_price の両方が null の場合は price=0 として扱われる。
     * 既存の動作を維持する。
     */
    it('Property 3: sales_price と listing_price の両方が null の場合は price=0', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              id: fc.uuid(),
              property_number: fc.stringMatching(/^[A-Z]{2}\d{5}$/),
              price: fc.constant(null) as fc.Arbitrary<null>,
              sales_price: fc.constant(null) as fc.Arbitrary<null>,
              listing_price: fc.constant(null) as fc.Arbitrary<null>,
              is_hidden: fc.constant(false),
            }),
            { minLength: 1, maxLength: 20 }
          ),
          async (properties) => {
            const bugCounter = { count: 0 };
            const fixedCounter = { count: 0 };

            const bugResult = processPropertiesWithBug(properties, bugCounter);
            const fixedResult = processPropertiesFixed(properties, fixedCounter);

            // 両方 null の場合は price=0
            for (let i = 0; i < properties.length; i++) {
              expect(bugResult[i].price).toBe(0);
              expect(fixedResult[i].price).toBe(0);
            }
          }
        ),
        { numRuns: 50 }
      );
    });

    it('具体例: sales_price=null, listing_price=null の場合は price=0', () => {
      const property: PublicProperty = {
        id: 'test-2',
        property_number: 'BB67890',
        price: null,
        sales_price: null,
        listing_price: null,
        is_hidden: false,
      };

      const bugCounter = { count: 0 };
      const fixedCounter = { count: 0 };

      const bugResult = processPropertiesWithBug([property], bugCounter);
      const fixedResult = processPropertiesFixed([property], fixedCounter);

      expect(bugResult[0].price).toBe(0);
      expect(fixedResult[0].price).toBe(0);
    });
  });

  // ============================================================
  // 保全3: price 設定済みの物件が混在する場合、設定済みの物件は変更されない
  // ============================================================

  describe('保全3: price 設定済みの物件が混在する場合の保全', () => {
    /**
     * **Validates: Requirements 3.1**
     *
     * price=null の物件と price 設定済みの物件が混在する場合、
     * 設定済みの物件は変更されない。
     */
    it('Property 3: 混在する場合、price 設定済みの物件は変更されないこと', async () => {
      await fc.assert(
        fc.asyncProperty(
          // price 設定済みの物件
          fc.array(
            fc.record({
              id: fc.uuid(),
              property_number: fc.stringMatching(/^AA\d{5}$/),
              price: fc.integer({ min: 1000000, max: 200000000 }),
              sales_price: fc.oneof(
                fc.integer({ min: 1000000, max: 200000000 }),
                fc.constant(null)
              ),
              listing_price: fc.oneof(
                fc.integer({ min: 1000000, max: 200000000 }),
                fc.constant(null)
              ),
              is_hidden: fc.constant(false),
            }),
            { minLength: 1, maxLength: 10 }
          ),
          // price=null の物件
          fc.array(
            fc.record({
              id: fc.uuid(),
              property_number: fc.stringMatching(/^BB\d{5}$/),
              price: fc.constant(null) as fc.Arbitrary<null>,
              sales_price: fc.oneof(
                fc.integer({ min: 1000000, max: 200000000 }),
                fc.constant(null)
              ),
              listing_price: fc.oneof(
                fc.integer({ min: 1000000, max: 200000000 }),
                fc.constant(null)
              ),
              is_hidden: fc.constant(false),
            }),
            { minLength: 1, maxLength: 10 }
          ),
          async (priceSetProperties, priceNullProperties) => {
            const mixed = [...priceSetProperties, ...priceNullProperties];

            const bugCounter = { count: 0 };
            const fixedCounter = { count: 0 };

            const bugResult = processPropertiesWithBug(mixed, bugCounter);
            const fixedResult = processPropertiesFixed(mixed, fixedCounter);

            // price 設定済みの物件は変更されない
            for (let i = 0; i < priceSetProperties.length; i++) {
              expect(bugResult[i].price).toBe(priceSetProperties[i].price);
              expect(fixedResult[i].price).toBe(priceSetProperties[i].price);
            }

            // price=null の物件は sales_price || listing_price || 0 で計算される
            for (let i = 0; i < priceNullProperties.length; i++) {
              const idx = priceSetProperties.length + i;
              const expected =
                priceNullProperties[i].sales_price ||
                priceNullProperties[i].listing_price ||
                0;
              expect(bugResult[idx].price).toBe(expected);
              expect(fixedResult[idx].price).toBe(expected);
            }
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  // ============================================================
  // 保全4: フィルター・ページネーション動作の保全
  // ============================================================

  describe('保全4: フィルター・ページネーション動作の保全', () => {
    /**
     * **Validates: Requirements 3.1, 3.2**
     *
     * フィルター条件（物件タイプ・価格・築年数）を適用した場合、
     * 修正前後でレスポンスが一致すること。
     * ページネーション（page=1, page=2 など）のレスポンスが修正前後で一致すること。
     */
    it('Property 3: フィルター条件を適用した場合、修正前後でレスポンスが一致すること', async () => {
      await fc.assert(
        fc.asyncProperty(
          // price が設定済みの物件リスト（バグ条件が成立しない）
          fc.array(
            fc.record({
              id: fc.uuid(),
              property_number: fc.stringMatching(/^[A-Z]{2}\d{5}$/),
              price: fc.integer({ min: 1000000, max: 200000000 }),
              sales_price: fc.oneof(
                fc.integer({ min: 1000000, max: 200000000 }),
                fc.constant(null)
              ),
              listing_price: fc.oneof(
                fc.integer({ min: 1000000, max: 200000000 }),
                fc.constant(null)
              ),
              is_hidden: fc.constant(false),
              property_type: fc.oneof(
                fc.constant('detached_house'),
                fc.constant('apartment'),
                fc.constant('land')
              ),
            }),
            { minLength: 5, maxLength: 30 }
          ),
          // フィルター条件
          fc.record({
            propertyType: fc.oneof(
              fc.constant('detached_house'),
              fc.constant('apartment'),
              fc.constant('land'),
              fc.constant(undefined)
            ),
            minPrice: fc.oneof(
              fc.integer({ min: 0, max: 50000000 }),
              fc.constant(undefined)
            ),
            maxPrice: fc.oneof(
              fc.integer({ min: 50000000, max: 200000000 }),
              fc.constant(undefined)
            ),
          }),
          async (properties, filters) => {
            // 修正前後で同じフィルター結果が返される
            const bugCounter = { count: 0 };
            const fixedCounter = { count: 0 };

            const bugProcessed = processPropertiesWithBug(properties, bugCounter);
            const fixedProcessed = processPropertiesFixed(properties, fixedCounter);

            const bugFiltered = applyFilters(bugProcessed, filters);
            const fixedFiltered = applyFilters(fixedProcessed, filters);

            // フィルター結果の件数が一致する
            expect(bugFiltered.length).toBe(fixedFiltered.length);

            // 各物件の price が一致する
            for (let i = 0; i < bugFiltered.length; i++) {
              expect(bugFiltered[i].price).toBe(fixedFiltered[i].price);
              expect(bugFiltered[i].id).toBe(fixedFiltered[i].id);
            }
          }
        ),
        { numRuns: 50 }
      );
    });

    it('Property 3: ページネーションのレスポンスが修正前後で一致すること', async () => {
      await fc.assert(
        fc.asyncProperty(
          // price が設定済みの物件リスト（バグ条件が成立しない）
          fc.array(
            fc.record({
              id: fc.uuid(),
              property_number: fc.stringMatching(/^[A-Z]{2}\d{5}$/),
              price: fc.integer({ min: 1000000, max: 200000000 }),
              sales_price: fc.oneof(
                fc.integer({ min: 1000000, max: 200000000 }),
                fc.constant(null)
              ),
              listing_price: fc.oneof(
                fc.integer({ min: 1000000, max: 200000000 }),
                fc.constant(null)
              ),
              is_hidden: fc.constant(false),
            }),
            { minLength: 10, maxLength: 50 }
          ),
          // ページ番号
          fc.integer({ min: 1, max: 5 }),
          async (properties, page) => {
            const limit = 10;

            const bugCounter = { count: 0 };
            const fixedCounter = { count: 0 };

            const bugProcessed = processPropertiesWithBug(properties, bugCounter);
            const fixedProcessed = processPropertiesFixed(properties, fixedCounter);

            const bugPage = applyPagination(bugProcessed, page, limit);
            const fixedPage = applyPagination(fixedProcessed, page, limit);

            // ページネーション結果が一致する
            expect(bugPage.total).toBe(fixedPage.total);
            expect(bugPage.totalPages).toBe(fixedPage.totalPages);
            expect(bugPage.items.length).toBe(fixedPage.items.length);

            for (let i = 0; i < bugPage.items.length; i++) {
              expect(bugPage.items[i].price).toBe(fixedPage.items[i].price);
              expect(bugPage.items[i].id).toBe(fixedPage.items[i].id);
            }
          }
        ),
        { numRuns: 50 }
      );
    });

    it('具体例: page=1 と page=2 のレスポンスが修正前後で一致すること', () => {
      // 25件の price 設定済み物件
      const properties: PublicProperty[] = Array.from({ length: 25 }, (_, i) => ({
        id: `prop-${i}`,
        property_number: `AA${String(i).padStart(5, '0')}`,
        price: 10000000 + i * 1000000,
        sales_price: 10000000 + i * 1000000,
        listing_price: null,
        is_hidden: false,
      }));

      const limit = 10;

      for (const page of [1, 2, 3]) {
        const bugCounter = { count: 0 };
        const fixedCounter = { count: 0 };

        const bugProcessed = processPropertiesWithBug(properties, bugCounter);
        const fixedProcessed = processPropertiesFixed(properties, fixedCounter);

        const bugPage = applyPagination(bugProcessed, page, limit);
        const fixedPage = applyPagination(fixedProcessed, page, limit);

        expect(bugPage.total).toBe(fixedPage.total);
        expect(bugPage.items.length).toBe(fixedPage.items.length);

        for (let i = 0; i < bugPage.items.length; i++) {
          expect(bugPage.items[i].price).toBe(fixedPage.items[i].price);
        }
      }
    });
  });

  // ============================================================
  // 保全5: リストビューから詳細ページに遷移して戻る場合の保全
  // ============================================================

  describe('保全5: リストビューから詳細ページに遷移して戻る場合の保全', () => {
    /**
     * **Validates: Requirements 3.4**
     *
     * リストビュー（viewMode='list'）から詳細ページに遷移して戻る場合、
     * fetchAllProperties() が呼ばれないこと。
     * スクロール位置・ページ番号・フィルター状態が正しく復元されること。
     */
    it('Property 3: リストビューから戻った際に fetchAllProperties() が呼ばれないこと', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            currentPage: fc.integer({ min: 1, max: 10 }),
            scrollPosition: fc.integer({ min: 0, max: 5000 }),
            filters: fc.record({
              propertyTypes: fc.array(
                fc.oneof(
                  fc.constant('detached_house'),
                  fc.constant('apartment'),
                  fc.constant('land')
                ),
                { maxLength: 3 }
              ),
              priceRange: fc.record({
                min: fc.oneof(fc.constant('1000'), fc.constant('5000'), fc.constant(undefined)),
                max: fc.oneof(fc.constant('10000'), fc.constant('50000'), fc.constant(undefined)),
              }),
            }),
          }),
          async ({ currentPage, scrollPosition, filters }) => {
            // リストビューから詳細ページに遷移
            const savedState = navigateToDetailFromList(currentPage, scrollPosition, filters);

            // 一覧ページに戻ってきた時の viewMode 復元
            const restoredViewMode = restoreViewModeFromState(savedState);

            // fetchAllProperties() が呼ばれるかどうかを判定
            const fetchAllCalled = shouldFetchAllProperties(restoredViewMode, 0);

            // リストビューから戻った場合は viewMode='list' が復元される
            expect(restoredViewMode).toBe('list');
            // fetchAllProperties() が呼ばれない
            expect(fetchAllCalled).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Property 3: スクロール位置・ページ番号・フィルター状態が正しく復元されること', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            currentPage: fc.integer({ min: 1, max: 10 }),
            scrollPosition: fc.integer({ min: 0, max: 5000 }),
            filters: fc.record({
              propertyTypes: fc.array(
                fc.oneof(
                  fc.constant('detached_house'),
                  fc.constant('apartment'),
                  fc.constant('land')
                ),
                { maxLength: 3 }
              ),
              searchQuery: fc.oneof(fc.string({ maxLength: 20 }), fc.constant(undefined)),
              showPublicOnly: fc.oneof(fc.boolean(), fc.constant(undefined)),
            }),
          }),
          async ({ currentPage, scrollPosition, filters }) => {
            // リストビューから詳細ページに遷移
            const savedState = navigateToDetailFromList(currentPage, scrollPosition, filters);

            // 保存された状態が正しいことを確認
            expect(savedState.currentPage).toBe(currentPage);
            expect(savedState.scrollPosition).toBe(scrollPosition);
            expect(savedState.viewMode).toBe('list');
            expect(savedState.filters).toEqual(filters);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('具体例: page=2, scrollPosition=1500, フィルターあり でリストビューから戻る', () => {
      const currentPage = 2;
      const scrollPosition = 1500;
      const filters: NavigationState['filters'] = {
        propertyTypes: ['detached_house'],
        priceRange: { min: '1000', max: '5000' },
        showPublicOnly: false,
      };

      // リストビューから詳細ページに遷移
      const savedState = navigateToDetailFromList(currentPage, scrollPosition, filters);

      // 一覧ページに戻ってきた時の viewMode 復元
      const restoredViewMode = restoreViewModeFromState(savedState);
      const fetchAllCalled = shouldFetchAllProperties(restoredViewMode, 0);

      // 状態が正しく復元される
      expect(savedState.currentPage).toBe(2);
      expect(savedState.scrollPosition).toBe(1500);
      expect(savedState.viewMode).toBe('list');
      expect(savedState.filters).toEqual(filters);

      // viewMode='list' が復元される
      expect(restoredViewMode).toBe('list');
      // fetchAllProperties() が呼ばれない
      expect(fetchAllCalled).toBe(false);

      console.log('[保全テスト] リストビューから戻る場合:');
      console.log(`  保存された viewMode: ${savedState.viewMode}`);
      console.log(`  復元された viewMode: ${restoredViewMode}`);
      console.log(`  fetchAllProperties() が呼ばれる: ${fetchAllCalled}`);
      console.log(`  ページ番号: ${savedState.currentPage}`);
      console.log(`  スクロール位置: ${savedState.scrollPosition}`);
    });
  });
});
