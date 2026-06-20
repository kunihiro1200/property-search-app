/**
 * 写真・添付資料フォルダの診断スクリプト
 * 指定されたフォルダ内のサブフォルダを確認
 */

import dotenv from 'dotenv';
import { GoogleDriveService } from '../services/GoogleDriveService';

dotenv.config();

async function diagnosePhotoFolder() {
  console.log('='.repeat(60));
  console.log('写真・添付資料フォルダ診断');
  console.log('='.repeat(60));
  console.log('');

  try {
    const driveService = new GoogleDriveService();
    const drive = await driveService['getDriveClient']();
    
    // 写真・添付資料フォルダID
    const photoFolderId = '1JcFmIP2vNYsllwLvxNOIgNE3EjpNqQtM';
    
    console.log('📋 ステップ1: 写真・添付資料フォルダの情報を確認');
    console.log(`フォルダID: ${photoFolderId}`);
    console.log('');
    
    // フォルダ内のサブフォルダを取得（最初の20件）
    console.log('📁 ステップ2: フォルダ内のサブフォルダを取得');
    const response = await drive.files.list({
      q: `'${photoFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
      fields: 'files(id, name, webViewLink)',
      orderBy: 'name',
      pageSize: 20,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
      corpora: 'drive',
      driveId: '0AJd1KlohTQaTUk9PVA', // 業務依頼の共有ドライブID
    });
    
    const folders = response.data.files || [];
    
    if (folders.length === 0) {
      console.log('❌ サブフォルダが見つかりませんでした');
      return;
    }
    
    console.log(`✅ ${folders.length}個のサブフォルダが見つかりました:`);
    console.log('');
    
    folders.forEach((folder, index) => {
      console.log(`${index + 1}. ${folder.name}`);
      console.log(`   ID: ${folder.id}`);
      console.log(`   URL: ${folder.webViewLink}`);
      console.log('');
    });
    
    // AA13069で始まるフォルダを検索
    console.log('🔍 ステップ3: AA13069で始まるフォルダを検索');
    const aa13069Folders = folders.filter(f => f.name?.startsWith('AA13069'));
    
    if (aa13069Folders.length > 0) {
      console.log(`✅ ${aa13069Folders.length}個のAA13069フォルダが見つかりました:`);
      aa13069Folders.forEach((folder, index) => {
        console.log(`${index + 1}. ${folder.name}`);
        console.log(`   ID: ${folder.id}`);
        console.log(`   URL: ${folder.webViewLink}`);
        console.log('');
      });
    } else {
      console.log('❌ AA13069で始まるフォルダが見つかりませんでした');
    }
    
    console.log('='.repeat(60));
    console.log('診断完了');
    console.log('='.repeat(60));

  } catch (error: any) {
    console.error('❌ エラーが発生しました:', error.message);
    console.error(error);
  }
}

diagnosePhotoFolder()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
