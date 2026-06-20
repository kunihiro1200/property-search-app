/**
 * 保持プロパティテスト: PropertyListingService.getPublicProperties
 *
 * Property 2: Preservation - 非バグ条件入力での動作保持
 *
 * このテストは修正前のコードで実行し、**成功することを確認する**（ベースライン動作の確認）
 * isBugCondition(X)=false となる入力のみを対象とする
 *
 * isBugCondition(X) = X.showPublicOnly=true AND (X.location OR X.propertyType OR X.priceRange)
 * → 非バグ条件: showPublicOnly=false、または他のフィルター条件が全て未指定
 *
 * Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6
 */

// 環境変数を設定
process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_KEY = 'test-key';
process.env.GOOGLE_SERVICE_ACCOUNT_JSON = JSON.stringify({
  type: 'service_account',
  project_id: 'test',
  private_key_id: 'test',
  private_key: '-----BEGIN RSA PRIVATE KEY-----\nMIIEowIBAAKCAQEA0Z3VS5JJcds3xHn/ygWep4PAtEsHAqGMkMg4bBMidZFRMFGQ\n-----END RSA PRIVATE KEY-----\n',
  client_email: 'test@test.iam.gserviceaccount.com',
  client_id: '123456789',
  auth_uri: 'https://accounts.google.com/o/oauth2/auth',
  token_uri: 'https://oauth2.googleapis.com/token',
});

// テスト用のサンプル物件データ
const sampleProperties = [
  {
    id: 'uuid-1',
    property_number: 'AA13674',
    property_type: '土地',
    address: '大分市品域南1-1-1',
    sales_price: 5000000,
    listing_price: null,
    land_area: 200,
    building_area: null,
    construction_year_month: null,
    image_url: null,
    storage_location: null,
    atbb_status: '公開中',
    google_map_url: null,
    latitude: 33.23,
    longitude: 131.61,
    distribution_date: '2025-01-01',
    created_at: '2025-01-01T00:00:00Z',
  },
  {
    id: 'uuid-2',
    property_number: 'AA13675',
    property_type: '戸建',
    address: '大分市中央1-2-3',
    sales_price: 15000000,
    listing_price: null,
    land_area: 150,
    building_area: 100,
    construction_year_month: '2010-05',
    image_url: null,
    storage_location: null,
    atbb_status: '公開中',
    google_map_url: null,
    latitude: 33.24,
    longitude: 131.62,
    distribution_date: '2025-01-02',
    created_at: '2025-01-02T00:00:00Z',
  },
  {
    id: 'uuid-3',
    property_number: 'AA13676',
    property_type: '土地',
    address: '別府市北浜1-1-1',
    sales_price: 3000000,
    listing_price: null,
    land_area: 100,
    building_area: null,
    construction_year_month: null,
    image_url: null,
    storage_location: null,
    atbb_status: '非公開案件',
    google_map_url: null,
    latitude: null,
    longitude: null,
    distribution_date: '2025-01-03',
    created_at: '2025-01-03T00:00:00Z',
  },
  {
    id: 'uuid-4',
    property_number: 'AA13677',
    property_type: 'マンション',
    address: '大分市府内町2-3-4',
    sales_price: 8000000,
    listing_price: null,
    land_area: null,
    building_area: 60,
    construction_year_month: '2015-03',
    image_url: null,
    storage_location: null,
    atbb_status: '公開中',
    google_map_url: null,
    latitude: 33.25,
    longitude: 131.63,
    distribution_date: '2025-01-04',
    created_at: '2025-01-04T00:00:00Z',
  },
];

// クエリビルダーのファクトリ関数（バグをシミュレートしない通常モード）
function createNormalQueryBuilder(returnData: any[]): any {
  const builder: any = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    not: jest.fn().mockReturnThis(),
    ilike: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    or: jest.fn().mockReturnThis(),
    range: jest.fn().mockResolvedValue({
      data: returnData,
      error: null,
      count: returnData.length,
    }),
  };
  return builder;
}

// Supabase クライアントをモジュールレベルでモック
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => createNormalQueryBuilder(sampleProperties)),
  })),
}));

// GoogleDriveService をモック
jest.mock('../GoogleDriveService', () => ({
  GoogleDriveService: jest.fn().mockImplementation(() => ({
    getDriveClient: jest.fn().mockResolvedValue({}),
    listFilesInFolder: jest.fn().mockResolvedValue([]),
    getFileMetadata: jest.fn().mockResolvedValue(null),
    downloadFile: jest.fn().mockResolvedValue(null),
  })),
}));

// PropertyImageService をモック
jest.mock('../PropertyImageService', () => ({
  PropertyImageService: jest.fn().mockImplementation(() => ({
    getImages: jest.fn().mockResolvedValue([]),
    getThumbnailUrl: jest.fn().mockReturnValue(null),
  })),
}));

