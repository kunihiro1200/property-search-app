/**
 * "athome公開"フォルダのバリエーション診断スクリプト
 * 
 * 目的:
 * - "athome公開"フォルダを持つ物件を検索
 * - フォルダ名のバリエーション（スペース、大文字小文字、エンコーディング）を調査
 * - なぜAA13129は動作するのに他の物件は動作しないのかを特定
 */

import { createClient } from '@supabase/supabase-js';
import { GoogleDriveService } from './src/services/GoogleDriveService';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface FolderVariation {
  propertyNumber: string;
  storageLocation: string;
  parentFolderId: string;
  subfolders: Array<{
    id: string;
    name: string;
    nameBytes: string;
    nameLength: number;
    hasFullWidthSpace: boolean;
    hasHalfWidthSpace: boolean;
    startsWithAthome: boolean;
    exactMatch: boolean;
  }>;
}

/**
 * フォルダIDをURLから抽出、またはフォルダIDをそのまま返す
 */
function extractFolderIdFromUrl(url: string): string | null {
  if (!url) return null;
  
  // URLの場合はフォルダIDを抽出
  const folderIdRegex = /\/folders\/([a-zA-Z0-9_-]+)/;
  const match = url.match(folderIdRegex);
  if (match && match[1]) {
    return match[1];
  }
  
  // フォルダIDの形式（英数字、ハイフン、アンダースコアのみ）の場合はそのまま返す
  if (/^[a-zA-Z0-9_-]+$/.test(url)) {
    return url;
  }
  
  return null;
}

/**
 * 文字列のバイト表現を取得（エンコーディング診断用）
 */
function getByteRepresentation(str: string): string {
  const bytes = Buffer.from(str, 'utf8');
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join(' ');
}

/**
 * フォルダ名を分析
 */
function analyzeFolderName(name: string) {
  return {
    name,
    nameBytes: getByteRepresentation(name),
    nameLength: name.length,
    hasFullWidthSpace: name.includes('　'), // 全角スペース
    hasHalfWidthSpace: name.includes(' '),  // 半角スペース
    startsWithAthome: name.toLowerCase().startsWith('athome'),
    exactMatch: name === 'athome公開',
  };
}

