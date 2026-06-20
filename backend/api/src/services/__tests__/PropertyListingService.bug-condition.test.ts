/**
 * バグ条件探索テスト: PropertyListingService.getPublicProperties
 *
 * バグ: showPublicOnly=true + 他のフィルター条件を同時指定すると
 *       Supabase の .or() が連鎖して 400 エラーが発生する
 *
 * このテストは修正前のコードで実行し、失敗することを確認する（失敗 = バグの存在を証明）
 *
 * Validates: Requirements 1.3, 2.3
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

// .or() の呼び出し回数を追跡するための変数
let orCallCount = 0;
let orCallArgs: string[] = [];
let simulateBugMode = true;
let rangeResult: any = null;

/**
 * クエリビルダーのファクトリ関数
 *
 * バグ再現のポイント:
 * - .or() が複数回呼ばれると、PostgREST は 400 エラーを返す
 * - このモックでは .or() の呼び出し回数を記録し、
 *   2回以上呼ばれた場合に 400 エラーをシミュレートする
 */
function createQueryBuilder(): any {
  const builder: any = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    not: jest.fn().mockReturnThis(),
    ilike: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    range: jest.fn().mockImplementation(() => {
      if (rangeResult !== null) {
        return Promise.resolve(rangeResult);
      }
      return Promise.resolve({
        data: [
          {
            id: 'test-uuid-1',
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
        ],
        error: null,
        count: 1,
      });
    }),
    or: jest.fn().mockImplementation((condition: string) => {
      orCallCount++;
      orCallArgs.push(condition);

      // バグ再現: .or() が2回以上呼ばれると 400 エラーをシミュレート
      if (simulateBugMode && orCallCount >= 2) {
        rangeResult = {
          data: null,
          error: {
            message: 'Bad Request',
            code: '400',
            details: 'Multiple .or() calls conflict in PostgREST query',
            hint: 'Use a single .or() call with combined conditions',
          },
          count: null,
        };
      }

      return builder;
    }),
  };
  return builder;
}

// Supabase クライアントをモジュールレベルでモック
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => createQueryBuilder()),
  })),
}));

// GoogleDriveService をモック（コンストラクタでの初期化エラーを回避）
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

import { PropertyListingService } from '../PropertyListingService';

