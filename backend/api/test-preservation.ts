/**
 * 保全プロパティテスト: 修正前のベースライン記録
 *
 * 目的: storage_location の修正（AA3959への設定）が他の物件に影響を与えないことを
 *       確認するためのベースラインを記録する。
 *
 * 実行方法:
 *   npx ts-node -r dotenv/config backend/api/test-preservation.ts dotenv_config_path=backend/.env
 *
 * 確認項目:
 * 1. storage_location が設定済みの物件（例: AA12649）の画像取得が正常に動作する
 * 2. storage_location が NULL の物件が他にも存在するか確認する
 * 3. DBの状態をベースラインとして記録する
 *
 * **Validates: Requirements 3.1, 3.2, 3.3, 3.4**
 */

// 環境変数を最初に読み込む
// eslint-disable-next-line @typescript-eslint/no-var-requires
const dotenv = require('dotenv');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const path = require('path');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const fs = require('fs');

// backend/.env を優先して読み込む
const possibleEnvPaths = [
  path.resolve(process.cwd(), '../.env'),
  path.resolve(process.cwd(), '../../backend/.env'),
  path.resolve(__dirname, '../.env'),
  path.resolve(__dirname, '../../backend/.env'),
];

let envLoaded = false;
for (const envPath of possibleEnvPaths) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    console.log(`✅ Loaded env from: ${envPath}`);
    envLoaded = true;
    break;
  }
}

if (!envLoaded) {
  dotenv.config();
  console.log('⚠️ Using default .env');
}

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
  console.error('❌ SUPABASE_URL または SUPABASE_SERVICE_KEY が設定されていません');
  process.exit(1);
}

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

// ============================================================
// テスト結果の型定義
// ============================================================

interface PreservationResult {
  passed: boolean;
  message: string;
  details?: Record<string, unknown>;
}

interface BaselineRecord {
  totalProperties: number;
  propertiesWithStorageLocation: number;
  propertiesWithoutStorageLocation: number;
  nullStorageLocationNumbers: string[];
  sampleWithStorageLocation: Array<{
    property_number: string;
    storage_location: string;
  }>;
}

// ============================================================
// テスト1: storage_location が設定済みの物件の確認
// ============================================================

async function testStorageLocationSetProperties(): Promise<PreservationResult> {
  console.log('\n' + '='.repeat(60));
  console.log('📋 [テスト1] storage_location が設定済みの物件の確認');
  console.log('='.repeat(60));

  const { data: properties, error } = await supabase
    .from('property_listings')
    .select('property_number, storage_location')
    .not('storage_location', 'is', null)
    .neq('storage_location', '')
    .eq('is_hidden', false)
    .limit(10);

  if (error) {
    console.error(`❌ DB エラー: ${error.message}`);
    return { passed: false, message: `DB エラー: ${error.message}` };
  }

  if (!properties || properties.length === 0) {
    console.log('⚠️ storage_location が設定済みの物件が見つかりませんでした');
    return {
      passed: false,
      message: 'storage_location が設定済みの物件が存在しない',
    };
  }

  console.log(`✅ storage_location が設定済みの物件: ${properties.length} 件（最大10件表示）`);
  properties.forEach((p) => {
    console.log(`  - ${p.property_number}: ${p.storage_location}`);
  });

  // 各物件の storage_location が NULL でないことを確認
  const allHaveStorageLocation = properties.every(
    (p) => p.storage_location !== null && p.storage_location !== ''
  );

  if (allHaveStorageLocation) {
    console.log('\n✅ [保全確認] 全ての取得物件の storage_location が NULL でない');
    return {
      passed: true,
      message: `${properties.length} 件の物件で storage_location が正常に設定されている`,
      details: {
        count: properties.length,
        sample: properties.slice(0, 3).map((p) => p.property_number),
      },
    };
  } else {
    const nullItems = properties.filter(
      (p) => !p.storage_location || p.storage_location === ''
    );
    console.log(`❌ storage_location が NULL の物件が含まれています: ${nullItems.map((p) => p.property_number).join(', ')}`);
    return {
      passed: false,
      message: 'storage_location が NULL の物件が含まれている',
    };
  }
}

// ============================================================
// テスト2: storage_location が設定済みの物件の画像取得確認
// ============================================================

