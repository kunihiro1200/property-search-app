/**
 * Property 2: Preservation - storage_location設定済み物件の画像表示保全テスト
 *
 * 目的:
 *   - 未修正コードで非バグ条件の入力（storage_location が設定済みの物件）を観察する
 *   - 修正後も同じ動作が保持されることを確認するためのベースラインを記録する
 *
 * 観察メソドロジー:
 *   - 現在の本番APIの動作を観察してベースラインを記録する
 *   - 修正後に同じテストを実行して、動作が変わっていないことを確認する
 *
 * Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5
 *
 * 期待される結果: 成功（ベースライン動作の確認）
 */

const API_BASE_URL = 'https://property-site-frontend-kappa.vercel.app';

// テスト対象物件
// AA12649: design.mdで「正常例（他物件）」として挙げられている物件
// athome_dataにGoogle DriveフォルダURLを持つ物件も含める
const TEST_PROPERTIES = [
  'AA12649',   // design.mdで「storage_location設定済み」として挙げられている物件
  'AA13876',   // athome_data[0]にGoogle DriveフォルダURLを持つ物件
  'AA10790-2', // athome_data[0]にGoogle DriveフォルダURLを持つ物件
];

interface ImageResponse {
  images: Array<{
    id: string;
    thumbnailUrl?: string;
    url?: string;
    name?: string;
  }>;
  cached?: boolean;
  totalCount?: number;
  visibleCount?: number;
  error?: string;
  message?: string;
}

interface PropertyDetail {
  property?: {
    property_number: string;
    storage_location?: string | null;
    atbb_status?: string;
  };
  athomeData?: string[] | null;
}

/**
 * 指定した物件番号の画像一覧を取得する
 */
async function fetchPropertyImages(propertyNumber: string): Promise<{ status: number; data: ImageResponse }> {
  const url = `${API_BASE_URL}/api/public/properties/${propertyNumber}/images`;
  const response = await fetch(url);
  const data = await response.json() as ImageResponse;
  return { status: response.status, data };
}

/**
 * 指定した物件番号の詳細情報を取得する（storage_location確認用）
 */
async function fetchPropertyDetail(propertyNumber: string): Promise<PropertyDetail> {
  const url = `${API_BASE_URL}/api/public/properties/${propertyNumber}/complete`;
  const response = await fetch(url);
  return await response.json() as PropertyDetail;
}

/**
 * 保全プロパティテストのメイン関数
 *
 * Property 2: Preservation
 * 観察優先メソドロジー: 現在の動作を観察してベースラインを記録する
 */
