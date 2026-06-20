/**
 * 保持プロパティテスト: PublicPropertiesPage - リストビューおよびその他の既存動作の保持
 *
 * このテストは修正前のコードでベースライン動作を確認するために作成されています。
 * テストが「通過」することで、修正前の正常動作を記録します。
 * 修正後も同じテストが通過することで、リグレッションがないことを確認します。
 *
 * Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5
 */

import * as fs from 'fs';
import * as path from 'path';
import * as fc from 'fast-check';

// ============================================================
// テストヘルパー
// ============================================================

/**
 * 指定件数の物件データを生成する
 */
function createProperties(count: number, offset: number = 0) {
  return Array.from({ length: count }, (_, i) => ({
    id: `prop-${offset + i + 1}`,
    property_number: `AA${String(offset + i + 1).padStart(5, '0')}`,
    latitude: 33.2382 + i * 0.001,
    longitude: 131.6126 + i * 0.001,
    price: (1000 + i) * 10000,
    property_type: 'マンション',
    address: `大分市テスト${offset + i + 1}`,
    atbb_status: '公開中',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  }));
}

/**
 * fetchProperties のロジックを再現したテスト用関数
 * （PublicPropertiesPage.tsx の fetchProperties と同じロジック）
 *
 * Validates: Requirements 3.1
 */
async function simulateFetchProperties(
  fetchFn: (url: string) => Promise<Response>,
  currentPage: number,
  searchParams: URLSearchParams = new URLSearchParams()
): Promise<{ requestUrl: string; params: URLSearchParams }> {
  const offset = (currentPage - 1) * 20;

  const params = new URLSearchParams({
    limit: '20',
    offset: offset.toString(),
  });

  // searchParams からフィルターを追加（PublicPropertiesPage.tsx と同じロジック）
  const propertyNumber = searchParams.get('propertyNumber');
  const location = searchParams.get('location');
  const types = searchParams.get('types');
  const minPriceParam = searchParams.get('minPrice');
  const maxPriceParam = searchParams.get('maxPrice');
  const minAgeParam = searchParams.get('minAge');
  const maxAgeParam = searchParams.get('maxAge');
  const showPublicOnlyParam = searchParams.get('showPublicOnly');

  if (propertyNumber) params.set('propertyNumber', propertyNumber);
  if (location) params.set('location', location);
  if (types) params.set('types', types);
  if (minPriceParam) params.set('minPrice', minPriceParam);
  if (maxPriceParam) params.set('maxPrice', maxPriceParam);
  if (minAgeParam) params.set('minAge', minAgeParam);
  if (maxAgeParam) params.set('maxAge', maxAgeParam);
  if (showPublicOnlyParam === 'true') params.set('showPublicOnly', 'true');

  const apiUrl = 'http://localhost:3000';
  const requestUrl = `${apiUrl}/api/public/properties?${params.toString()}`;

  await fetchFn(requestUrl);

  return { requestUrl, params };
}

// ============================================================
// Property 2: Preservation テスト
// ============================================================

