/**
 * AA3959 画像取得バグ 探索的テストスクリプト
 * 
 * 目的: バグの根本原因を特定する
 * 実行方法: npx ts-node -r dotenv/config backend/api/test-aa3959-images.ts dotenv_config_path=backend/.env
 * 
 * 確認項目:
 * 1. DBの property_listings テーブルで AA3959 の storage_location が NULL または空文字列か
 * 2. searchFolderByName('AA3959') が共有ドライブで null を返すか
 * 3. findFolderByName(folderId, 'athome公開') が null を返すか
 */

// 環境変数を最初に読み込む（他のモジュールより先に実行する必要がある）
// eslint-disable-next-line @typescript-eslint/no-var-requires
const dotenv = require('dotenv');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const path = require('path');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const fs = require('fs');

// backend/.env を優先して読み込む（backend/api/.env は存在しないため）
const possibleEnvPaths = [
  path.resolve(process.cwd(), '../.env'),       // backend/.env (cwd=backend/api から)
  path.resolve(process.cwd(), '../../backend/.env'), // ルートから実行した場合
  path.resolve(__dirname, '../.env'),            // backend/.env (__dirname=backend/api から)
  path.resolve(__dirname, '../../backend/.env'), // ルートから実行した場合
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

// 環境変数が設定されていることを確認してからモジュールをインポート
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
  console.error('❌ SUPABASE_URL または SUPABASE_SERVICE_KEY が設定されていません');
  console.error('  SUPABASE_URL:', process.env.SUPABASE_URL ? '設定済み' : '未設定');
  console.error('  SUPABASE_SERVICE_KEY:', process.env.SUPABASE_SERVICE_KEY ? '設定済み' : '未設定');
  console.error('  試したパス:', possibleEnvPaths);
  process.exit(1);
}

import { createClient } from '@supabase/supabase-js';
import { GoogleDriveService } from './src/services/GoogleDriveService';

const PROPERTY_NUMBER = 'AA3959';

async function main() {
  console.log('='.repeat(60));
  console.log(`🔍 AA3959 画像取得バグ 探索的テスト`);
  console.log('='.repeat(60));

  // ===== 確認項目1: DBの storage_location を確認 =====
  console.log('\n📋 [確認1] DBの storage_location を確認...');
  
  const supabaseUrl = process.env.SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ SUPABASE_URL または SUPABASE_SERVICE_KEY が設定されていません');
    process.exit(1);
  }
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  const { data: property, error: dbError } = await supabase
    .from('property_listings')
    .select('property_number, storage_location, athome_data, id')
    .eq('property_number', PROPERTY_NUMBER)
    .single();
  
  if (dbError) {
    console.error(`❌ DB エラー: ${dbError.message}`);
    console.error('  詳細:', dbError);
  } else if (!property) {
    console.error(`❌ 物件 ${PROPERTY_NUMBER} がDBに存在しません`);
  } else {
    console.log(`✅ 物件 ${PROPERTY_NUMBER} が見つかりました`);
    console.log(`  - id: ${property.id}`);
    console.log(`  - storage_location: ${property.storage_location ?? 'NULL'}`);
    console.log(`  - athome_data: ${JSON.stringify(property.athome_data)}`);
    
    if (!property.storage_location) {
      console.log('\n🚨 [根本原因1 確定] storage_location が NULL または空文字列です！');
      console.log('   → getImagesFromStorageUrl(null) は即座に空配列を返します');
    } else {
      console.log(`\n✅ storage_location が設定されています: ${property.storage_location}`);
    }
  }

  // ===== 確認項目2: searchFolderByName の動作確認 =====
  console.log('\n📋 [確認2] searchFolderByName("AA3959") の動作確認...');
  
  let driveService: GoogleDriveService;
  try {
    driveService = new GoogleDriveService();
    console.log('✅ GoogleDriveService 初期化成功');
  } catch (initError: any) {
    console.error(`❌ GoogleDriveService 初期化失敗: ${initError.message}`);
    console.log('\n📊 テスト結果サマリー:');
    console.log('  - GoogleDriveService の初期化に失敗したため、Drive API テストをスキップ');
    summarizeResults(property, null, null);
    return;
  }
  
  let searchResult: string | null = null;
  try {
    console.log(`  GOOGLE_DRIVE_PARENT_FOLDER_ID: ${process.env.GOOGLE_DRIVE_PARENT_FOLDER_ID || '未設定'}`);
    searchResult = await driveService.searchFolderByName(PROPERTY_NUMBER);
    
    if (searchResult) {
      console.log(`✅ searchFolderByName('${PROPERTY_NUMBER}') → フォルダID: ${searchResult}`);
    } else {
      console.log(`🚨 [根本原因3 候補] searchFolderByName('${PROPERTY_NUMBER}') → null`);
      console.log('   → 共有ドライブで AA3959 フォルダが見つかりません');
    }
  } catch (searchError: any) {
    console.error(`❌ searchFolderByName エラー: ${searchError.message}`);
    searchResult = null;
  }

  // ===== 確認項目3: findFolderByName の動作確認 =====
  console.log('\n📋 [確認3] findFolderByName(folderId, "athome公開") の動作確認...');
  
  // storage_location からフォルダIDを取得するか、searchFolderByName の結果を使用
  let parentFolderIdForTest: string | null = null;
  
  if (property?.storage_location) {
    // storage_location からフォルダIDを抽出
    const match = property.storage_location.match(/\/folders\/([a-zA-Z0-9_-]+)/);
    parentFolderIdForTest = match ? match[1] : null;
    console.log(`  storage_location からフォルダID抽出: ${parentFolderIdForTest}`);
  } else if (searchResult) {
    parentFolderIdForTest = searchResult;
    console.log(`  searchFolderByName の結果を使用: ${parentFolderIdForTest}`);
  }
  
  let findResult: string | null = null;
  if (parentFolderIdForTest) {
    try {
      findResult = await driveService.findFolderByName(parentFolderIdForTest, 'athome公開');
      
      if (findResult) {
        console.log(`✅ findFolderByName('${parentFolderIdForTest}', 'athome公開') → フォルダID: ${findResult}`);
      } else {
        console.log(`🚨 [根本原因2 候補] findFolderByName('${parentFolderIdForTest}', 'athome公開') → null`);
        console.log('   → athome公開 フォルダが見つかりません（共有ドライブパラメータの問題の可能性）');
        
        // isSharedDrive=false でも試してみる
        console.log('\n  🔄 isSharedDrive=false で再試行...');
        try {
          const findResultNoShared = await driveService.findFolderByName(parentFolderIdForTest, 'athome公開', false);
          if (findResultNoShared) {
            console.log(`  ✅ isSharedDrive=false では見つかりました: ${findResultNoShared}`);
            console.log('  → 共有ドライブパラメータ（driveId指定）が問題の可能性が高い');
          } else {
            console.log('  ❌ isSharedDrive=false でも見つかりませんでした');
          }
        } catch (e: any) {
          console.log(`  ❌ isSharedDrive=false でのエラー: ${e.message}`);
        }
      }
    } catch (findError: any) {
      console.error(`❌ findFolderByName エラー: ${findError.message}`);
    }
  } else {
    console.log('  ⚠️ 親フォルダIDが取得できなかったため、findFolderByName テストをスキップ');
  }

  // ===== 結果サマリー =====
  summarizeResults(property, searchResult, findResult);
}