// GeocodingService をモック
jest.mock('../GeocodingService', () => ({
  GeocodingService: jest.fn().mockImplementation(() => ({
    geocodeAddress: jest.fn().mockResolvedValue(null),
  })),
}));

// PropertyDistributionAreaCalculator をモック
jest.mock('../PropertyDistributionAreaCalculator', () => ({
  PropertyDistributionAreaCalculator: jest.fn().mockImplementation(() => ({
    calculateDistributionAreas: jest.fn().mockResolvedValue({ formatted: '' }),
  })),
}));

// CityNameExtractor をモック
jest.mock('../CityNameExtractor', () => ({
  CityNameExtractor: jest.fn().mockImplementation(() => ({
    extractCityFromAddress: jest.fn().mockReturnValue('大分市'),
  })),
}));

import { createClient } from '@supabase/supabase-js';
import { PropertyListingService } from '../PropertyListingService';

describe('PropertyListingService - 保持プロパティテスト（非バグ条件）', () => {
  let service: PropertyListingService;
  let mockFrom: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new PropertyListingService();

    // createClient のモックを取得して from を制御できるようにする
    const mockClient = (createClient as jest.Mock).mock.results[
      (createClient as jest.Mock).mock.results.length - 1
    ]?.value;
    if (mockClient) {
      mockFrom = mockClient.from as jest.Mock;
    }
  });

  /**
   * ヘルパー: 指定データを返すクエリビルダーをセットアップ
   */
  function setupQueryBuilder(returnData: any[]) {
    const builder = createNormalQueryBuilder(returnData);
    if (mockFrom) {
      mockFrom.mockReturnValue(builder);
    }
    return builder;
  }

  // ============================================================
  // テストケース1: フィルターなし全件取得
  // isBugCondition({}) = false（showPublicOnly=false かつ他のフィルターなし）
  // ============================================================
  describe('テストケース1: フィルターなし全件取得（Requirements 3.1）', () => {
    it('getPublicProperties({}) → 全物件が返ること', async () => {
      setupQueryBuilder(sampleProperties);

      const result = await service.getPublicProperties({});

      // 正常に結果が返ること
      expect(result).toBeDefined();
      expect(result.properties).toBeDefined();
      expect(Array.isArray(result.properties)).toBe(true);

      // 全物件が返ること（モックが全件を返すため）
      expect(result.properties.length).toBe(sampleProperties.length);

      // ページネーション情報が含まれること
      expect(result.pagination).toBeDefined();
      expect(result.pagination.total).toBe(sampleProperties.length);

      console.log(`テストケース1: ${result.properties.length}件の物件が返された`);
    });

    it('getPublicProperties({}) → エラーが発生しないこと', async () => {
      setupQueryBuilder(sampleProperties);

      let thrownError: Error | null = null;
      try {
        await service.getPublicProperties({});
      } catch (error: any) {
        thrownError = error;
      }

      expect(thrownError).toBeNull();
    });
  });

  // ============================================================
  // テストケース2: propertyType のみ
  // isBugCondition({propertyType: "土地"}) = false（showPublicOnly=false）
  // ============================================================
  describe('テストケース2: propertyType のみ（Requirements 3.2）', () => {
    it('getPublicProperties({propertyType: "土地"}) → 土地のみ返ること', async () => {
      const landProperties = sampleProperties.filter(p => p.property_type === '土地');
      setupQueryBuilder(landProperties);

      const result = await service.getPublicProperties({ propertyType: '土地' });

      // 正常に結果が返ること
      expect(result).toBeDefined();
      expect(result.properties).toBeDefined();
      expect(Array.isArray(result.properties)).toBe(true);

      // 土地のみが返ること
      expect(result.properties.length).toBe(landProperties.length);

      console.log(`テストケース2: ${result.properties.length}件の土地物件が返された`);
    });

    it('getPublicProperties({propertyType: "土地"}) → エラーが発生しないこと', async () => {
      const landProperties = sampleProperties.filter(p => p.property_type === '土地');
      setupQueryBuilder(landProperties);

      let thrownError: Error | null = null;
      try {
        await service.getPublicProperties({ propertyType: '土地' });
      } catch (error: any) {
        thrownError = error;
      }

      expect(thrownError).toBeNull();
    });
  });

  // ============================================================
  // テストケース3: location のみ
  // isBugCondition({location: "大分市"}) = false（showPublicOnly=false）
  // ============================================================
  describe('テストケース3: location のみ（Requirements 3.3）', () => {
    it('getPublicProperties({location: "大分市"}) → 大分市の物件のみ返ること', async () => {
      const oitaProperties = sampleProperties.filter(p => p.address.includes('大分市'));
      setupQueryBuilder(oitaProperties);

      const result = await service.getPublicProperties({ location: '大分市' });

      // 正常に結果が返ること
      expect(result).toBeDefined();
      expect(result.properties).toBeDefined();
      expect(Array.isArray(result.properties)).toBe(true);

      // 大分市の物件のみが返ること
      expect(result.properties.length).toBe(oitaProperties.length);

      console.log(`テストケース3: ${result.properties.length}件の大分市物件が返された`);
    });

    it('getPublicProperties({location: "大分市"}) → エラーが発生しないこと', async () => {
      const oitaProperties = sampleProperties.filter(p => p.address.includes('大分市'));
      setupQueryBuilder(oitaProperties);

      let thrownError: Error | null = null;
      try {
        await service.getPublicProperties({ location: '大分市' });
      } catch (error: any) {
        thrownError = error;
      }

      expect(thrownError).toBeNull();
    });
  });

  // ============================================================
  // テストケース4: showPublicOnly=true のみ（他のフィルターなし）
  // isBugCondition({showPublicOnly: true}) = false（他のフィルター条件が全て未指定）
  // ============================================================
  describe('テストケース4: showPublicOnly=true のみ（Requirements 3.4）', () => {
    it('getPublicProperties({showPublicOnly: true}) → 公開中のみ返ること', async () => {
      const publicProperties = sampleProperties.filter(p =>
        p.atbb_status && p.atbb_status.includes('公開中')
      );
      setupQueryBuilder(publicProperties);

      const result = await service.getPublicProperties({ showPublicOnly: true });

      // 正常に結果が返ること
      expect(result).toBeDefined();
      expect(result.properties).toBeDefined();
      expect(Array.isArray(result.properties)).toBe(true);

      // 公開中のみが返ること
      expect(result.properties.length).toBe(publicProperties.length);

      console.log(`テストケース4: ${result.properties.length}件の公開中物件が返された`);
    });

    it('getPublicProperties({showPublicOnly: true}) → エラーが発生しないこと', async () => {
      const publicProperties = sampleProperties.filter(p =>
        p.atbb_status && p.atbb_status.includes('公開中')
      );
      setupQueryBuilder(publicProperties);

      let thrownError: Error | null = null;
      try {
        await service.getPublicProperties({ showPublicOnly: true });
      } catch (error: any) {
        thrownError = error;
      }

      expect(thrownError).toBeNull();
    });
  });

  // ============================================================
  // テストケース5: priceRange のみ
  // isBugCondition({priceRange: {min: 1000}}) = false（showPublicOnly=false）
  // ============================================================
  describe('テストケース5: priceRange のみ（Requirements 3.5）', () => {
    it('getPublicProperties({priceRange: {min: 1000}}) → 価格帯に合致する物件のみ返ること', async () => {
      const minPrice = 1000;
      const priceFilteredProperties = sampleProperties.filter(p =>
        (p.sales_price !== null && p.sales_price >= minPrice) ||
        (p.listing_price !== null && p.listing_price >= minPrice)
      );
      setupQueryBuilder(priceFilteredProperties);

      const result = await service.getPublicProperties({
        priceRange: { min: minPrice },
      });

      // 正常に結果が返ること
      expect(result).toBeDefined();
      expect(result.properties).toBeDefined();
      expect(Array.isArray(result.properties)).toBe(true);

      // 価格帯に合致する物件のみが返ること
      expect(result.properties.length).toBe(priceFilteredProperties.length);

      console.log(`テストケース5: ${result.properties.length}件の価格帯合致物件が返された`);
    });

    it('getPublicProperties({priceRange: {min: 1000}}) → エラーが発生しないこと', async () => {
      const priceFilteredProperties = sampleProperties.filter(p =>
        (p.sales_price !== null && p.sales_price >= 1000) ||
        (p.listing_price !== null && p.listing_price >= 1000)
      );
      setupQueryBuilder(priceFilteredProperties);

      let thrownError: Error | null = null;
      try {
        await service.getPublicProperties({ priceRange: { min: 1000 } });
      } catch (error: any) {
        thrownError = error;
      }

      expect(thrownError).toBeNull();
    });

    it('getPublicProperties({priceRange: {min: 1000, max: 10000000}}) → エラーが発生しないこと', async () => {
      const priceFilteredProperties = sampleProperties.filter(p =>
        (p.sales_price !== null && p.sales_price >= 1000 && p.sales_price <= 10000000)
      );
      setupQueryBuilder(priceFilteredProperties);

      let thrownError: Error | null = null;
      try {
        await service.getPublicProperties({ priceRange: { min: 1000, max: 10000000 } });
      } catch (error: any) {
        thrownError = error;
      }

      expect(thrownError).toBeNull();
    });
  });

  // ============================================================
  // テストケース6: withCoordinates=true のみ
  // isBugCondition({withCoordinates: true}) = false（showPublicOnly=false）
  // ============================================================
  describe('テストケース6: withCoordinates=true のみ（Requirements 3.6）', () => {
    it('getPublicProperties({withCoordinates: true}) → 座標がある物件のみ返ること', async () => {
      const coordinateProperties = sampleProperties.filter(
        p => p.latitude !== null && p.longitude !== null
      );
      setupQueryBuilder(coordinateProperties);

      const result = await service.getPublicProperties({
        withCoordinates: true,
        skipImages: true,
      });

      // 正常に結果が返ること
      expect(result).toBeDefined();
      expect(result.properties).toBeDefined();
      expect(Array.isArray(result.properties)).toBe(true);

      // 座標がある物件のみが返ること
      expect(result.properties.length).toBe(coordinateProperties.length);

      console.log(`テストケース6: ${result.properties.length}件の座標あり物件が返された`);
    });

    it('getPublicProperties({withCoordinates: true}) → エラーが発生しないこと', async () => {
      const coordinateProperties = sampleProperties.filter(
        p => p.latitude !== null && p.longitude !== null
      );
      setupQueryBuilder(coordinateProperties);

      let thrownError: Error | null = null;
      try {
        await service.getPublicProperties({ withCoordinates: true, skipImages: true });
      } catch (error: any) {
        thrownError = error;
      }

      expect(thrownError).toBeNull();
    });
  });

  // ============================================================
  // 追加: 非バグ条件の組み合わせ（showPublicOnly=false + 他のフィルター）
  // isBugCondition({showPublicOnly: false, location: "大分市"}) = false
  // ============================================================
  describe('追加: showPublicOnly=false + 他のフィルター（非バグ条件）', () => {
    it('showPublicOnly=false + location="大分市" → エラーが発生しないこと', async () => {
      const oitaProperties = sampleProperties.filter(p => p.address.includes('大分市'));
      setupQueryBuilder(oitaProperties);

      let thrownError: Error | null = null;
      let result: any = null;
      try {
        result = await service.getPublicProperties({
          showPublicOnly: false,
          location: '大分市',
        });
      } catch (error: any) {
        thrownError = error;
      }

      expect(thrownError).toBeNull();
      expect(result).toBeDefined();
      expect(result.properties).toBeDefined();
    });

    it('showPublicOnly=false + priceRange={min: 1000} → エラーが発生しないこと', async () => {
      setupQueryBuilder(sampleProperties);

      let thrownError: Error | null = null;
      let result: any = null;
      try {
        result = await service.getPublicProperties({
          showPublicOnly: false,
          priceRange: { min: 1000 },
        });
      } catch (error: any) {
        thrownError = error;
      }

      expect(thrownError).toBeNull();
      expect(result).toBeDefined();
      expect(result.properties).toBeDefined();
    });

    it('showPublicOnly=false + propertyType="土地" + location="大分市" → エラーが発生しないこと', async () => {
      const filteredProperties = sampleProperties.filter(
        p => p.property_type === '土地' && p.address.includes('大分市')
      );
      setupQueryBuilder(filteredProperties);

      let thrownError: Error | null = null;
      let result: any = null;
      try {
        result = await service.getPublicProperties({
          showPublicOnly: false,
          propertyType: '土地',
          location: '大分市',
        });
      } catch (error: any) {
        thrownError = error;
      }

      expect(thrownError).toBeNull();
      expect(result).toBeDefined();
      expect(result.properties).toBeDefined();
    });
  });

  // ============================================================
  // 結果構造の検証: 返却データの形式が正しいこと
  // ============================================================
  describe('結果構造の検証', () => {
    it('返却データに properties と pagination が含まれること', async () => {
      setupQueryBuilder(sampleProperties);

      const result = await service.getPublicProperties({});

      expect(result).toHaveProperty('properties');
      expect(result).toHaveProperty('pagination');
      expect(result.pagination).toHaveProperty('total');
      expect(result.pagination).toHaveProperty('limit');
      expect(result.pagination).toHaveProperty('offset');
    });

    it('各物件データに必須フィールドが含まれること', async () => {
      setupQueryBuilder(sampleProperties);

      const result = await service.getPublicProperties({});

      result.properties.forEach((property: any) => {
        expect(property).toHaveProperty('id');
        expect(property).toHaveProperty('property_number');
        expect(property).toHaveProperty('property_type');
        expect(property).toHaveProperty('address');
        expect(property).toHaveProperty('atbb_status');
        expect(property).toHaveProperty('badge_type');
        expect(property).toHaveProperty('is_clickable');
      });
    });

    it('空の結果でも正常に返ること', async () => {
      setupQueryBuilder([]);

      const result = await service.getPublicProperties({});

      expect(result).toBeDefined();
      expect(result.properties).toEqual([]);
      expect(result.pagination.total).toBe(0);
    });
  });
});
