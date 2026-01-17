/**
 * "athome公開"フォルダを持つ物件の診断スクリプト
 * 
 * 目的:
 * - "athome公開"フォルダを持つ複数の物件を調査
 * - フォルダ名のバリエーション（全角/半角、スペースなど）を確認
 * - 画像取得が失敗する原因を特定
 */

import { createClient } from '@supabase/supabase-js';
import { PropertyImageService } from './src/services/PropertyImageService';
import { GoogleDriveService } from './src/services/GoogleDriveService';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface DiagnosticResult {
  propertyNumber: string;
  storageUrl: string | null;
  parentFolderId: string | null;
  subfolders: Array<{
    id: string;
    name: string;
    nameBytes: string;
    isAthomePublic: boolean;
    isAtbbPublic: boolean;
  }>;
  imagesFound: number;
  error?: string;
}

async function extractFolderIdFromUrl(url: string): Promise<string | null> {
  if (!url) return null;
  const folderIdRegex = /\/folders\/([a-zA-Z0-9_-]+)/;
  const match = url.match(folderIdRegex);
  return match ? match[1] : null;
}

async function diagnoseProperty(propertyNumber: string): Promise<DiagnosticResult> {
  const result: DiagnosticResult = {
    propertyNumber,
    storageUrl: null,
    parentFolderId: null,
    subfolders: [],
    imagesFound: 0,
  };

  try {
    // 1. 物件のstorage_urlを取得
    const { data: property, error: propertyError } = await supabase
      .from('property_listings')
      .select('storage_location')
      .eq('property_number', propertyNumber)
      .single();

    if (propertyError || !property) {
      result.error = `物件が見つかりません: ${propertyError?.message}`;
      return result;
    }

    result.storageUrl = property.storage_location;
    
    if (!result.storageUrl) {
      result.error = 'storage_locationが設定されていません';
      return result;
    }

    // 2. フォルダIDを抽出
    result.parentFolderId = await extractFolderIdFromUrl(result.storageUrl);
    
    if (!result.parentFolderId) {
      result.error = 'フォルダIDの抽出に失敗';
      return result;
    }

    // 3. Google Driveでサブフォルダを検索
    const driveService = new GoogleDriveService();
    const drive = await (driveService as any).getDriveClient();
    
    console.log(`\n🔍 物件 ${propertyNumber} のサブフォルダを検索中...`);
    console.log(`   親フォルダID: ${result.parentFolderId}`);
    
    const response = await drive.files.list({
      q: `'${result.parentFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
      fields: 'files(id, name)',
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });

    const folders = response.data.files || [];
    console.log(`   見つかったサブフォルダ数: ${folders.length}`);

    // 4. 各サブフォルダの詳細を記録
    for (const folder of folders) {
      const name = folder.name || '';
      const nameBytes = Buffer.from(name).toString('hex');
      
      // フォルダ名のバリエーションをチェック
      const isAthomePublic = 
        name === 'athome公開' ||
        name === 'athome 公開' ||
        name === 'athome　公開' ||
        name.toLowerCase().includes('athome') && name.includes('公開');
      
      const isAtbbPublic = 
        name === 'atbb公開' ||
        name === 'atbb 公開' ||
        name === 'atbb　公開' ||
        name.toLowerCase().includes('atbb') && name.includes('公開');

      result.subfolders.push({
        id: folder.id!,
        name,
        nameBytes,
        isAthomePublic,
        isAtbbPublic,
      });

      console.log(`   📁 ${name}`);
      console.log(`      ID: ${folder.id}`);
      console.log(`      バイト列: ${nameBytes}`);
      console.log(`      athome公開判定: ${isAthomePublic}`);
      console.log(`      atbb公開判定: ${isAtbbPublic}`);
    }

    // 5. PropertyImageServiceで画像を取得してみる
    const imageService = new PropertyImageService();
    const imagesResult = await imageService.getImagesFromStorageUrl(result.storageUrl);
    result.imagesFound = imagesResult.images.length;
    
    console.log(`   📸 取得された画像数: ${result.imagesFound}`);
    console.log(`   📂 使用されたフォルダID: ${imagesResult.folderId}`);

  } catch (error: any) {
    result.error = error.message;
    console.error(`   ❌ エラー: ${error.message}`);
  }

  return result;
}

async function main() {
  console.log('='.repeat(80));
  console.log('🔍 "athome公開"フォルダ診断スクリプト');
  console.log('='.repeat(80));

  // テスト対象の物件番号
  // AA13129は動作確認済みなので、他の物件を調査
  const propertyNumbers = [
    'AA13129', // 動作確認済み（ベースライン）
    // 他の物件番号をここに追加してください
    // 例: 'AA12345', 'AA67890'
  ];

  // ユーザーに物件番号の入力を促す
  console.log('\n📋 調査対象の物件番号を入力してください（カンマ区切り）:');
  console.log('   例: AA13129,AA12345,AA67890');
  console.log('   または、Enterキーを押してAA13129のみを調査');
  
  const results: DiagnosticResult[] = [];

  for (const propertyNumber of propertyNumbers) {
    const result = await diagnoseProperty(propertyNumber);
    results.push(result);
  }

  // 結果のサマリーを表示
  console.log('\n' + '='.repeat(80));
  console.log('📊 診断結果サマリー');
  console.log('='.repeat(80));

  for (const result of results) {
    console.log(`\n物件番号: ${result.propertyNumber}`);
    console.log(`  storage_url: ${result.storageUrl || 'なし'}`);
    console.log(`  親フォルダID: ${result.parentFolderId || 'なし'}`);
    console.log(`  サブフォルダ数: ${result.subfolders.length}`);
    
    if (result.subfolders.length > 0) {
      console.log(`  サブフォルダ一覧:`);
      for (const folder of result.subfolders) {
        console.log(`    - ${folder.name}`);
        console.log(`      athome公開: ${folder.isAthomePublic ? '✅' : '❌'}`);
        console.log(`      atbb公開: ${folder.isAtbbPublic ? '✅' : '❌'}`);
      }
    }
    
    console.log(`  取得された画像数: ${result.imagesFound}`);
    
    if (result.error) {
      console.log(`  ⚠️ エラー: ${result.error}`);
    }
  }

  // フォルダ名のバリエーションを分析
  console.log('\n' + '='.repeat(80));
  console.log('📝 フォルダ名のバリエーション分析');
  console.log('='.repeat(80));

  const athomeFolders = results.flatMap(r => 
    r.subfolders.filter(f => f.name.includes('athome') || f.name.includes('公開'))
  );

  if (athomeFolders.length > 0) {
    console.log('\n見つかった"athome"または"公開"を含むフォルダ:');
    for (const folder of athomeFolders) {
      console.log(`  - "${folder.name}"`);
      console.log(`    バイト列: ${folder.nameBytes}`);
      console.log(`    判定結果: ${folder.isAthomePublic ? '✅ athome公開' : '❌ 不一致'}`);
    }
  } else {
    console.log('\n"athome"または"公開"を含むフォルダは見つかりませんでした');
  }

  // 推奨事項
  console.log('\n' + '='.repeat(80));
  console.log('💡 推奨事項');
  console.log('='.repeat(80));

  const hasVariations = athomeFolders.some(f => !f.isAthomePublic && f.name.includes('athome'));
  
  if (hasVariations) {
    console.log('\n⚠️ フォルダ名にバリエーションが見つかりました');
    console.log('   以下の対応を検討してください:');
    console.log('   1. findFolderByName()メソッドを柔軟な検索に変更');
    console.log('   2. 正規表現を使用した部分一致検索');
    console.log('   3. 全角/半角スペースを無視する処理');
  } else {
    console.log('\n✅ フォルダ名は統一されています');
    console.log('   他の原因を調査する必要があります:');
    console.log('   1. フォルダのアクセス権限');
    console.log('   2. Google Drive APIのクエリ');
    console.log('   3. キャッシュの問題');
  }

  console.log('\n' + '='.repeat(80));
  console.log('✅ 診断完了');
  console.log('='.repeat(80));
}

main().catch(console.error);
