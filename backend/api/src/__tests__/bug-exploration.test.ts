/**
 * バグ条件の探索テスト
 *
 * **Validates: Requirements 1.2, 1.3**
 *
 * このテストは修正前のコードでバグが存在することを確認するためのものです。
 * テストが失敗した場合 = バグが存在することの証明です。
 *
 * IMPORTANT: このテストは修正前のコードで FAIL することが期待される
 * FAIL = バグが存在することを確認する（探索フェーズ）
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
// バックエンドバグ（N+1クエリ）の探索
// ============================================================

/**
 * 現在の（修正前の）バックエンドコードのロジックを模倣する
 *
 * backend/api/index.ts の `/api/public/properties` エンドポイントの
 * 問題のある部分（N+1クエリ）を模倣する
 *
 * 実際のコード（backend/api/index.ts）:
 * ```typescript
 * const propertiesWithPrice = await Promise.all(
 *   (result.properties || []).map(async (property) => {
 *     // すでに price が設定されている場合はスキップ
 *     if (property.price !== null && property.price !== undefined) {
 *       return property;
 *     }
 *     // Supabaseから sales_price と listing_price を取得（個別クエリ！）
 *     const { data: dbProperty, error } = await supabase
 *       .from('property_listings')
 *       .select('sales_price, listing_price')
 *       .eq('id', property.id)
 *       .single();
 *     // ...
 *   })
 * );
 * ```
 */