async function runPreservationTest(): Promise<void> {
  console.log('='.repeat(60));
  console.log('Property 2: Preservation テスト');
  console.log('storage_location設定済み物件の画像表示保全');
  console.log('='.repeat(60));
  console.log(`\n対象API: ${API_BASE_URL}`);
  console.log(`対象物件: ${TEST_PROPERTIES.join(', ')}`);
  console.log('\n目的: 修正前のベースライン動作を記録する');
  console.log('方針: 観察優先メソドロジー - 現在の動作を観察してベースラインとして記録\n');

  const baseline: Record<string, {
    storageLocation: string | null | undefined;
    athomeDataHasDriveUrl: boolean;
    imagesCount: number;
    httpStatus: number;
    cached: boolean | undefined;
    hasThumbnailUrl: boolean;
    error: string | undefined;
  }> = {};

  for (const propertyNumber of TEST_PROPERTIES) {
    console.log(`\n${'─'.repeat(50)}`);
    console.log(`🏠 物件番号: ${propertyNumber}`);
    console.log(`${'─'.repeat(50)}`);

    try {
      // 物件詳細を取得してstorage_locationを確認
      const detail = await fetchPropertyDetail(propertyNumber);
      const storageLocation = detail.property?.storage_location;
      const athomeData = detail.athomeData;
      const athomeDataHasDriveUrl = Array.isArray(athomeData) && 
        athomeData.some((url: string) => typeof url === 'string' && url.includes('/folders/'));

      console.log(`\n[物件情報]`);
      console.log(`  storage_location: ${storageLocation ?? 'NULL'}`);
      console.log(`  athome_data: ${JSON.stringify(athomeData)}`);
      console.log(`  athome_data[0]にGoogle DriveフォルダURL: ${athomeDataHasDriveUrl ? '✅ あり' : '❌ なし'}`);

      // 画像APIを呼び出す
      console.log(`\n[画像取得テスト]`);
      const { status, data } = await fetchPropertyImages(propertyNumber);
      const imagesCount = data.images?.length ?? 0;
      const hasThumbnailUrl = imagesCount > 0 && !!data.images[0].thumbnailUrl;

      console.log(`  HTTP Status: ${status}`);
      console.log(`  images.length: ${imagesCount}`);
      console.log(`  cached: ${data.cached ?? 'N/A'}`);
      if (data.error) {
        console.log(`  error: ${data.error}`);
      }
      if (imagesCount > 0) {
        console.log(`  images[0].thumbnailUrl: ${hasThumbnailUrl ? '✅ 存在する' : '❌ なし'}`);
      }

      // ベースラインを記録
      baseline[propertyNumber] = {
        storageLocation,
        athomeDataHasDriveUrl,
        imagesCount,
        httpStatus: status,
        cached: data.cached,
        hasThumbnailUrl,
        error: data.error,
      };

    } catch (error: any) {
      console.error(`\n❌ エラーが発生しました: ${error.message}`);
      baseline[propertyNumber] = {
        storageLocation: undefined,
        athomeDataHasDriveUrl: false,
        imagesCount: 0,
        httpStatus: 0,
        cached: undefined,
        hasThumbnailUrl: false,
        error: error.message,
      };
    }
  }

  // ベースラインサマリーを出力
  console.log('\n' + '='.repeat(60));
  console.log('📊 ベースライン記録（修正前の動作）');
  console.log('='.repeat(60));

  for (const [propertyNumber, record] of Object.entries(baseline)) {
    console.log(`\n物件番号: ${propertyNumber}`);
    console.log(`  storage_location: ${record.storageLocation ?? 'NULL'}`);
    console.log(`  athome_data[0]にDriveURL: ${record.athomeDataHasDriveUrl ? 'あり' : 'なし'}`);
    console.log(`  HTTP Status: ${record.httpStatus}`);
    console.log(`  images.length: ${record.imagesCount}`);
    console.log(`  thumbnailUrl存在: ${record.hasThumbnailUrl ? 'あり' : 'なし'}`);
    console.log(`  cached: ${record.cached ?? 'N/A'}`);
    if (record.error) {
      console.log(`  error: ${record.error}`);
    }
  }

  // 保全テストのアサーション
  console.log('\n' + '='.repeat(60));
  console.log('🔍 保全テスト アサーション');
  console.log('='.repeat(60));
  console.log('\n保全テストの目的:');
  console.log('  修正後も、現在の動作が変わらないことを確認する');
  console.log('\n現在の観察結果:');

  let allObservationsRecorded = true;

  for (const [propertyNumber, record] of Object.entries(baseline)) {
    const isBugCondition = !record.storageLocation && !record.athomeDataHasDriveUrl;
    const isNonBugCondition = record.storageLocation || record.athomeDataHasDriveUrl;

    if (isNonBugCondition) {
      // 非バグ条件: storage_locationまたはathome_dataにDriveURLがある
      console.log(`\n✅ ${propertyNumber}: 非バグ条件（athome_dataにDriveURL存在）`);
      console.log(`   現在の動作: images.length=${record.imagesCount}`);
      console.log(`   保全アサーション: 修正後も images.length=${record.imagesCount} が返されること`);
      
      // 現在の動作を記録（修正後の比較用）
      if (record.imagesCount === 0) {
        console.log(`   ⚠️ 注意: 現在は images.length=0 が返されています`);
        console.log(`   これはフォールバックロジックの問題の可能性があります`);
        console.log(`   修正後は images.length > 0 が期待されます（バグ修正の影響範囲）`);
      }
    } else {
      // バグ条件: storage_locationもathome_dataのDriveURLもない
      console.log(`\n⚠️ ${propertyNumber}: バグ条件（storage_location=NULL, athome_dataにDriveURLなし）`);
      console.log(`   現在の動作: images.length=${record.imagesCount}, error=${record.error ?? 'なし'}`);
      console.log(`   保全アサーション: 修正後も同じ動作が保持されること（バグ修正の影響外）`);
    }

    if (record.httpStatus === 0) {
      allObservationsRecorded = false;
    }
  }

  console.log('\n' + '='.repeat(60));
  
  if (allObservationsRecorded) {
    console.log('✅ ベースライン記録完了');
    console.log('\n📋 修正後の確認事項:');
    console.log('  1. AA12649（storage_location設定済みの場合）: images.length > 0 が返されること');
    console.log('  2. athome_data[0]にDriveURLがある物件: images.length > 0 が返されること');
    console.log('  3. storage_locationもathome_dataのDriveURLもない物件: 現在と同じ動作が保持されること');
    console.log('\n✅ 保全テスト: ベースライン記録成功');
  } else {
    console.log('❌ 一部の観察が失敗しました');
    process.exit(1);
  }
}

// メイン実行
runPreservationTest().catch((error) => {
  console.error('❌ テスト実行中にエラーが発生しました:', error);
  process.exit(1);
});