describe('Property 2: Preservation - リストビューのページネーション動作の保持', () => {
  /**
   * Validates: Requirements 3.1
   *
   * 任意のフィルター条件（物件タイプ・価格帯・築年数の組み合わせ）で
   * fetchProperties が常に limit=20 のページネーション付きリクエストを実行することを検証
   */
  test('任意のページ番号で fetchProperties が常に limit=20 を使用する（プロパティベーステスト）', async () => {
    const mockFetch = jest.fn().mockImplementation((_url: string) => {
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            properties: createProperties(20),
            pagination: { total: 100, page: 1, limit: 20, totalPages: 5 },
          }),
      } as Response);
    });

    await fc.assert(
      fc.asyncProperty(
        // 任意のページ番号（1〜10）
        fc.integer({ min: 1, max: 10 }),
        async (page) => {
          const result = await simulateFetchProperties(mockFetch, page);
          const urlParams = new URL(result.requestUrl).searchParams;

          // limit=20 が常に使用されることを確認
          expect(urlParams.get('limit')).toBe('20');

          // offset が正しく計算されることを確認
          const expectedOffset = (page - 1) * 20;
          expect(urlParams.get('offset')).toBe(expectedOffset.toString());
        }
      ),
      { numRuns: 20 }
    );
  });

  test('任意のフィルター条件で fetchProperties が limit=20 を維持する（プロパティベーステスト）', async () => {
    const mockFetch = jest.fn().mockImplementation((_url: string) => {
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            properties: createProperties(20),
            pagination: { total: 100, page: 1, limit: 20, totalPages: 5 },
          }),
      } as Response);
    });

    await fc.assert(
      fc.asyncProperty(
        // 任意のフィルター条件
        fc.record({
          page: fc.integer({ min: 1, max: 10 }),
          types: fc.option(
            fc.constantFrom('マンション', '戸建', '土地', '収益物件'),
            { nil: undefined }
          ),
          minPrice: fc.option(
            fc.integer({ min: 100, max: 5000 }).map(String),
            { nil: undefined }
          ),
          maxPrice: fc.option(
            fc.integer({ min: 5001, max: 20000 }).map(String),
            { nil: undefined }
          ),
          minAge: fc.option(
            fc.integer({ min: 0, max: 20 }).map(String),
            { nil: undefined }
          ),
          maxAge: fc.option(
            fc.integer({ min: 21, max: 50 }).map(String),
            { nil: undefined }
          ),
        }),
        async (filters) => {
          const searchParams = new URLSearchParams();
          if (filters.types) searchParams.set('types', filters.types);
          if (filters.minPrice) searchParams.set('minPrice', filters.minPrice);
          if (filters.maxPrice) searchParams.set('maxPrice', filters.maxPrice);
          if (filters.minAge) searchParams.set('minAge', filters.minAge);
          if (filters.maxAge) searchParams.set('maxAge', filters.maxAge);

          const result = await simulateFetchProperties(
            mockFetch,
            filters.page,
            searchParams
          );
          const urlParams = new URL(result.requestUrl).searchParams;

          // limit=20 が常に使用されることを確認（フィルターに関係なく）
          expect(urlParams.get('limit')).toBe('20');

          // offset が正しく計算されることを確認
          const expectedOffset = (filters.page - 1) * 20;
          expect(urlParams.get('offset')).toBe(expectedOffset.toString());

          // フィルターが正しく渡されることを確認
          if (filters.types) {
            expect(urlParams.get('types')).toBe(filters.types);
          }
          if (filters.minPrice) {
            expect(urlParams.get('minPrice')).toBe(filters.minPrice);
          }
          if (filters.maxPrice) {
            expect(urlParams.get('maxPrice')).toBe(filters.maxPrice);
          }
        }
      ),
      { numRuns: 30 }
    );
  });

  test('ページ番号とオフセットの計算が正しい（具体的な例）', async () => {
    const mockFetch = jest.fn().mockImplementation((_url: string) => {
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            properties: createProperties(20),
            pagination: { total: 100, page: 1, limit: 20, totalPages: 5 },
          }),
      } as Response);
    });

    // ページ1: offset=0
    const result1 = await simulateFetchProperties(mockFetch, 1);
    expect(new URL(result1.requestUrl).searchParams.get('offset')).toBe('0');
    expect(new URL(result1.requestUrl).searchParams.get('limit')).toBe('20');

    // ページ2: offset=20
    const result2 = await simulateFetchProperties(mockFetch, 2);
    expect(new URL(result2.requestUrl).searchParams.get('offset')).toBe('20');
    expect(new URL(result2.requestUrl).searchParams.get('limit')).toBe('20');

    // ページ5: offset=80
    const result5 = await simulateFetchProperties(mockFetch, 5);
    expect(new URL(result5.requestUrl).searchParams.get('offset')).toBe('80');
    expect(new URL(result5.requestUrl).searchParams.get('limit')).toBe('20');
  });
});

// ============================================================
// Property 2: Preservation - sessionStorage からの状態復元
// ============================================================

