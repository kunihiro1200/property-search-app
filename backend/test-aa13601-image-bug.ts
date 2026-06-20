/**
 * AA13601 画像取得バグ条件探索テスト
 *
 * Property 1: Bug Condition - AA13601 画像取得空配列バグ
 *
 * 目的: バグが存在することを示すカウンターサンプルを発見する
 * 期待される結果: テスト失敗（バグの存在を証明）
 *
 * Validates: Requirements 1.1, 1.2, 1.4
 */

import { createClient } from '@supabase/supabase-js';
import * as https from 'https';
import * as http from 'http';

// Supabase接続設定
const supabaseUrl = process.env.SUPABASE_URL || 'https://krxhrbtlgfjzsseegaqq.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtyeGhyYnRsZ2ZqenNzZWVnYXFxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzAyMTQxMSwiZXhwIjoyMDc4NTk3NDExfQ.nog3UX9J9OgfqlCIPJt_sU_exE6Ny-nSj_HmwgV3oA8';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// 本番APIのベースURL
const PROD_API_BASE = 'https://property-site-frontend-kappa.vercel.app';

/**
 * HTTPリクエストを実行するユーティリティ
 */
function fetchJson(url: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const client = isHttps ? https : http;

    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'AA13601-Bug-Test/1.0',
      },
    };

    const req = client.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(30000, () => {
      req.destroy();
      reject(new Error('Request timeout after 30s'));
    });
    req.end();
  });
}

/**
 * バグ条件の判定関数
 * design.md の isBugCondition() に対応
 */
function isBugCondition(
  storageLocation: string | null,
  workTasksUrl: string | null,
  athomeData: string[] | null
): boolean {
  const storageLocationEmpty = !storageLocation || storageLocation.trim() === '';
  const workTasksUrlEmpty = !workTasksUrl || workTasksUrl.trim() === '';
  const athomeDataNoFolderUrl =
    !athomeData ||
    athomeData.length === 0 ||
    !athomeData[0] ||
    !athomeData[0].includes('/folders/');

  return storageLocationEmpty && workTasksUrlEmpty && athomeDataNoFolderUrl;
}