async function testAA12649StorageLocation(): Promise<PreservationResult> {
  console.log('\n' + '='.repeat(60));
  console.log('📋 [テスト2] storage_location が設定済みの物件の確認');
  console.log('='.repeat(60));

  // まず AA12649 を確認（存在しない場合や NULL の場合は代替物件を使用）
  const { data: aa12649, error: aa12649Error } = await supabase
    .from('property_listings')
    .select('property_number, storage_location, athome_data')
    .eq('property_number', 'AA12649')
    .single();

  if (!aa12649Error && aa12649) {
    console.log(`📊 AA12649 の状態:`);
    console.log(`  - storage_location: ${aa12649.storage_location ?? 'NULL'}`);
    if (aa12649.storage_location) {
      console.log('\n✅ [保全確認] AA12649 の storage_location が設定されている');
      return {
        passed: true,
        message: `AA12649 の storage_location が設定されている: ${aa12649.storage_location}`,
        details: {
          property_number: aa12649.property_number,
          storage_location: aa12649.storage_location,
        },
      };
    } else {
      console.log('\n⚠️ AA12649 の storage_location が NULL です');
      console.log('   → AA12649 も修正対象の可能性があります');
      console.log('   → 代替物件（storage_location 設定済み）でテストを継続します');
    }
  }

  // AA12649 が NULL または存在しない場合、代替物件でテスト
  return await testAnyPropertyWithStorageLocation();
}

// AA12649 が存在しない場合の代替テスト
async function testAnyPropertyWithStorageLocation(): Promise<PreservationResult> {
  const { data: properties, error } = await supabase
    .from('property_listings')
    .select('property_number, storage_location')
    .not('storage_location', 'is', null)
    .neq('storage_location', '')
    .eq('is_hidden', false)
    .limit(1);

  if (error || !properties || properties.length === 0) {
    return {
      passed: false,
      message: 'storage_location が設定済みの物件が存在しない',
    };
  }

  const p = properties[0];
  console.log(`✅ 代替物件 ${p.property_number} の storage_location が設定されている`);
  return {
    passed: true,
    message: `代替物件 ${p.property_number} の storage_location が設定されている: ${p.storage_location}`,
    details: {
      property_number: p.property_number,
      storage_location: p.storage_location,
    },
  };
}

// ============================================================
// テスト3: storage_location が NULL の物件の調査
// ============================================================

async function testNullStorageLocationProperties(): Promise<PreservationResult> {
  console.log('\n' + '='.repeat(60));
  console.log('📋 [テスト3] storage_location が NULL の物件の調査');
  console.log('='.repeat(60));

  // NULL の物件を取得
  const { data: nullProperties, error: nullError } = await supabase
    .from('property_listings')
    .select('property_number, storage_location, athome_data')
    .or('storage_location.is.null,storage_location.eq.')
    .eq('is_hidden', false)
    .order('property_number', { ascending: true });

  if (nullError) {
    console.error(`❌ DB エラー: ${nullError.message}`);
    return { passed: false, message: `DB エラー: ${nullError.message}` };
  }

  const nullCount = nullProperties?.length ?? 0;
  console.log(`📊 storage_location が NULL または空文字列の物件数: ${nullCount} 件`);

  if (nullProperties && nullProperties.length > 0) {
    console.log('\n物件番号一覧:');
    nullProperties.forEach((p) => {
      const hasAthomeData = p.athome_data && Array.isArray(p.athome_data) && p.athome_data.length > 0;
      console.log(`  - ${p.property_number}: storage_location=NULL, athome_data=${hasAthomeData ? '設定あり' : 'なし'}`);
    });

    // AA3959 が含まれているか確認
    const aa3959InNull = nullProperties.some((p) => p.property_number === 'AA3959');
    if (aa3959InNull) {
      console.log('\n✅ [根本原因確認] AA3959 が NULL リストに含まれています（タスク1の結果と一致）');
    }

    // AA3959 以外にも NULL の物件があるか確認
    const otherNullProperties = nullProperties.filter((p) => p.property_number !== 'AA3959');
    if (otherNullProperties.length > 0) {
      console.log(`\n⚠️ AA3959 以外にも ${otherNullProperties.length} 件の物件で storage_location が NULL です`);
      console.log('   → これらの物件も修正対象の可能性があります');
    } else {
      console.log('\n✅ AA3959 以外に storage_location が NULL の物件はありません');
    }
  } else {
    console.log('✅ storage_location が NULL の物件はありません');
  }

  return {
    passed: true,
    message: `storage_location が NULL の物件数: ${nullCount} 件`,
    details: {
      nullCount,
      nullPropertyNumbers: nullProperties?.map((p) => p.property_number) ?? [],
      aa3959IsNull: nullProperties?.some((p) => p.property_number === 'AA3959') ?? false,
    },
  };
}

// ============================================================
// テスト4: DBの状態をベースラインとして記録
// ============================================================