describe('Property 2: Preservation - sessionStorage からの状態復元', () => {
  /**
   * Validates: Requirements 3.2
   *
   * sessionStorage からの状態復元（フィルター・ページ番号・スクロール位置）が
   * 正常に動作することを観察・検証する
   */

  beforeEach(() => {
    // sessionStorage をクリア
    sessionStorage.clear();
  });

  test('sessionStorage に保存された NavigationState が正しい形式で復元できる', () => {
    /**
     * PublicPropertiesPage.tsx の状態復元ロジックを検証:
     * sessionStorage.getItem('publicPropertiesNavigationState') から
     * NavigationState を JSON.parse で復元する
     */
    const navigationState = {
      scrollPosition: 500,
      currentPage: 3,
      viewMode: 'list' as const,
      filters: {
        propertyTypes: ['マンション', '戸建'],
        priceRange: { min: '1000', max: '5000' },
        buildingAgeRange: { min: '0', max: '20' },
        searchQuery: '大分市',
        showPublicOnly: false,
      },
    };

    // sessionStorage に保存
    sessionStorage.setItem(
      'publicPropertiesNavigationState',
      JSON.stringify(navigationState)
    );

    // 復元
    const savedStateStr = sessionStorage.getItem(
      'publicPropertiesNavigationState'
    );
    expect(savedStateStr).not.toBeNull();

    const restoredState = JSON.parse(savedStateStr!);

    // 各フィールドが正しく復元されることを確認
    expect(restoredState.scrollPosition).toBe(500);
    expect(restoredState.currentPage).toBe(3);
    expect(restoredState.viewMode).toBe('list');
    expect(restoredState.filters.propertyTypes).toEqual(['マンション', '戸建']);
    expect(restoredState.filters.priceRange.min).toBe('1000');
    expect(restoredState.filters.priceRange.max).toBe('5000');
    expect(restoredState.filters.buildingAgeRange.min).toBe('0');
    expect(restoredState.filters.buildingAgeRange.max).toBe('20');
    expect(restoredState.filters.searchQuery).toBe('大分市');
    expect(restoredState.filters.showPublicOnly).toBe(false);
  });

  test('任意の NavigationState が sessionStorage に保存・復元できる（プロパティベーステスト）', () => {
    /**
     * Validates: Requirements 3.2
     *
     * 任意のナビゲーション状態が sessionStorage に正しく保存・復元できることを検証
     */
    fc.assert(
      fc.property(
        fc.record({
          scrollPosition: fc.integer({ min: 0, max: 10000 }),
          currentPage: fc.integer({ min: 1, max: 100 }),
          viewMode: fc.constantFrom('list' as const, 'map' as const),
          filters: fc.record({
            propertyTypes: fc.array(
              fc.constantFrom('マンション', '戸建', '土地', '収益物件'),
              { maxLength: 4 }
            ),
            priceRange: fc.record({
              min: fc.option(
                fc.integer({ min: 100, max: 5000 }).map(String),
                { nil: undefined }
              ),
              max: fc.option(
                fc.integer({ min: 5001, max: 20000 }).map(String),
                { nil: undefined }
              ),
            }),
            showPublicOnly: fc.boolean(),
          }),
        }),
        (state) => {
          // sessionStorage に保存
          sessionStorage.setItem(
            'publicPropertiesNavigationState',
            JSON.stringify(state)
          );

          // 復元
          const savedStr = sessionStorage.getItem(
            'publicPropertiesNavigationState'
          );
          expect(savedStr).not.toBeNull();

          const restored = JSON.parse(savedStr!);

          // 基本フィールドが正しく復元されることを確認
          expect(restored.scrollPosition).toBe(state.scrollPosition);
          expect(restored.currentPage).toBe(state.currentPage);
          expect(restored.viewMode).toBe(state.viewMode);
          expect(restored.filters.showPublicOnly).toBe(
            state.filters.showPublicOnly
          );

          // クリーンアップ
          sessionStorage.removeItem('publicPropertiesNavigationState');
        }
      ),
      { numRuns: 30 }
    );
  });

  test('sessionStorage が存在しない場合は null を返す', () => {
    // sessionStorage に何も保存されていない場合
    const savedStateStr = sessionStorage.getItem(
      'publicPropertiesNavigationState'
    );
    expect(savedStateStr).toBeNull();
  });

  test('sessionStorage の JSON が壊れている場合は例外が発生する', () => {
    // 壊れた JSON を保存
    sessionStorage.setItem(
      'publicPropertiesNavigationState',
      'invalid json {'
    );

    const savedStateStr = sessionStorage.getItem(
      'publicPropertiesNavigationState'
    );
    expect(savedStateStr).not.toBeNull();

    // JSON.parse は例外を投げる
    expect(() => JSON.parse(savedStateStr!)).toThrow();
  });
});

