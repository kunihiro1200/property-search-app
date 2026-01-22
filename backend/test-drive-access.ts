/**
 * Google Drive共有ドライブアクセステスト
 * サービスアカウントが「業務依頼」共有ドライブにアクセスできるか確認
 */

import { google } from 'googleapis';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

async function testDriveAccess() {
  console.log('=== Google Drive Access Test ===\n');
  
  const parentFolderId = process.env.GOOGLE_DRIVE_PARENT_FOLDER_ID;
  console.log('Parent Folder ID (業務依頼):', parentFolderId);
  
  if (!parentFolderId) {
    console.error('❌ GOOGLE_DRIVE_PARENT_FOLDER_ID is not set');
    return;
  }
  
  // サービスアカウント認証を初期化
  const keyPath = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json';
  const absolutePath = path.resolve(__dirname, keyPath);
  
  console.log('Service Account Key Path:', absolutePath);
  
  if (!fs.existsSync(absolutePath)) {
    console.error('❌ Service account key file not found');
    return;
  }
  
  const keyFile = JSON.parse(fs.readFileSync(absolutePath, 'utf8'));
  console.log('Service Account Email:', keyFile.client_email);
  
  const auth = new google.auth.GoogleAuth({
    credentials: keyFile,
    scopes: ['https://www.googleapis.com/auth/drive'],
  });
  
  const authClient = await auth.getClient();
  const drive = google.drive({ version: 'v3', auth: authClient as any });
  
  // テスト1: 共有ドライブの情報を取得
  console.log('\n--- Test 1: Get Shared Drive Info ---');
  try {
    const driveInfo = await drive.drives.get({
      driveId: parentFolderId,
    });
    console.log('✅ Shared Drive found:', driveInfo.data.name);
    console.log('   ID:', driveInfo.data.id);
  } catch (error: any) {
    console.log('ℹ️ Not a shared drive ID, trying as folder...');
    
    // フォルダとして取得を試みる
    try {
      const folderInfo = await drive.files.get({
        fileId: parentFolderId,
        fields: 'id, name, mimeType, driveId',
        supportsAllDrives: true,
      });
      console.log('✅ Folder found:', folderInfo.data.name);
      console.log('   ID:', folderInfo.data.id);
      console.log('   Type:', folderInfo.data.mimeType);
      console.log('   Drive ID:', folderInfo.data.driveId || 'N/A (My Drive)');
    } catch (folderError: any) {
      console.error('❌ Cannot access folder:', folderError.message);
      if (folderError.response?.data) {
        console.error('   Details:', JSON.stringify(folderError.response.data, null, 2));
      }
    }
  }
  
  // テスト2: 共有ドライブ内のファイル一覧を取得
  console.log('\n--- Test 2: List Files in Shared Drive ---');
  try {
    const response = await drive.files.list({
      q: `'${parentFolderId}' in parents and trashed = false`,
      fields: 'files(id, name, mimeType)',
      spaces: 'drive',
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
      pageSize: 10,
    });
    
    const files = response.data.files || [];
    console.log(`✅ Found ${files.length} items:`);
    files.forEach(file => {
      const type = file.mimeType === 'application/vnd.google-apps.folder' ? '📁' : '📄';
      console.log(`   ${type} ${file.name} (${file.id})`);
    });
  } catch (error: any) {
    console.error('❌ Cannot list files:', error.message);
    if (error.response?.data) {
      console.error('   Details:', JSON.stringify(error.response.data, null, 2));
    }
  }
  
  // テスト3: テストフォルダを作成
  console.log('\n--- Test 3: Create Test Folder ---');
  const testFolderName = `TEST_${Date.now()}`;
  try {
    const createResponse = await drive.files.create({
      requestBody: {
        name: testFolderName,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [parentFolderId],
      },
      fields: 'id, name',
      supportsAllDrives: true,
    });
    
    console.log('✅ Test folder created:', createResponse.data.name);
    console.log('   ID:', createResponse.data.id);
    
    // テストフォルダを削除
    console.log('\n--- Test 4: Delete Test Folder ---');
    await drive.files.delete({
      fileId: createResponse.data.id!,
      supportsAllDrives: true,
    });
    console.log('✅ Test folder deleted');
    
  } catch (error: any) {
    console.error('❌ Cannot create folder:', error.message);
    if (error.response?.data) {
      console.error('   Details:', JSON.stringify(error.response.data, null, 2));
    }
    
    // エラーの原因を分析
    if (error.message?.includes('Insufficient Permission')) {
      console.log('\n⚠️ SOLUTION:');
      console.log('   サービスアカウントに共有ドライブへの編集権限がありません。');
      console.log('   Google Driveで「業務依頼」共有ドライブを開き、');
      console.log('   「メンバーを管理」から以下のメールアドレスを「編集者」として追加してください:');
      console.log(`   ${keyFile.client_email}`);
    }
  }
  
  console.log('\n=== Test Complete ===');
}

testDriveAccess().catch(console.error);
