/**
 * CC6の親フォルダの内容を確認するスクリプト
 */

import dotenv from 'dotenv';
import { GoogleDriveService } from './src/services/GoogleDriveService';

dotenv.config();

async function main() {
  console.log('=== CC6 親フォルダ内容確認 ===\n');
  
  const driveService = new GoogleDriveService();
  const parentFolderId = '1r3L1toOTgFPXBCutMuT8r1rdaVocwPAX';
  
  console.log('親フォルダID:', parentFolderId);
  console.log('URL:', `https://drive.google.com/drive/folders/${parentFolderId}\n`);
  
  try {
    // サブフォルダを取得
    console.log('📂 サブフォルダを取得中...');
    const subfolders = await driveService.listSubfolders(parentFolderId);
    
    console.log(`\n✅ ${subfolders.length}個のサブフォルダが見つかりました:\n`);
    
    if (subfolders.length === 0) {
      console.log('⚠️ サブフォルダが0件です。');
      console.log('考えられる原因:');
      console.log('1. サービスアカウントに共有権限がない');
      console.log('2. 親フォルダIDが間違っている');
      console.log('3. 実際にサブフォルダが存在しない');
    } else {
      subfolders.forEach((folder, index) => {
        console.log(`${index + 1}. ${folder.name} (${folder.id})`);
      });
      
      // 各サブフォルダの中身も確認
      console.log('\n📂 各サブフォルダの中身を確認中...\n');
      for (const folder of subfolders) {
        console.log(`\n--- ${folder.name} ---`);
        const subSubfolders = await driveService.listSubfolders(folder.id);
        console.log(`  サブフォルダ数: ${subSubfolders.length}`);
        
        if (subSubfolders.length > 0) {
          subSubfolders.forEach((subFolder, index) => {
            console.log(`  ${index + 1}. ${subFolder.name} (${subFolder.id})`);
            
            if (subFolder.name === 'athome公開' || subFolder.name === 'atbb公開') {
              console.log(`    ✅ 公開フォルダ発見！`);
            }
          });
        }
      }
    }
    
  } catch (error: any) {
    console.error('\n❌ エラー:', error.message);
    console.error('詳細:', error);
  }
}

main().catch(console.error);