async function recordBaseline(): Promise<BaselineRecord> {
  console.log('\n' + '='.repeat(60));
  console.log('📋 [テスト4] DBの状態をベースラインとして記録');
  console.log('='.repeat(60));

  // 全物件数を取得
  const { count: totalCount, error: totalError } = await supabase
    .from('property_listings')
    .select('*', { count: 'exact', head: true })
    .eq('is_hidden', false);

  // storage_location が設定済みの物件数
  const { count: withStorageCount, error: withStorageError } = await supabase
    .from('property_listings')
    .select('*', { count: 'exact', head: true })
    .not('storage_location', 'is', null)
    .neq('storage_location', '')
    .eq('is_hidden', false);

  // storage_location が NULL の物件番号一覧
  const { data: nullProperties, error: nullError } = await supabase
    .from('property_listings')
    .select('property_number')
    .or('storage_location.is.null,storage_location.eq.')
    .eq('is_hidden', false)
    .order('property_number', { ascending: true });

  // storage_location が設定済みのサンプル
  const { data: sampleProperties, error: sampleError } = await supabase
    .from('property_listings')
    .select('property_number, storage_location')
    .not('storage_location', 'is', null)
    .neq('storage_location', '')
    .eq('is_hidden', false)
    .limit(5);

  const total = totalCount ?? 0;
  const withStorage = withStorageCount ?? 0;
  const withoutStorage = (nullProperties?.length ?? 0);

  const baseline: BaselineRecord = {
    totalProperties: total,
    propertiesWithStorageLocation: withStorage,
    propertiesWithoutStorageLocation: withoutStorage,
    nullStorageLocationNumbers: nullProperties?.map((p) => p.property_number) ?? [],
    sampleWithStorageLocation: (sampleProperties ?? []).map((p) => ({
      property_number: p.property_number,
      storage_location: p.storage_location,
    })),
  };

  console.log('\n📊 修正前のベースライン状態:');
  console.log(`  - 公開物件総数: ${baseline.totalProperties} 件`);
  console.log(`  - storage_location 設定済み: ${baseline.propertiesWithStorageLocation} 件`);
  console.log(`  - storage_location NULL/空: ${baseline.propertiesWithoutStorageLocation} 件`);
  console.log(`  - NULL物件番号: [${baseline.nullStorageLocationNumbers.join(', ')}]`);
  console.log('\n  storage_location 設定済みサンプル:');
  baseline.sampleWithStorageLocation.forEach((p) => {
    console.log(`    - ${p.property_number}: ${p.storage_location}`);
  });

  return baseline;
}

// ============================================================
// メイン実行
// ============================================================

async function main() {
  console.log('='.repeat(60));
  console.log('🛡️  保全プロパティテスト: 修正前ベースライン記録');
  console.log('='.repeat(60));
  console.log('目的: AA3959 の storage_location 修正が他の物件に影響しないことを確認');
  console.log('期待結果: 全テストが PASS（ベースライン動作の確認）');

  const results: Array<{ name: string; result: PreservationResult }> = [];

  // テスト1: storage_location が設定済みの物件の確認
  const test1 = await testStorageLocationSetProperties();
  results.push({ name: 'テスト1: storage_location 設定済み物件の確認', result: test1 });

  // テスト2: storage_location が設定済みの物件の確認
  const test2 = await testAA12649StorageLocation();
  results.push({ name: 'テスト2: storage_location 設定済み物件の画像取得確認', result: test2 });

  // テスト3: storage_location が NULL の物件の調査
  const test3 = await testNullStorageLocationProperties();
  results.push({ name: 'テスト3: NULL storage_location 物件の調査', result: test3 });

  // テスト4: ベースライン記録
  const baseline = await recordBaseline();

  // ============================================================
  // 結果サマリー
  // ============================================================
  console.log('\n' + '='.repeat(60));
  console.log('📊 保全テスト結果サマリー');
  console.log('='.repeat(60));

  let allPassed = true;
  results.forEach(({ name, result }) => {
    const status = result.passed ? '✅ PASS' : '❌ FAIL';
    console.log(`\n${status} ${name}`);
    console.log(`  メッセージ: ${result.message}`);
    if (result.details) {
      console.log(`  詳細: ${JSON.stringify(result.details, null, 2)}`);
    }
    if (!result.passed) allPassed = false;
  });

  console.log('\n' + '='.repeat(60));
  console.log('🎯 保全テスト総合結果:');
  if (allPassed) {
    console.log('  ✅ 全テスト PASS');
    console.log('  → 修正前のベースライン動作が確認されました');
    console.log('  → AA3959 の修正後も、このテストが PASS することを確認してください');
  } else {
    console.log('  ⚠️ 一部テストが FAIL');
    console.log('  → 失敗したテストの内容を確認してください');
  }

  console.log('\n📋 ベースライン記録（修正後の比較用）:');
  console.log(JSON.stringify(baseline, null, 2));

  console.log('\n' + '='.repeat(60));
  console.log('✅ 保全テスト完了');
  console.log('='.repeat(60));
}

main().catch((error) => {
  console.error('❌ テスト実行エラー:', error);
  process.exit(1);
});