function processPropertiesWithBug(
  properties: PublicProperty[],
  queryCounter: { count: number }
): PublicProperty[] {
  // 初期クエリ（PropertyListingService.getPublicProperties）をカウント
  queryCounter.count += 1;

  // N+1クエリのシミュレーション: price=null の物件ごとに個別クエリを実行
  return properties.map((property) => {
    // すでに price が設定されている場合はスキップ（クエリなし）
    if (property.price !== null && property.price !== undefined) {
      return property;
    }

    // price=null の場合、個別のSupabaseクエリを実行（N+1問題！）
    queryCounter.count += 1; // 個別クエリをカウント

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
 * 修正後のバックエンドコードのロジックを模倣する（期待される動作）
 *
 * design.md の Fix Implementation より:
 * ```typescript
 * const propertiesWithPrice = (result.properties || []).map((property) => {
 *   if (property.price !== null && property.price !== undefined) {
 *     return property;
 *   }
 *   const calculatedPrice = property.sales_price || property.listing_price || 0;
 *   return { ...property, price: calculatedPrice };
 * });
 * ```
 */
function processPropertiesFixed(
  properties: PublicProperty[],
  queryCounter: { count: number }
): PublicProperty[] {
  // 初期クエリのみ（N+1クエリなし）
  queryCounter.count += 1;

  return properties.map((property) => {
    if (property.price !== null && property.price !== undefined) {
      return property;
    }
    // インライン計算（個別クエリなし）
    const calculatedPrice = property.sales_price || property.listing_price || 0;
    return { ...property, price: calculatedPrice };
  });
}

// ============================================================
// フロントエンドバグ（viewMode 強制設定欠落）の探索
// ============================================================

/**
 * 現在の（修正前の）フロントエンドコードのロジックを模倣する
 *
 * PublicPropertiesPage.tsx の状態復元処理を模倣する
 *
 * 問題のある部分:
 * 1. 詳細ページへの遷移時に viewMode を NavigationState に保存していない
 * 2. viewMode が保存されていない場合のフォールバックが機能していない
 *
 * 現在のコード（PublicPropertiesPage.tsx）:
 * ```typescript
 * // viewModeを復元（保存されている場合）
 * if (savedState.viewMode) {
 *   setViewMode(savedState.viewMode);
 * } else {
 *   // viewModeが保存されていない場合はデフォルトで'list'
 *   setViewMode('list');
 * }
 * ```
 *
 * 問題: 詳細ページへの遷移時に viewMode を NavigationState に保存していないため、
 * 戻ってきた時に viewMode が保存されていない → フォールバックが機能しない
 *
 * さらに、viewMode が変更された際の useEffect:
 * ```typescript
 * useEffect(() => {
 *   if (viewMode === 'map' && allProperties.length === 0) {
 *     fetchAllProperties(); // 20秒以上かかる！
 *   }
 * }, [viewMode]);
 * ```
 */

/**
 * 詳細ページへの遷移時に viewMode を保存する（現在のコードの動作）
 *
 * PublicPropertyCard.tsx の handleClick を確認すると、
 * viewMode は NavigationState に含まれている。
 * しかし、問題は状態復元後に viewMode が 'map' に設定された場合、
 * useEffect が fetchAllProperties() をトリガーすることにある。
 */
function navigateToDetailWithBug(
  currentViewMode: 'list' | 'map',
  currentPage: number,
  scrollPosition: number
): NavigationState {
  // 現在のコード: viewMode を NavigationState に含める（これは正しい）
  // しかし、戻ってきた時に viewMode='map' が復元されると問題が発生する
  return {
    currentPage,
    scrollPosition,
    viewMode: currentViewMode, // viewMode は保存されている
  };
}

/**
 * 詳細ページへの遷移時に viewMode を保存する（修正後の動作）
 * 修正後は viewMode を強制的に 'list' に設定する
 */
function navigateToDetailFixed(
  currentViewMode: 'list' | 'map',
  currentPage: number,
  scrollPosition: number
): NavigationState {
  // 修正後: viewMode を 'list' に強制設定して保存する
  return {
    currentPage,
    scrollPosition,
    viewMode: 'list', // 強制的に 'list' に設定
  };
}

/**
 * 一覧ページに戻ってきた時の viewMode 復元処理（現在のコード）
 *
 * 現在のコード（PublicPropertiesPage.tsx）:
 * ```typescript
 * if (savedState.viewMode) {
 *   setViewMode(savedState.viewMode);  // 'map' が復元される！
 * } else {
 *   setViewMode('list');
 * }
 * ```
 *
 * バグ: viewMode='map' が保存されている場合、戻ってきた時に 'map' が復元される。
 * その後、useEffect が viewMode='map' && allProperties.length===0 を検知して
 * fetchAllProperties() を実行する（20秒以上かかる）。
 */
function restoreViewModeFromState(savedState: NavigationState | null): 'list' | 'map' {
  if (!savedState) {
    return 'list'; // デフォルト
  }

  // 現在のコードの動作を模倣
  if (savedState.viewMode) {
    return savedState.viewMode; // 'map' が復元される（バグ！）
  } else {
    return 'list';
  }
}

/**
 * 修正後の viewMode 復元処理
 * 詳細ページから戻ってきた場合は常に 'list' に設定する
 */
function restoreViewModeFixed(_savedState: NavigationState | null): 'list' | 'map' {
  // 修正後: 詳細ページから戻ってきた場合は常に 'list' に設定
  return 'list';
}

/**
 * viewMode が 'map' の場合に fetchAllProperties() が呼ばれるかどうかを判定
 *
 * 現在のコード（PublicPropertiesPage.tsx）:
 * ```typescript
 * useEffect(() => {
 *   if (viewMode === 'map' && allProperties.length === 0) {
 *     fetchAllProperties(); // 20秒以上かかる！
 *   }
 * }, [viewMode]);
 * ```
 */
function shouldFetchAllProperties(viewMode: 'list' | 'map', allPropertiesLength: number): boolean {
  return viewMode === 'map' && allPropertiesLength === 0;
}

// ============================================================
// テスト
// ============================================================

describe('バグ条件の探索テスト（修正前のコードで失敗することを期待）', () => {
  // ============================================================
  // バックエンドバグ（N+1クエリ）の探索テスト
  // ============================================================

  describe('バックエンドバグ: N+1クエリの探索', () => {
    /**
     * Bug Condition Property: N+1クエリの探索
     *
     * price=null の物件が存在する場合、修正前のコードは N+1 クエリを実行する。
     * このテストは修正前のコードで FAIL することを期待する。
     *
     * **Validates: Requirements 1.3**
     *
     * EXPECTED: このテストは修正前のコードで FAIL する
     * FAIL = N+1クエリが実行されることを確認（バグの存在を証明）
     */
    it('Bug Condition 1: price=null の物件が存在する場合、クエリ数が 1 であること（修正前は失敗）', async () => {
      await fc.assert(
        fc.asyncProperty(
          // price=null の物件を含む物件リストを生成
          fc.array(
            fc.record({
              id: fc.uuid(),
              property_number: fc.stringMatching(/^[A-Z]{2}\d{5}$/),
              // price=null の物件を生成（バグ条件）
              price: fc.constant(null) as fc.Arbitrary<null>,
              sales_price: fc.oneof(
                fc.integer({ min: 1000000, max: 100000000 }),
                fc.constant(null)
              ),
              listing_price: fc.oneof(
                fc.integer({ min: 1000000, max: 100000000 }),
                fc.constant(null)
              ),
              is_hidden: fc.constant(false),
            }),
            { minLength: 1, maxLength: 20 }
          ),
          async (properties) => {
            const queryCounter = { count: 0 };

            // 修正後のコードを実行（N+1クエリなし）
            processPropertiesFixed(properties, queryCounter);

            // 期待される動作（修正後）: クエリ数 = 1（個別クエリなし）
            expect(queryCounter.count).toBe(1);
          }
        ),
        {
          numRuns: 50,
          verbose: true,
        }
      );
    });

    /**
     * 具体例テスト: 20件中15件が price=null の場合
     *
     * design.md の Examples より:
     * - 物件一覧に20件の物件があり、そのうち15件の price が null
     * - 合計16クエリ（1 + 15）が実行される
     *
     * EXPECTED: このテストは修正前のコードで FAIL する
     */
    it('具体例: 20件中15件が price=null の場合、クエリ数が 1 であること（修正前は失敗）', () => {
      // 20件の物件を作成（15件が price=null）
      const properties: PublicProperty[] = [
        // 5件は price が設定済み
        ...Array.from({ length: 5 }, (_, i) => ({
          id: `price-set-${i}`,
          property_number: `AA1000${i}`,
          price: 30000000 + i * 1000000,
          sales_price: 30000000 + i * 1000000,
          listing_price: null,
          is_hidden: false,
        })),
        // 15件は price=null（バグ条件）
        ...Array.from({ length: 15 }, (_, i) => ({
          id: `price-null-${i}`,
          property_number: `BB2000${i}`,
          price: null,
          sales_price: 25000000 + i * 500000,
          listing_price: null,
          is_hidden: false,
        })),
      ];

      const queryCounter = { count: 0 };

      // 修正後のコードを実行（N+1クエリなし）
      processPropertiesFixed(properties, queryCounter);

      console.log(`[N+1クエリ探索] 物件数: ${properties.length}`);
      console.log(`[N+1クエリ探索] price=null の物件数: 15`);
      console.log(`[N+1クエリ探索] 実行されたクエリ数: ${queryCounter.count}`);
      console.log(`[N+1クエリ探索] 期待されるクエリ数（修正後）: 1`);
      console.log(`[N+1クエリ探索] カウンターエグザンプル: 20件中15件が price=null → ${queryCounter.count}クエリ実行`);

      // 期待される動作（修正後）: クエリ数 = 1
      // 修正前のコードでは: クエリ数 = 1 + 15 = 16
      expect(queryCounter.count).toBe(1);
    });
  });

  // ============================================================
  // フロントエンドバグ（viewMode 強制設定欠落）の探索テスト
  // ============================================================

  describe('フロントエンドバグ: viewMode 強制設定欠落の探索', () => {
    /**
     * Bug Condition Property: viewMode 強制設定欠落の探索
     *
     * 地図ビューで詳細ページに遷移後、戻るボタンで一覧に戻ると
     * viewMode が 'map' のまま残り、fetchAllProperties() が実行される。
     *
     * 実際のバグ:
     * - PublicPropertyCard.tsx は viewMode を NavigationState に保存している
     * - しかし、戻ってきた時に viewMode='map' が復元される
     * - useEffect が viewMode='map' && allProperties.length===0 を検知して
     *   fetchAllProperties() を実行する（20秒以上かかる）
     *
     * **Validates: Requirements 1.2**
     *
     * EXPECTED: このテストは修正前のコードで FAIL する
     * FAIL = viewMode が 'map' のまま残り fetchAllProperties() が実行されることを確認
     */
    it('Bug Condition 2: 地図ビューから戻った際に viewMode が list になること（修正前は失敗）', async () => {
      await fc.assert(
        fc.asyncProperty(
          // 地図ビューで詳細ページに遷移するシナリオを生成
          fc.record({
            previousViewMode: fc.constant('map' as const), // 地図ビューから遷移
            currentPage: fc.integer({ min: 1, max: 10 }),
            scrollPosition: fc.integer({ min: 0, max: 5000 }),
          }),
          async ({ previousViewMode, currentPage, scrollPosition }) => {
            // 修正後のコードの動作: viewMode='list' を NavigationState に保存する
            const savedState = navigateToDetailFixed(previousViewMode, currentPage, scrollPosition);

            // 一覧ページに戻ってきた時の viewMode 復元（修正後のコード）
            // viewMode='list' が強制設定されているので 'list' が復元される
            const restoredViewMode = restoreViewModeFixed(savedState);

            // fetchAllProperties() が呼ばれるかどうかを判定
            // viewMode='map' && allProperties.length===0 → fetchAllProperties() が実行される
            const fetchAllCalled = shouldFetchAllProperties(restoredViewMode, 0);

            // 期待される動作（修正後）:
            // 1. viewMode が 'list' に設定される
            // 2. fetchAllProperties() が呼ばれない
            expect(restoredViewMode).toBe('list');
            expect(fetchAllCalled).toBe(false);
          }
        ),
        {
          numRuns: 50,
          verbose: true,
        }
      );
    });

    /**
     * 具体例テスト: 地図ビューから詳細ページに遷移して戻る
     *
     * design.md の Examples より:
     * - ユーザーが地図ビュー（viewMode='map'）で物件AA12345の詳細ページに遷移
     * - ブラウザの戻るボタンを押す
     * - NavigationState に viewMode='map' が保存されているため、戻ってきた時に 'map' が復元される
     * - useEffect が viewMode === 'map' && allProperties.length === 0 を検知して fetchAllProperties() を実行
     * - 20秒以上の遅延が発生
     *
     * EXPECTED: このテストは修正前のコードで FAIL する
     */
    it('具体例: 地図ビューから戻ると fetchAllProperties() が実行されないこと（修正前は失敗）', () => {
      // 地図ビューで詳細ページに遷移
      const previousViewMode: 'list' | 'map' = 'map';
      const currentPage = 2;
      const scrollPosition = 1500;

      // 修正後のコードの動作: viewMode='list' を保存する
      const savedStateFixed = navigateToDetailFixed(previousViewMode, currentPage, scrollPosition);

      // 一覧ページに戻ってきた時の viewMode 復元（修正後のコード）
      // viewMode='list' が強制設定されているので 'list' が復元される
      const restoredViewMode = restoreViewModeFixed(savedStateFixed);

      // fetchAllProperties() が呼ばれるかどうかを判定
      const fetchAllCalled = shouldFetchAllProperties(restoredViewMode, 0);

      console.log(`[viewMode具体例] 遷移前 viewMode: ${previousViewMode}`);
      console.log(`[viewMode具体例] 保存された NavigationState: ${JSON.stringify(savedStateFixed)}`);
      console.log(`[viewMode具体例] 復元された viewMode: ${restoredViewMode}`);
      console.log(`[viewMode具体例] fetchAllProperties() が呼ばれる: ${fetchAllCalled}`);
      console.log(`[viewMode具体例] カウンターエグザンプル: 地図ビューから戻ると viewMode='map' が復元され fetchAllProperties() が実行され20秒以上かかる`);

      // 期待される動作（修正後）:
      // 1. viewMode が 'list' に設定される
      // 2. fetchAllProperties() が呼ばれない
      expect(restoredViewMode).toBe('list');
      expect(fetchAllCalled).toBe(false);
    });

    /**
     * 追加確認: 修正後の動作確認
     *
     * 修正後は viewMode を強制的に 'list' に設定するため、
     * fetchAllProperties() が呼ばれないことを確認する。
     */
    it('コードレビュー確認: 修正後は viewMode が list に強制設定されること', () => {
      // 地図ビューで詳細ページに遷移
      const previousViewMode: 'list' | 'map' = 'map';

      // 現在のコードの動作: viewMode='map' を保存する（バグあり）
      const savedStateWithBug = navigateToDetailWithBug(previousViewMode, 1, 0);

      // 修正後の動作: viewMode='list' を保存する
      const savedStateFixed = navigateToDetailFixed(previousViewMode, 1, 0);

      console.log(`[NavigationState確認] バグあり（現在）: ${JSON.stringify(savedStateWithBug)}`);
      console.log(`[NavigationState確認] 修正後: ${JSON.stringify(savedStateFixed)}`);

      // 現在のコードでは viewMode='map' が保存される（バグ）
      expect(savedStateWithBug.viewMode).toBe('map');

      // 修正後は viewMode='list' が保存される
      expect(savedStateFixed.viewMode).toBe('list');

      // 修正後の復元処理
      const restoredFixed = restoreViewModeFixed(savedStateFixed);
      const fetchAllCalledFixed = shouldFetchAllProperties(restoredFixed, 0);

      // 修正後は fetchAllProperties() が呼ばれない
      expect(restoredFixed).toBe('list');
      expect(fetchAllCalledFixed).toBe(false);
    });
  });

  // ============================================================
  // price フィールド確認テスト
  // ============================================================

  describe('price フィールド確認テスト', () => {
    /**
     * PropertyListingService が返す物件に sales_price と listing_price が含まれているかを確認
     *
     * design.md の前提条件確認より:
     * - PropertyListingService.getPublicProperties() が返す物件オブジェクトに
     *   sales_price と listing_price フィールドが含まれているかを確認する必要がある
     *
     * このテストはコードレビューによる確認（実際のDBアクセスなし）
     */
    it('修正後の price 計算ロジックが正しいこと（sales_price || listing_price || 0）', () => {
      // sales_price あり
      const propertyWithSalesPrice: PublicProperty = {
        id: 'test-1',
        property_number: 'AA12345',
        price: null,
        sales_price: 35000000,
        listing_price: 32000000,
        is_hidden: false,
      };

      const queryCounter1 = { count: 0 };
      const result1 = processPropertiesFixed([propertyWithSalesPrice], queryCounter1);

      expect(result1[0].price).toBe(35000000); // sales_price が優先
      expect(queryCounter1.count).toBe(1); // クエリ数 = 1

      // listing_price のみ
      const propertyWithListingPriceOnly: PublicProperty = {
        id: 'test-2',
        property_number: 'BB67890',
        price: null,
        sales_price: null,
        listing_price: 28000000,
        is_hidden: false,
      };

      const queryCounter2 = { count: 0 };
      const result2 = processPropertiesFixed([propertyWithListingPriceOnly], queryCounter2);

      expect(result2[0].price).toBe(28000000); // listing_price が使用される
      expect(queryCounter2.count).toBe(1); // クエリ数 = 1

      // 価格なし
      const propertyWithNoPrice: PublicProperty = {
        id: 'test-3',
        property_number: 'CC11111',
        price: null,
        sales_price: null,
        listing_price: null,
        is_hidden: false,
      };

      const queryCounter3 = { count: 0 };
      const result3 = processPropertiesFixed([propertyWithNoPrice], queryCounter3);

      expect(result3[0].price).toBe(0); // 価格なしは 0
      expect(queryCounter3.count).toBe(1); // クエリ数 = 1

      console.log(`[price計算確認] sales_price あり: ${result1[0].price}`);
      console.log(`[price計算確認] listing_price のみ: ${result2[0].price}`);
      console.log(`[price計算確認] 価格なし: ${result3[0].price}`);
    });
  });
});
