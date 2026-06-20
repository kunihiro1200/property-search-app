/**
 * 保持プロパティテスト: 一覧ページおよび価格なし物件の動作が変わらない
 *
 * **Validates: Requirements 3.1, 3.2, 3.3, 3.4**
 *
 * Property 2: Preservation
 * - `sales_price` も `listing_price` も存在しない物件では、修正後も `price` が設定されないこと
 * - 一覧APIのレスポンスが修正前後で変わらないこと
 * - 詳細APIの価格以外フィールドが修正前後で同じであること
 *
 * IMPORTANT: このテストは未修正コードで PASS することが期待される
 * PASS = 保持すべきベースライン動作を確認する
 */

import * as fc from 'fast-check';

// ============================================================
// 型定義
// ============================================================

/**
 * `property_listings` テーブルから `select('*')` で取得したデータの型
 */
interface PropertyListingRow {
  id: string;
  property_number: string;
  sales_price: number | null;
  listing_price: number | null;
  is_hidden: boolean;
  address?: string | null;
  property_type?: string | null;
  land_area?: number | null;
  building_area?: number | null;
  build_year?: number | null;
  structure?: string | null;
  floor_plan?: string | null;
  [key: string]: unknown;
}

// ============================================================
// 詳細ページAPIのレスポンス生成ロジック（未修正）
// ============================================================

/**
 * 詳細ページAPIの現在の（未修正）レスポンス生成ロジック
 *
 * backend/api/index.ts の `GET /api/public/properties/:propertyIdentifier` エンドポイントの
 * レスポンス生成部分を模倣する（修正前の状態）
 *
 * 実際のコード（backend/api/index.ts 行 340-350 付近）:
 * ```typescript
 * res.json({
 *   success: true,
 *   property: {
 *     ...property,  // select('*') の結果をそのまま展開
 *     images        // 画像のみ追加
 *   }
 * });
 * ```
 */
function buildDetailResponseOriginal(property: PropertyListingRow, images: string[]): {
  success: boolean;
  property: Record<string, unknown>;
} {
  // 未修正: price を計算せずにそのまま返す
  return {
    success: true,
    property: {
      ...property,
      images,
    },
  };
}

/**
 * 詳細ページAPIの修正後レスポンス生成ロジック
 *
 * design.md の Fix Implementation より:
 * ```typescript
 * const price = property.sales_price || property.listing_price || undefined;
 * res.json({
 *   success: true,
 *   property: {
 *     ...property,
 *     images,
 *     ...(price !== undefined ? { price } : {})
 *   }
 * });
 * ```
 */
function buildDetailResponseFixed(property: PropertyListingRow, images: string[]): {
  success: boolean;
  property: Record<string, unknown>;
} {
  // 修正後: price を計算して付与
  const price = property.sales_price || property.listing_price || undefined;
  return {
    success: true,
    property: {
      ...property,
      images,
      ...(price !== undefined ? { price } : {}),
    },
  };
}

/**
 * 一覧ページAPIのレスポンス生成ロジック（修正済み）
 *
 * backend/api/index.ts の `GET /api/public/properties` エンドポイントの
 * 🔧 FIX 部分を模倣する
 *
 * 実際のコード（backend/api/index.ts 行 240-260 付近）:
 * ```typescript
 * const calculatedPrice = dbProperty.sales_price || dbProperty.listing_price || 0;
 * return {
 *   ...property,
 *   price: calculatedPrice,
 *   sales_price: dbProperty.sales_price,
 *   listing_price: dbProperty.listing_price,
 * };
 * ```
 */
function buildListResponse(property: PropertyListingRow): Record<string, unknown> {
  // 一覧ページは price を計算して付与（修正済み）
  const calculatedPrice = property.sales_price || property.listing_price || 0;
  return {
    ...property,
    price: calculatedPrice,
  };
}

// ============================================================
// テスト
// ============================================================

