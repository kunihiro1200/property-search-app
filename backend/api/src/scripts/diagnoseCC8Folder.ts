/**
 * CC8フォルダの構造を診断
 */

import dotenv from 'dotenv';
import { GoogleDriveService } from '../services/GoogleDriveService';

dotenv.config();

async function diagnoseCC8Folder() {
  console.log('='.repeat(60));
  console.log('CC8フォルダ構造診断');
  console.log('='.repeat(60));
  console.log('');

  try {
    const driveService = new GoogleDriveService();
    const drive = await driveService['getDriveClient']();
    
    // CC8フォルダID
    const cc8FolderId = '1R9Uv4RyPHhf-syc_MtYHVsXMZ12CkRta';
    
    console.log('📋 ステップ1: CC8フォルダの直下を確認');
    console.log(`フォルダID: ${cc8FolderId}`);
    console.log('');
    
    // CC8フォルダ内のサブフォルダを取得
    const response1 = await drive.files.list({
      q: `'${cc8FolderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
      fields: 'files(id, name, webViewLink)',
      orderBy: 'name',
      pageSize: 20,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
      corpora: 'allDrives',
    });
    
    const folders1 = response1.data.files || [];
    
    if (folders1.length === 0) {
      console.log('❌ サブフォルダが見つかりませんでした');
      return;
    }
    
    console.log(`✅ ${folders1.length}個のサブフォルダが見つかりました:`);
    folders1.forEach((folder, index) => {
      console.log(`${index + 1}. ${folder.name}`);
      console.log(`   ID: ${folder.id}`);
      console.log('');
    });
    
    // 各サブフォルダの中を確認
    for (const folder of folders1) {
      console.log(`📁 「${folder.name}」フォルダの中を確認`);
      
      const response2 = await drive.files.list({
        q: `'${folder.id}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
        fields: 'files(id, name, webViewLink)',
        orderBy: 'name',
        pageSize: 20,
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
        corpora: 'allDrives',
      });
      
      const subfolders = response2.data.files || [];
      
      if (subfolders.length > 0) {
        console.log(`  ✅ ${subfolders.length}個のサブフォルダ:`);
        subfolders.forEach((subfolder, index) => {
          console.log(`    ${index + 1}. ${subfolder.name} (${subfolder.id})`);
        });
      } else {
        console.log(`  ❌ サブフォルダなし`);
      }
      console.log('');
    }
    
    console.log('='.repeat(60));
    console.log('診断完了');
    console.log('='.repeat(60));

  } catch (error: any) {
    console.error('❌ エラーが発生しました:', error.message);
    console.error(error);
  }
}

diagnoseCC8Folder()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