describe('PropertyListingService - バグ条件探索テスト', () => {
  let service: PropertyListingService;

  beforeEach(() => {
    // 各テスト前にカウンターをリセット
    orCallCount = 0;
    orCallArgs = [];
    rangeResult = null;
    simulateBugMode = true;
    jest.clearAllMocks();
    service = new PropertyListingService();
  });

  /**
   * テストケース1: showPublicOnly=true + location + propertyType の組み合わせ
   *
   * AA13674 の実際のバグ再現シナリオ
   * 期待: 400 エラーが発生しないこと（修正前は失敗するはず）
   */
  it('テストケース1: showPublicOnly=true + location="大分市品域南" + propertyType="土地" → 400 エラーが発生しないこと', async () => {
    // このテストケースでは priceRange がないため .or() は呼ばれないはず
    // showPublicOnly=true は .not() + .ilike() を使用するため .or() を呼ばない
    const result = await service.getPublicProperties({
      showPublicOnly: true,
      location: '大分市品域南',
      propertyType: '土地',
      limit: 20,
      offset: 0,
    });

    console.log(`テストケース1: .or() 呼び出し回数 = ${orCallCount}`);
    console.log(`テストケース1: .or() 引数 = ${JSON.stringify(orCallArgs)}`);

    // 400 エラーが発生しないこと（result が正常に返ること）
    expect(result).toBeDefined();
    expect(result.properties).toBeDefined();
    expect(Array.isArray(result.properties)).toBe(true);
  });

  /**
   * テストケース2: showPublicOnly=true + priceRange の組み合わせ
   *
   * .or() が連鎖するバグの直接再現
   * 期待: 400 エラーが発生しないこと（修正前は失敗するはず）
   *
   * バグ条件:
   * - showPublicOnly=true → .not() + .ilike() を追加（.or() は使わない）
   * - priceRange.min → .or(`sales_price.gte.X,listing_price.gte.X`) を追加（1回目の .or()）
   * - priceRange.max → .or(`sales_price.lte.X,listing_price.lte.X`) を追加（2回目の .or()）
   * → .or() が2回呼ばれ、PostgREST が 400 エラーを返す
   */
  it('テストケース2: showPublicOnly=true + priceRange={min: 1000} → 400 エラーが発生しないこと', async () => {
    let thrownError: Error | null = null;
    let result: any = null;

    try {
      result = await service.getPublicProperties({
        showPublicOnly: true,
        priceRange: { min: 1000 },
        limit: 20,
        offset: 0,
      });
    } catch (error: any) {
      thrownError = error;
    }

    console.log(`テストケース2: .or() 呼び出し回数 = ${orCallCount}`);
    console.log(`テストケース2: .or() 引数 = ${JSON.stringify(orCallArgs)}`);

    if (thrownError) {
      console.log(`テストケース2: エラーが発生 = ${thrownError.message}`);
    }

    // 400 エラーが発生しないこと（修正前はここで失敗するはず）
    expect(thrownError).toBeNull();
    expect(result).toBeDefined();
    expect(result.properties).toBeDefined();
  });

  /**
   * テストケース3: showPublicOnly=true + location の組み合わせ
   *
   * .ilike() と .or() の組み合わせによるバグ再現
   * 期待: 400 エラーが発生しないこと（修正前は失敗するはず）
   */
  it('テストケース3: showPublicOnly=true + location="大分市" → 400 エラーが発生しないこと', async () => {
    let thrownError: Error | null = null;
    let result: any = null;

    try {
      result = await service.getPublicProperties({
        showPublicOnly: true,
        location: '大分市',
        limit: 20,
        offset: 0,
      });
    } catch (error: any) {
      thrownError = error;
    }

    console.log(`テストケース3: .or() 呼び出し回数 = ${orCallCount}`);
    console.log(`テストケース3: .or() 引数 = ${JSON.stringify(orCallArgs)}`);

    if (thrownError) {
      console.log(`テストケース3: エラーが発生 = ${thrownError.message}`);
    }

    // 400 エラーが発生しないこと
    expect(thrownError).toBeNull();
    expect(result).toBeDefined();
    expect(result.properties).toBeDefined();
  });

  /**
   * バグ直接検証テスト: showPublicOnly=true + priceRange.min + priceRange.max
   *
   * .or() が2回連鎖する最悪のケース
   * このテストは修正前のコードで失敗することを確認する
   *
   * 修正前: priceRange.min と priceRange.max がそれぞれ .or() を呼ぶため
   *         .or() が2回呼ばれ、400 エラーが発生する
   * 修正後: .or() が1回にまとめられ、400 エラーが発生しない
   */
  it('バグ直接検証: showPublicOnly=true + priceRange={min: 1000, max: 5000} → .or() が2回以上呼ばれないこと', async () => {
    let thrownError: Error | null = null;
    let result: any = null;

    try {
      result = await service.getPublicProperties({
        showPublicOnly: true,
        priceRange: { min: 1000, max: 5000 },
        limit: 20,
        offset: 0,
      });
    } catch (error: any) {
      thrownError = error;
    }

    console.log(`バグ直接検証: .or() 呼び出し回数 = ${orCallCount}`);
    console.log(`バグ直接検証: .or() 引数 = ${JSON.stringify(orCallArgs)}`);

    if (thrownError) {
      console.log(`バグ直接検証: エラーが発生 = ${thrownError.message}`);
    }

    // 修正前のコードでは以下のアサーションが失敗するはず:
    // - orCallCount >= 2 → .or() が2回以上呼ばれている（バグの証拠）
    // - result が null または error が含まれる

    // 修正後の期待動作:
    expect(thrownError).toBeNull();
    expect(result).toBeDefined();
    expect(result.properties).toBeDefined();

    // .or() が2回以上呼ばれていないこと（修正後の期待動作）
    // 修正前: orCallCount = 2 → バグ発生
    // 修正後: orCallCount <= 1 または条件が適切にまとめられている
    expect(orCallCount).toBeLessThan(2);
  });

  /**
   * 正常系テスト: showPublicOnly=false + priceRange の組み合わせ（バグ条件外）
   *
   * バグ条件が成立しない場合は正常に動作することを確認
   * このテストは修正前後どちらでも成功するはず
   */
  it('正常系: showPublicOnly=false + priceRange={min: 1000} → 正常に動作すること', async () => {
    simulateBugMode = false; // バグをシミュレートしない

    const result = await service.getPublicProperties({
      showPublicOnly: false,
      priceRange: { min: 1000 },
      limit: 20,
      offset: 0,
    });

    console.log(`正常系: .or() 呼び出し回数 = ${orCallCount}`);

    // 正常に結果が返ること
    expect(result).toBeDefined();
    expect(result.properties).toBeDefined();
    expect(Array.isArray(result.properties)).toBe(true);
  });
});