function summarizeResults(
  property: any,
  searchResult: string | null,
  findResult: string | null
) {
  console.log('\n' + '='.repeat(60));
  console.log('📊 テスト結果サマリー');
  console.log('='.repeat(60));
  
  const storageLocation = property?.storage_location;
  
  console.log('\n確認項目1: storage_location');
  if (!storageLocation) {
    console.log('  ❌ NULL または空文字列 → 根本原因1 確定');
    console.log('     修正方法: DBに storage_location を設定するか、');
    console.log('     エンドポイントで getImageFolderUrl を呼び出して自動設定する');
  } else {
    console.log(`  ✅ 設定済み: ${storageLocation}`);
  }
  
  console.log('\n確認項目2: searchFolderByName("AA3959")');
  if (searchResult === null) {
    console.log('  ❌ null を返した → 根本原因3 候補');
    console.log('     修正方法: corpora を allDrives から drive に変更するか、');
    console.log('     driveId を指定して特定の共有ドライブを検索する');
  } else if (searchResult === undefined) {
    console.log('  ⚠️ テスト未実行（GoogleDriveService 初期化失敗）');
  } else {
    console.log(`  ✅ フォルダID取得成功: ${searchResult}`);
  }
  
  console.log('\n確認項目3: findFolderByName(folderId, "athome公開")');
  if (findResult === null) {
    console.log('  ❌ null を返した → 根本原因2 候補');
    console.log('     修正方法: driveId 指定を削除して corpora: allDrives に変更する');
  } else if (findResult === undefined) {
    console.log('  ⚠️ テスト未実行（親フォルダIDが取得できなかった）');
  } else {
    console.log(`  ✅ athome公開 フォルダID取得成功: ${findResult}`);
  }
  
  console.log('\n🎯 バグ条件の確認:');
  const isBugCondition = !storageLocation || searchResult === null || findResult === null;
  if (isBugCondition) {
    console.log('  ✅ バグ条件が確認されました（images.length === 0 が期待される）');
    console.log('  → このテストは FAIL することでバグの存在を証明します');
  } else {
    console.log('  ❌ バグ条件が確認できませんでした（予期しない PASS）');
  }
  
  console.log('\n' + '='.repeat(60));
}

main().catch((error) => {
  console.error('❌ テスト実行エラー:', error);
  process.exit(1);
});