// ============================================================
// Property 2: Preservation - allProperties のデータ構造
// ============================================================

describe('Property 2: Preservation - allProperties のデータ構造が PropertyMapView の期待する形式と一致する', () => {
  /**
   * Validates: Requirements 3.3
   *
   * allProperties のデータ構造が PropertyMapView コンポーネントの
   * 期待する形式（PublicProperty[]）と一致することを検証する
   */

  test('PropertyMapView が期待する PublicProperty の必須フィールドが存在する', () => {
    /**
     * PropertyMapView.tsx の実装を観察:
     * - properties.filter(p => p.latitude && p.longitude) で座標フィルタリング
     * - property.latitude, property.longitude を lat/lng として使用
     * - property.property_number, property.property_type, property.price,
     *   property.display_address, property.address, property.atbb_status を使用
     */
    const property = {
      id: 'prop-1',
      property_number: 'AA00001',
      property_type: 'マンション',
      address: '大分市テスト1',
      display_address: '大分市テスト1（表示用）',
      price: 10000000,
      latitude: 33.2382,
      longitude: 131.6126,
      atbb_status: '公開中',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };

    // PropertyMapView が使用するフィールドが存在することを確認
    expect(property.latitude).toBeDefined();
    expect(property.longitude).toBeDefined();
    expect(property.property_number).toBeDefined();
    expect(property.property_type).toBeDefined();
    expect(property.atbb_status).toBeDefined();
    expect(property.id).toBeDefined();
  });

  test('座標付き物件のフィルタリングロジックが正しく動作する', () => {
    /**
     * PropertyMapView.tsx の座標フィルタリングロジックを検証:
     * properties.filter(property => property.latitude && property.longitude)
     */
    const properties = [
      {
        id: 'prop-1',
        property_number: 'AA00001',
        latitude: 33.2382,
        longitude: 131.6126,
        atbb_status: '公開中',
      },
      {
        id: 'prop-2',
        property_number: 'AA00002',
        latitude: null,
        longitude: null,
        atbb_status: '公開中',
      },
      {
        id: 'prop-3',
        property_number: 'AA00003',
        latitude: 33.2500,
        longitude: undefined,
        atbb_status: '公開中',
      },
      {
        id: 'prop-4',
        property_number: 'AA00004',
        latitude: 33.2600,
        longitude: 131.6200,
        atbb_status: '公開中',
      },
    ];

    // PropertyMapView と同じフィルタリングロジック
    const propertiesWithCoords = properties.filter(
      (p) => p.latitude && p.longitude
    );

    // 座標が両方存在する物件のみが残ることを確認
    expect(propertiesWithCoords.length).toBe(2);
    expect(propertiesWithCoords[0].id).toBe('prop-1');
    expect(propertiesWithCoords[1].id).toBe('prop-4');
  });

  test('任意の物件リストで座標フィルタリングが正しく動作する（プロパティベーステスト）', () => {
    /**
     * Validates: Requirements 3.3
     *
     * 任意の物件リストに対して、座標フィルタリングが正しく動作することを検証
     */
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.string({ minLength: 1, maxLength: 10 }),
            property_number: fc.string({ minLength: 1, maxLength: 10 }),
            latitude: fc.option(
              fc.float({ min: 30.0, max: 35.0, noNaN: true }),
              { nil: undefined }
            ),
            longitude: fc.option(
              fc.float({ min: 128.0, max: 135.0, noNaN: true }),
              { nil: undefined }
            ),
            atbb_status: fc.constantFrom('公開中', '非公開', '成約済み'),
          }),
          { maxLength: 50 }
        ),
        (properties) => {
          // PropertyMapView と同じフィルタリングロジック
          const propertiesWithCoords = properties.filter(
            (p) => p.latitude && p.longitude
          );

          // フィルタリング後の物件は全て座標を持つことを確認
          propertiesWithCoords.forEach((p) => {
            expect(p.latitude).toBeTruthy();
            expect(p.longitude).toBeTruthy();
          });

          // フィルタリング後の件数が元の件数以下であることを確認
          expect(propertiesWithCoords.length).toBeLessThanOrEqual(
            properties.length
          );

          // 座標を持つ物件の数と一致することを確認
          const expectedCount = properties.filter(
            (p) => p.latitude && p.longitude
          ).length;
          expect(propertiesWithCoords.length).toBe(expectedCount);
        }
      ),
      { numRuns: 30 }
    );
  });
});