async function runBugConditionTest() {
  console.log('='.repeat(60));
  console.log('AA13601 画像取得バグ条件探索テスト');
  console.log('Property 1: Bug Condition');
  console.log('='.repeat(60));
  console.log('');

  let testPassed = false;
  const counterExamples: string[] = [];

  // ─────────────────────────────────────────────────────────
  // Step 1: DBの storage_location を確認
  // ─────────────────────────────────────────────────────────
  console.log('【Step 1】DBの storage_location を確認...');
  const { data: propertyData, error: propertyError } = await supabase
    .from('property_listings')
    .select('property_number, storage_location, atbb_status')
    .eq('property_number', 'AA13601')
    .single();

  if (propertyError) {
    console.error('❌ DB取得エラー:', propertyError.message);
    process.exit(1);
  }

  if (!propertyData) {
    console.error('❌ AA13601 が property_listings に存在しません');
    process.exit(1);
  }

  console.log('  property_number:', propertyData.property_number);
  console.log('  storage_location:', propertyData.storage_location ?? 'NULL');
  console.log('  atbb_status:', propertyData.atbb_status);

  const storageLocationIsNull = !propertyData.storage_location;
  if (storageLocationIsNull) {
    console.log('  ✅ storage_location が NULL → バグ条件の一部を確認');
    counterExamples.push('storage_location = NULL');
  } else {
    console.log('  ⚠️  storage_location が設定済み:', propertyData.storage_location);
  }
  console.log('');

  // ─────────────────────────────────────────────────────────
  // Step 2: property_details の athome_data を確認
  // ─────────────────────────────────────────────────────────
  console.log('【Step 2】property_details の athome_data を確認...');
  const { data: detailsData, error: detailsError } = await supabase
    .from('property_details')
    .select('property_number, athome_data')
    .eq('property_number', 'AA13601')
    .single();

  let athomeData: string[] | null = null;
  if (detailsError) {
    console.log('  ⚠️  property_details にエントリなし（または取得エラー）:', detailsError.message);
    counterExamples.push('property_details エントリなし');
  } else if (detailsData) {
    athomeData = detailsData.athome_data;
    console.log('  athome_data:', JSON.stringify(athomeData));

    if (!athomeData || athomeData.length === 0) {
      console.log('  ✅ athome_data が空 → バグ条件の一部を確認');
      counterExamples.push('athome_data = null または空配列');
    } else if (athomeData[0] && !athomeData[0].includes('/folders/')) {
      console.log('  ✅ athome_data[0] が Google Drive フォルダURLでない:', athomeData[0]);
      counterExamples.push(`athome_data[0] = "${athomeData[0]}" (フォルダURLでない)`);
    } else {
      console.log('  ⚠️  athome_data[0] に /folders/ が含まれる:', athomeData[0]);
    }
  }
  console.log('');

  // ─────────────────────────────────────────────────────────
  // Step 3: work_tasks テーブルの格納先URL を確認
  // ─────────────────────────────────────────────────────────
  console.log('【Step 3】work_tasks テーブルの格納先URL を確認...');
  let workTasksUrl: string | null = null;
  const { data: workTasksData, error: workTasksError } = await supabase
    .from('work_tasks')
    .select('*')
    .eq('property_number', 'AA13601')
    .limit(5);

  if (workTasksError) {
    console.log('  ⚠️  work_tasks 取得エラー（テーブルが存在しないか権限なし）:', workTasksError.message);
    counterExamples.push('work_tasks 取得不可');
  } else if (!workTasksData || workTasksData.length === 0) {
    console.log('  ✅ work_tasks に AA13601 のエントリなし → バグ条件の一部を確認');
    counterExamples.push('work_tasks に AA13601 エントリなし');
  } else {
    console.log('  work_tasks エントリ数:', workTasksData.length);
    // 格納先URLカラムを探す
    const urlFields = ['storage_url', '格納先URL', 'folder_url', 'drive_url'];
    for (const row of workTasksData) {
      for (const field of urlFields) {
        if (row[field]) {
          workTasksUrl = row[field];
          console.log(`  ⚠️  work_tasks.${field} に値あり:`, workTasksUrl);
          break;
        }
      }
      if (workTasksUrl) break;
    }
    if (!workTasksUrl) {
      console.log('  ✅ work_tasks に格納先URLなし → バグ条件の一部を確認');
      counterExamples.push('work_tasks に格納先URLなし');
    }
  }
  console.log('');

  // ─────────────────────────────────────────────────────────
  // Step 4: バグ条件の総合判定
  // ─────────────────────────────────────────────────────────
  console.log('【Step 4】バグ条件の総合判定...');
  const bugConditionMet = isBugCondition(
    propertyData.storage_location,
    workTasksUrl,
    athomeData
  );

  if (bugConditionMet) {
    console.log('  ✅ バグ条件が成立しています');
    console.log('  カウンターサンプル:');
    counterExamples.forEach(ex => console.log(`    - ${ex}`));
  } else {
    console.log('  ⚠️  バグ条件が成立していません（一部の条件が満たされていない）');
  }
  console.log('');

  // ─────────────────────────────────────────────────────────
  // Step 5: 本番APIエンドポイントを呼び出してレスポンスを確認
  // ─────────────────────────────────────────────────────────
  console.log('【Step 5】本番APIエンドポイントを呼び出し...');
  console.log(`  URL: ${PROD_API_BASE}/api/public/properties/AA13601/images`);

  let apiResponse: any = null;
  try {
    apiResponse = await fetchJson(`${PROD_API_BASE}/api/public/properties/AA13601/images`);
    console.log('  HTTPステータス:', apiResponse.status);
    console.log('  レスポンスボディ:', JSON.stringify(apiResponse.body, null, 2).substring(0, 500));
  } catch (err: any) {
    console.error('  ❌ APIリクエストエラー:', err.message);
  }
  console.log('');

  // ─────────────────────────────────────────────────────────
  // Step 6: テストアサーション
  // バグが存在する場合、このアサーションは失敗する（それが期待される結果）
  // ─────────────────────────────────────────────────────────
  console.log('【Step 6】テストアサーション（バグ存在確認）...');
  console.log('  期待: images.length > 0 かつ images[0].thumbnailUrl が存在する');
  console.log('  ※ このアサーションは未修正コードでは失敗することが期待される');
  console.log('');

  if (!apiResponse) {
    console.log('  ❌ ASSERTION FAILED: APIレスポンスを取得できませんでした');
    console.log('');
    console.log('='.repeat(60));
    console.log('テスト結果: FAILED（バグの存在を確認）');
    console.log('='.repeat(60));
    console.log('カウンターサンプル:');
    counterExamples.forEach(ex => console.log(`  - ${ex}`));
    testPassed = false;
  } else if (apiResponse.status === 404) {
    // 404の場合もバグ（storage_locationがないため404を返している）
    console.log('  ❌ ASSERTION FAILED: APIが404を返しました（storage_location未設定のため）');
    counterExamples.push(`API response: HTTP ${apiResponse.status} - ${JSON.stringify(apiResponse.body)}`);
    console.log('');
    console.log('='.repeat(60));
    console.log('テスト結果: FAILED（バグの存在を確認）');
    console.log('='.repeat(60));
    console.log('カウンターサンプル:');
    counterExamples.forEach(ex => console.log(`  - ${ex}`));
    testPassed = false;
  } else if (apiResponse.status === 200) {
    const images = apiResponse.body?.images;
    const imagesLength = Array.isArray(images) ? images.length : -1;
    const hasThumbnailUrl = imagesLength > 0 && images[0]?.thumbnailUrl;

    console.log(`  images.length: ${imagesLength}`);
    console.log(`  images[0].thumbnailUrl: ${hasThumbnailUrl ? images[0].thumbnailUrl : 'なし'}`);

    if (imagesLength > 0 && hasThumbnailUrl) {
      // テストが通過した = バグが存在しない（または既に修正済み）
      console.log('  ⚠️  ASSERTION PASSED: images.length > 0 かつ thumbnailUrl が存在する');
      console.log('  → バグが存在しないか、既に修正済みの可能性があります');
      testPassed = true;
    } else {
      // テストが失敗した = バグが存在する（期待される結果）
      console.log('  ❌ ASSERTION FAILED: images が空配列または thumbnailUrl がない');
      counterExamples.push(`API response: images.length = ${imagesLength}, thumbnailUrl = ${hasThumbnailUrl}`);
      console.log('');
      console.log('='.repeat(60));
      console.log('テスト結果: FAILED（バグの存在を確認）');
      console.log('='.repeat(60));
      console.log('カウンターサンプル:');
      counterExamples.forEach(ex => console.log(`  - ${ex}`));
      testPassed = false;
    }
  } else {
    console.log(`  ❌ ASSERTION FAILED: 予期しないHTTPステータス ${apiResponse.status}`);
    counterExamples.push(`API response: HTTP ${apiResponse.status}`);
    testPassed = false;
  }

  console.log('');
  console.log('='.repeat(60));
  console.log(`最終テスト結果: ${testPassed ? 'PASSED（バグなし）' : 'FAILED（バグ確認）'}`);
  console.log('='.repeat(60));

  // バグが存在する場合（テスト失敗）は exit code 1 で終了
  // これがPBTの「失敗 = バグの存在を証明」に対応する
  if (!testPassed) {
    process.exit(1);
  }
}

runBugConditionTest().catch((err) => {
  console.error('予期しないエラー:', err);
  process.exit(1);
});