async function main() {
  console.log('🔍 "athome公開"フォルダのバリエーション診断を開始します...\n');

  const driveService = new GoogleDriveService();
  const variations: FolderVariation[] = [];

  try {
    // 1. storage_locationが設定されており、URL形式の物件を取得（最大50件）
    console.log('📋 Step 1: storage_locationがURL形式で設定されている物件を取得中...');
    const { data: properties, error } = await supabase
      .from('property_listings')
      .select('property_number, storage_location')
      .not('storage_location', 'is', null)
      .like('storage_location', 'https://drive.google.com%')
      .limit(50);

    if (error) {
      console.error('❌ エラー:', error.message);
      return;
    }

    if (!properties || properties.length === 0) {
      console.log('⚠️ storage_locationがURL形式で設定されている物件が見つかりませんでした');
      return;
    }

    console.log(`✅ ${properties.length}件の物件を取得しました\n`);

    // 2. 各物件のフォルダ内を調査
    console.log('📂 Step 2: 各物件のフォルダ内のサブフォルダを調査中...\n');

    for (const property of properties) {
      const folderId = extractFolderIdFromUrl(property.storage_location);
      if (!folderId) {
        console.log(`⚠️ ${property.property_number}: フォルダIDの抽出に失敗`);
        continue;
      }

      try {
        // フォルダ内のサブフォルダを取得
        const { files } = await driveService.listFolderContents(folderId);
        const subfolders = files.filter(f => f.isFolder);

        if (subfolders.length === 0) {
          continue; // サブフォルダがない場合はスキップ
        }

        // "athome"を含むフォルダを探す
        const athomeFolders = subfolders.filter(f => 
          f.name.toLowerCase().includes('athome') || 
          f.name.includes('公開')
        );

        if (athomeFolders.length > 0) {
          console.log(`\n🎯 ${property.property_number}: "athome"関連フォルダを発見！`);
          console.log(`   親フォルダID: ${folderId}`);
          console.log(`   サブフォルダ数: ${subfolders.length}`);
          console.log(`   "athome"関連フォルダ数: ${athomeFolders.length}`);

          const analyzedFolders = athomeFolders.map(f => ({
            id: f.id,
            ...analyzeFolderName(f.name),
          }));

          variations.push({
            propertyNumber: property.property_number,
            storageLocation: property.storage_location,
            parentFolderId: folderId,
            subfolders: analyzedFolders,
          });

          // 詳細を表示
          analyzedFolders.forEach((folder, index) => {
            console.log(`\n   フォルダ ${index + 1}:`);
            console.log(`   - 名前: "${folder.name}"`);
            console.log(`   - ID: ${folder.id}`);
            console.log(`   - バイト表現: ${folder.nameBytes}`);
            console.log(`   - 文字数: ${folder.nameLength}`);
            console.log(`   - 全角スペース: ${folder.hasFullWidthSpace ? 'あり' : 'なし'}`);
            console.log(`   - 半角スペース: ${folder.hasHalfWidthSpace ? 'あり' : 'なし'}`);
            console.log(`   - "athome"で始まる: ${folder.startsWithAthome ? 'はい' : 'いいえ'}`);
            console.log(`   - 完全一致: ${folder.exactMatch ? 'はい' : 'いいえ'}`);
          });
        }
      } catch (error: any) {
        console.log(`⚠️ ${property.property_number}: フォルダアクセスエラー - ${error.message}`);
      }
    }

    // 3. サマリーを表示
    console.log('\n\n' + '='.repeat(80));
    console.log('📊 診断結果サマリー');
    console.log('='.repeat(80) + '\n');

    if (variations.length === 0) {
      console.log('⚠️ "athome"関連フォルダを持つ物件は見つかりませんでした');
      console.log('\n💡 推奨アクション:');
      console.log('   1. より多くの物件を調査（limitを増やす）');
      console.log('   2. 手動で"athome公開"フォルダを持つ物件番号を確認');
      return;
    }

    console.log(`✅ ${variations.length}件の物件で"athome"関連フォルダを発見\n`);

    // フォルダ名のバリエーションを集計
    const nameVariations = new Map<string, number>();
    variations.forEach(v => {
      v.subfolders.forEach(f => {
        const count = nameVariations.get(f.name) || 0;
        nameVariations.set(f.name, count + 1);
      });
    });

    console.log('📋 フォルダ名のバリエーション:');
    nameVariations.forEach((count, name) => {
      console.log(`   "${name}": ${count}件`);
    });

    // 完全一致するフォルダの数
    const exactMatches = variations.filter(v => 
      v.subfolders.some(f => f.exactMatch)
    ).length;

    console.log(`\n✅ "athome公開"と完全一致: ${exactMatches}件`);
    console.log(`⚠️ 完全一致しない: ${variations.length - exactMatches}件`);

    // スペースのバリエーション
    const fullWidthSpace = variations.filter(v => 
      v.subfolders.some(f => f.hasFullWidthSpace)
    ).length;
    const halfWidthSpace = variations.filter(v => 
      v.subfolders.some(f => f.hasHalfWidthSpace)
    ).length;

    console.log(`\n📏 スペースのバリエーション:`);
    console.log(`   全角スペース: ${fullWidthSpace}件`);
    console.log(`   半角スペース: ${halfWidthSpace}件`);

    // 4. 推奨される修正方法を提案
    console.log('\n\n' + '='.repeat(80));
    console.log('💡 推奨される修正方法');
    console.log('='.repeat(80) + '\n');

    if (exactMatches === variations.length) {
      console.log('✅ すべてのフォルダが"athome公開"と完全一致しています');
      console.log('   → 現在の実装で問題ありません');
    } else {
      console.log('⚠️ フォルダ名にバリエーションがあります\n');
      console.log('推奨される対応:');
      console.log('1. GoogleDriveService.findFolderByName()を改善');
      console.log('   - スペースの正規化（全角・半角を統一）');
      console.log('   - 大文字小文字を無視');
      console.log('   - 部分一致検索の改善');
      console.log('\n2. または、フォルダ名を統一');
      console.log('   - すべて"athome公開"に統一');
      console.log('   - スペースは使用しない');
    }

    // 5. 詳細レポートをファイルに保存
    const report = {
      timestamp: new Date().toISOString(),
      totalPropertiesChecked: properties.length,
      propertiesWithAthomeFolders: variations.length,
      variations: variations.map(v => ({
        propertyNumber: v.propertyNumber,
        parentFolderId: v.parentFolderId,
        subfolders: v.subfolders.map(f => ({
          name: f.name,
          id: f.id,
          exactMatch: f.exactMatch,
          hasFullWidthSpace: f.hasFullWidthSpace,
          hasHalfWidthSpace: f.hasHalfWidthSpace,
        })),
      })),
    };

    console.log('\n\n📄 詳細レポートを保存中...');
    const fs = require('fs');
    fs.writeFileSync(
      'athome-folder-variations-report.json',
      JSON.stringify(report, null, 2)
    );
    console.log('✅ レポートを保存しました: athome-folder-variations-report.json');

  } catch (error: any) {
    console.error('\n❌ エラーが発生しました:', error.message);
    console.error(error.stack);
  }
}

main();