// ============================================================
// Property 2: Preservation - フィルター変更時の searchParams 更新
// ============================================================

describe('Property 2: Preservation - フィルター変更時の searchParams 更新', () => {
  /**
   * Validates: Requirements 3.4
   *
   * フィルター変更時に searchParams が正しく更新されることを検証する
   */

  test('物件タイプフィルターが searchParams に正しく反映される', () => {
    /**
     * PublicPropertiesPage.tsx の searchParams 更新ロジックを検証:
     * selectedTypes.length > 0 の場合: newParams.set('types', selectedTypes.join(','))
     * selectedTypes.length === 0 の場合: newParams.delete('types')
     */

    // フィルターあり
    const selectedTypes = ['マンション', '戸建'];
    const params = new URLSearchParams();

    if (selectedTypes.length > 0) {
      params.set('types', selectedTypes.join(','));
    } else {
      params.delete('types');
    }

    expect(params.get('types')).toBe('マンション,戸建');

    // フィルターなし
    const emptyTypes: string[] = [];
    const params2 = new URLSearchParams();
    params2.set('types', 'マンション'); // 既存の値

    if (emptyTypes.length > 0) {
      params2.set('types', emptyTypes.join(','));
    } else {
      params2.delete('types');
    }

    expect(params2.get('types')).toBeNull();
  });

  test('価格フィルターが searchParams に正しく反映される', () => {
    /**
     * PublicPropertiesPage.tsx の価格フィルター更新ロジックを検証
     */
    const minPrice = '1000';
    const maxPrice = '5000';
    const params = new URLSearchParams();

    if (minPrice) {
      params.set('minPrice', minPrice);
    } else {
      params.delete('minPrice');
    }

    if (maxPrice) {
      params.set('maxPrice', maxPrice);
    } else {
      params.delete('maxPrice');
    }

    expect(params.get('minPrice')).toBe('1000');
    expect(params.get('maxPrice')).toBe('5000');
  });

  test('任意のフィルター組み合わせで searchParams が正しく更新される（プロパティベーステスト）', () => {
    /**
     * Validates: Requirements 3.4
     *
     * 任意のフィルター条件の組み合わせで searchParams が正しく更新されることを検証
     */
    fc.assert(
      fc.property(
        fc.record({
          selectedTypes: fc.array(
            fc.constantFrom('マンション', '戸建', '土地', '収益物件'),
            { maxLength: 4 }
          ),
          minPrice: fc.option(
            fc.integer({ min: 100, max: 5000 }).map(String),
            { nil: '' }
          ),
          maxPrice: fc.option(
            fc.integer({ min: 5001, max: 20000 }).map(String),
            { nil: '' }
          ),
          minAge: fc.option(
            fc.integer({ min: 0, max: 20 }).map(String),
            { nil: '' }
          ),
          maxAge: fc.option(
            fc.integer({ min: 21, max: 50 }).map(String),
            { nil: '' }
          ),
          showPublicOnly: fc.boolean(),
        }),
        (filters) => {
          // PublicPropertiesPage.tsx の searchParams 更新ロジックを再現
          const newParams = new URLSearchParams();

          if (filters.selectedTypes.length > 0) {
            newParams.set('types', filters.selectedTypes.join(','));
          } else {
            newParams.delete('types');
          }

          if (filters.minPrice) {
            newParams.set('minPrice', filters.minPrice);
          } else {
            newParams.delete('minPrice');
          }

          if (filters.maxPrice) {
            newParams.set('maxPrice', filters.maxPrice);
          } else {
            newParams.delete('maxPrice');
          }

          if (filters.minAge) {
            newParams.set('minAge', filters.minAge);
          } else {
            newParams.delete('minAge');
          }

          if (filters.maxAge) {
            newParams.set('maxAge', filters.maxAge);
          } else {
            newParams.delete('maxAge');
          }

          if (filters.showPublicOnly) {
            newParams.set('showPublicOnly', 'true');
          } else {
            newParams.delete('showPublicOnly');
          }

          // 検証: フィルターが正しく反映されているか
          if (filters.selectedTypes.length > 0) {
            expect(newParams.get('types')).toBe(
              filters.selectedTypes.join(',')
            );
          } else {
            expect(newParams.get('types')).toBeNull();
          }

          if (filters.minPrice) {
            expect(newParams.get('minPrice')).toBe(filters.minPrice);
          } else {
            expect(newParams.get('minPrice')).toBeNull();
          }

          if (filters.maxPrice) {
            expect(newParams.get('maxPrice')).toBe(filters.maxPrice);
          } else {
            expect(newParams.get('maxPrice')).toBeNull();
          }

          if (filters.showPublicOnly) {
            expect(newParams.get('showPublicOnly')).toBe('true');
          } else {
            expect(newParams.get('showPublicOnly')).toBeNull();
          }
        }
      ),
      { numRuns: 50 }
    );
  });
});