describe('保持プロパティテスト: 一覧ページおよび価格なし物件の動作が変わらない', () => {
  /**
   * Preservation Property 1: 価格なし物件の保持
   *
   * `sales_price` も `listing_price` も null の物件では、
   * 修正後も `price` が設定されないことを確認する。
   *
   * EXPECTED: このテストは PASS する（ベースライン動作の確認）
   *
   * **Validates: Requirements 3.2**
   */
  it('Preservation 1: sales_price も listing_price も存在しない物件では price が設定されないこと', async () => {
    await fc.assert(
      fc.asyncProperty(
        // sales_price も listing_price も null の物件データを生成
        fc.record({
          id: fc.uuid(),
          property_number: fc.stringMatching(/^[A-Z]{2}\d{5}$/),
          sales_price: fc.constant(null),
          listing_price: fc.constant(null),
          is_hidden: fc.constant(false),
          address: fc.oneof(fc.string({ maxLength: 100 }), fc.constant(null)),
          property_type: fc.oneof(
            fc.constantFrom('土地', '戸建て', 'マンション'),
            fc.constant(null)
          ),
          land_area: fc.oneof(fc.float({ min: 10, max: 1000 }), fc.constant(null)),
        }),
        async (property) => {
          // 未修正コードのレスポンス
          const originalResponse = buildDetailResponseOriginal(property, []);
          // 修正後コードのレスポンス
          const fixedResponse = buildDetailResponseFixed(property, []);

          // 未修正コードでは price が設定されない（ベースライン確認）
          expect(originalResponse.property.price).toBeUndefined();

          // 修正後も price が設定されないこと（保持プロパティ）
          // sales_price も listing_price も null なので price は undefined のまま
          expect(fixedResponse.property.price).toBeUndefined();
        }
      ),
      {
        numRuns: 100,
        verbose: false,
      }
    );
  });

  /**
   * Preservation Property 2: 一覧ページの動作保持
   *
   * 一覧APIのレスポンスが修正前後で変わらないことを確認する。
   * 一覧ページAPIは `backend/api/index.ts` の別エンドポイントであり、
   * 詳細ページAPIの修正は一覧ページに影響しない。
   *
   * EXPECTED: このテストは PASS する（ベースライン動作の確認）
   *
   * **Validates: Requirements 3.1**
   */
  it('Preservation 2: 一覧APIのレスポンスが修正前後で変わらないこと', async () => {
    await fc.assert(
      fc.asyncProperty(
        // 任意の物件データを生成（price あり・なし両方）
        fc.record({
          id: fc.uuid(),
          property_number: fc.stringMatching(/^[A-Z]{2}\d{5}$/),
          sales_price: fc.oneof(
            fc.integer({ min: 1000000, max: 100000000 }),
            fc.constant(null)
          ),
          listing_price: fc.oneof(
            fc.integer({ min: 1000000, max: 100000000 }),
            fc.constant(null)
          ),
          is_hidden: fc.constant(false),
          address: fc.oneof(fc.string({ maxLength: 100 }), fc.constant(null)),
        }),
        async (property) => {
          // 一覧ページAPIのレスポンス（修正済み、詳細ページの修正とは独立）
          const listResponse = buildListResponse(property);

          // 一覧ページは price を計算して返す（修正済み）
          const expectedPrice = property.sales_price || property.listing_price || 0;
          expect(listResponse.price).toBe(expectedPrice);

          // 一覧ページの price 計算ロジックは詳細ページの修正に影響されない
          // 一覧ページは常に price を返す（0 を含む）
          expect(listResponse.price).toBeDefined();
          expect(typeof listResponse.price).toBe('number');
        }
      ),
      {
        numRuns: 100,
        verbose: false,
      }
    );
  });

  /**
   * Preservation Property 3: 価格以外フィールドの保持
   *
   * 詳細APIのレスポンスで `address`、`property_type`、`land_area` などの
   * 価格以外フィールドが修正前後で同じであることを確認する。
   *
   * EXPECTED: このテストは PASS する（ベースライン動作の確認）
   *
   * **Validates: Requirements 3.3**
   */
  it('Preservation 3: 詳細APIの価格以外フィールドが修正前後で同じであること', async () => {
    await fc.assert(
      fc.asyncProperty(
        // 任意の物件データを生成（価格以外フィールドを含む）
        fc.record({
          id: fc.uuid(),
          property_number: fc.stringMatching(/^[A-Z]{2}\d{5}$/),
          sales_price: fc.oneof(
            fc.integer({ min: 1000000, max: 100000000 }),
            fc.constant(null)
          ),
          listing_price: fc.oneof(
            fc.integer({ min: 1000000, max: 100000000 }),
            fc.constant(null)
          ),
          is_hidden: fc.constant(false),
          address: fc.oneof(fc.string({ maxLength: 100 }), fc.constant(null)),
          property_type: fc.oneof(
            fc.constantFrom('土地', '戸建て', 'マンション'),
            fc.constant(null)
          ),
          land_area: fc.oneof(fc.float({ min: 10, max: 1000 }), fc.constant(null)),
          building_area: fc.oneof(fc.float({ min: 10, max: 500 }), fc.constant(null)),
          build_year: fc.oneof(fc.integer({ min: 1950, max: 2025 }), fc.constant(null)),
          structure: fc.oneof(
            fc.constantFrom('木造', 'RC', '鉄骨'),
            fc.constant(null)
          ),
          floor_plan: fc.oneof(
            fc.constantFrom('3LDK', '4LDK', '2LDK'),
            fc.constant(null)
          ),
        }),
        async (property) => {
          const images = ['image1.jpg', 'image2.jpg'];

          // 未修正コードのレスポンス
          const originalResponse = buildDetailResponseOriginal(property, images);
          // 修正後コードのレスポンス
          const fixedResponse = buildDetailResponseFixed(property, images);

          // 価格以外フィールドが修正前後で同じであることを確認
          const nonPriceFields = [
            'id',
            'property_number',
            'is_hidden',
            'address',
            'property_type',
            'land_area',
            'building_area',
            'build_year',
            'structure',
            'floor_plan',
            'images',
          ];

          for (const field of nonPriceFields) {
            expect(fixedResponse.property[field]).toEqual(
              originalResponse.property[field]
            );
          }

          // sales_price と listing_price も変わらないこと
          expect(fixedResponse.property.sales_price).toEqual(
            originalResponse.property.sales_price
          );
          expect(fixedResponse.property.listing_price).toEqual(
            originalResponse.property.listing_price
          );
        }
      ),
      {
        numRuns: 100,
        verbose: false,
      }
    );
  });

  /**
   * 具体例テスト: 価格なし物件（sales_price も listing_price も null）
   *
   * design.md の Examples より:
   * - `sales_price` も `listing_price` も null の物件: 詳細ページで「価格応談」と表示される → これは正しい動作（変更不要）
   */
  it('具体例: sales_price も listing_price も null の物件では price が設定されないこと', () => {
    const noPriceProperty: PropertyListingRow = {
      id: 'no-price-uuid-0000-0000-000000000000',
      property_number: 'ZZ99999',
      sales_price: null,
      listing_price: null,
      is_hidden: false,
      address: '大分市中央町1-1-1',
      property_type: '土地',
      land_area: 150.5,
    };

    // 未修正コードのレスポンス
    const originalResponse = buildDetailResponseOriginal(noPriceProperty, []);
    // 修正後コードのレスポンス
    const fixedResponse = buildDetailResponseFixed(noPriceProperty, []);

    console.log(`[価格なし物件] 未修正 price: ${originalResponse.property.price}`);
    console.log(`[価格なし物件] 修正後 price: ${fixedResponse.property.price}`);

    // 未修正コードでは price が設定されない（ベースライン確認）
    expect(originalResponse.property.price).toBeUndefined();

    // 修正後も price が設定されないこと（保持プロパティ）
    expect(fixedResponse.property.price).toBeUndefined();
  });

  /**
   * 具体例テスト: 一覧ページの price 計算が正しいこと
   *
   * design.md の Examples より:
   * - 一覧ページの同じ物件: 価格が正しく表示される
   */
  it('具体例: 一覧ページAPIは sales_price || listing_price を price として返すこと', () => {
    // sales_price あり
    const propertyWithSalesPrice: PropertyListingRow = {
      id: 'list-test-uuid-0000-0000-000000000001',
      property_number: 'CC19',
      sales_price: 35000000,
      listing_price: 32000000,
      is_hidden: false,
    };

    const listResponse1 = buildListResponse(propertyWithSalesPrice);
    // sales_price が優先される
    expect(listResponse1.price).toBe(35000000);
    console.log(`[一覧ページ CC19] price: ${listResponse1.price}`);

    // listing_price のみ
    const propertyWithListingPriceOnly: PropertyListingRow = {
      id: 'list-test-uuid-0000-0000-000000000002',
      property_number: 'AA99999',
      sales_price: null,
      listing_price: 28000000,
      is_hidden: false,
    };

    const listResponse2 = buildListResponse(propertyWithListingPriceOnly);
    // listing_price が使用される
    expect(listResponse2.price).toBe(28000000);
    console.log(`[一覧ページ AA99999] price: ${listResponse2.price}`);

    // 価格なし
    const propertyWithNoPrice: PropertyListingRow = {
      id: 'list-test-uuid-0000-0000-000000000003',
      property_number: 'ZZ99999',
      sales_price: null,
      listing_price: null,
      is_hidden: false,
    };

    const listResponse3 = buildListResponse(propertyWithNoPrice);
    // 価格なしは 0 を返す（一覧ページの動作）
    expect(listResponse3.price).toBe(0);
    console.log(`[一覧ページ ZZ99999] price: ${listResponse3.price}`);
  });

  /**
   * 具体例テスト: 詳細ページの価格以外フィールドが保持されること
   *
   * design.md の Preservation Requirements より:
   * - 詳細ページの価格以外の全フィールド（住所、物件タイプ、面積、画像など）は引き続き正しく表示する
   */
  it('具体例: 詳細ページの address、property_type、land_area などが修正前後で同じであること', () => {
    const property: PropertyListingRow = {
      id: 'detail-test-uuid-0000-0000-000000000001',
      property_number: 'BB12345',
      sales_price: 45000000,
      listing_price: 42000000,
      is_hidden: false,
      address: '大分市中央町2-3-4',
      property_type: '戸建て',
      land_area: 200.0,
      building_area: 120.5,
      build_year: 2010,
      structure: '木造',
      floor_plan: '4LDK',
    };

    const images = ['https://example.com/image1.jpg', 'https://example.com/image2.jpg'];

    // 未修正コードのレスポンス
    const originalResponse = buildDetailResponseOriginal(property, images);
    // 修正後コードのレスポンス
    const fixedResponse = buildDetailResponseFixed(property, images);

    // 価格以外フィールドが同じであることを確認
    expect(fixedResponse.property.address).toBe(originalResponse.property.address);
    expect(fixedResponse.property.property_type).toBe(originalResponse.property.property_type);
    expect(fixedResponse.property.land_area).toBe(originalResponse.property.land_area);
    expect(fixedResponse.property.building_area).toBe(originalResponse.property.building_area);
    expect(fixedResponse.property.build_year).toBe(originalResponse.property.build_year);
    expect(fixedResponse.property.structure).toBe(originalResponse.property.structure);
    expect(fixedResponse.property.floor_plan).toBe(originalResponse.property.floor_plan);
    expect(fixedResponse.property.images).toEqual(originalResponse.property.images);

    console.log(`[詳細ページ BB12345] address: ${fixedResponse.property.address}`);
    console.log(`[詳細ページ BB12345] property_type: ${fixedResponse.property.property_type}`);
    console.log(`[詳細ページ BB12345] land_area: ${fixedResponse.property.land_area}`);
    console.log(`[詳細ページ BB12345] 修正後 price: ${fixedResponse.property.price}`);
    console.log(`[詳細ページ BB12345] 未修正 price: ${originalResponse.property.price}`);
  });
});