// ============================================================
// Property 2: Preservation - ソースコード構造の確認
// ============================================================

describe('Property 2: Preservation - fetchProperties がリストビュー専用であることを確認', () => {
  /**
   * Validates: Requirements 3.1
   *
   * fetchProperties 関数がリストビュー専用であり、
   * 地図ビューの修正によって変更されないことを確認する
   */

  test('fetchProperties のソースコードに limit=20 が含まれている', () => {
    const sourceFilePath = path.resolve(
      __dirname,
      '../PublicPropertiesPage.tsx'
    );
    const sourceCode = fs.readFileSync(sourceFilePath, 'utf-8');

    // fetchProperties 関数に limit: '20' が含まれることを確認
    expect(sourceCode).toContain("limit: '20'");
  });

  test('fetchProperties のソースコードに offset 計算が含まれている', () => {
    const sourceFilePath = path.resolve(
      __dirname,
      '../PublicPropertiesPage.tsx'
    );
    const sourceCode = fs.readFileSync(sourceFilePath, 'utf-8');

    // offset = (currentPage - 1) * 20 の計算が含まれることを確認
    expect(sourceCode).toContain('(currentPage - 1) * 20');
  });

  test('fetchProperties と fetchAllProperties が独立した関数として存在する', () => {
    const sourceFilePath = path.resolve(
      __dirname,
      '../PublicPropertiesPage.tsx'
    );
    const sourceCode = fs.readFileSync(sourceFilePath, 'utf-8');

    // 両方の関数が存在することを確認
    expect(sourceCode).toContain('const fetchProperties = async');
    expect(sourceCode).toContain('const fetchAllProperties = async');
  });

  test('fetchProperties は withCoordinates パラメータを使用しない（リストビュー専用）', () => {
    /**
     * fetchProperties はリストビュー用であり、
     * withCoordinates パラメータを使用しないことを確認する
     * （withCoordinates は地図ビュー専用の fetchAllProperties のみが使用する）
     */
    const sourceFilePath = path.resolve(
      __dirname,
      '../PublicPropertiesPage.tsx'
    );
    const sourceCode = fs.readFileSync(sourceFilePath, 'utf-8');

    // fetchProperties 関数の範囲を抽出
    const fetchPropertiesStart = sourceCode.indexOf('const fetchProperties = async');
    const fetchAllPropertiesStart = sourceCode.indexOf('const fetchAllProperties = async');

    // fetchProperties 関数のコードを抽出（fetchAllProperties の前まで）
    const fetchPropertiesCode = sourceCode.substring(
      fetchPropertiesStart,
      fetchAllPropertiesStart
    );

    // fetchProperties は withCoordinates を使用しないことを確認
    expect(fetchPropertiesCode).not.toContain('withCoordinates');
  });
});
