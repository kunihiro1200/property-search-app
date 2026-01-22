import dotenv from 'dotenv';
import { google } from 'googleapis';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

async function checkCC22FolderContents() {
  console.log('🔍 Checking CC22 folder contents...\n');

  // サービスアカウント認証
  const keyPath = path.resolve(__dirname, './google-service-account.json');
  const keyFile = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
  
  const auth = new google.auth.GoogleAuth({
    credentials: keyFile,
    scopes: ['https://www.googleapis.com/auth/drive'],
  });
  
  const authClient = await auth.getClient();
  const drive = google.drive({ version: 'v3', auth: authClient });

  const folderId = '18kS4tddOp2vwKJNmyvv_qTLBVKFKI7rd';
  
  console.log('📂 Folder ID:', folderId);
  console.log('');

  try {
    // 1. フォルダのメタデータを取得
    console.log('1️⃣ Getting folder metadata...');
    const metadata = await drive.files.get({
      fileId: folderId,
      fields: 'id, name, mimeType, parents, driveId, capabilities',
      supportsAllDrives: true,
    });
    
    console.log('✅ Folder metadata:');
    console.log('   Name:', metadata.data.name);
    console.log('   ID:', metadata.data.id);
    console.log('   Parents:', metadata.data.parents);
    console.log('   Drive ID:', metadata.data.driveId || '(none - My Drive)');
    console.log('');

    // 2. フォルダ内のサブフォルダを取得（マイドライブとして）
    console.log('2️⃣ Listing subfolders (as My Drive)...');
    try {
      const myDriveResponse = await drive.files.list({
        q: `'${folderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
        fields: 'files(id, name)',
        corpora: 'user',
      });
      
      const myDriveFolders = myDriveResponse.data.files || [];
      console.log(`   Found ${myDriveFolders.length} folders in My Drive mode:`);
      myDriveFolders.forEach(f => console.log(`   - ${f.name} (${f.id})`));
    } catch (error: any) {
      console.log('   ❌ Error in My Drive mode:', error.message);
    }
    console.log('');

    // 3. フォルダ内のサブフォルダを取得（共有ドライブとして - allDrives）
    console.log('3️⃣ Listing subfolders (as Shared Drive - allDrives)...');
    try {
      const allDrivesResponse = await drive.files.list({
        q: `'${folderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
        fields: 'files(id, name)',
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
        corpora: 'allDrives',
      });
      
      const allDrivesFolders = allDrivesResponse.data.files || [];
      console.log(`   Found ${allDrivesFolders.length} folders in allDrives mode:`);
      allDrivesFolders.forEach(f => console.log(`   - ${f.name} (${f.id})`));
    } catch (error: any) {
      console.log('   ❌ Error in allDrives mode:', error.message);
    }
    console.log('');

    // 4. 環境変数のGOOGLE_DRIVE_PARENT_FOLDER_IDを使用
    const parentFolderId = process.env.GOOGLE_DRIVE_PARENT_FOLDER_ID;
    if (parentFolderId) {
      console.log('4️⃣ Listing subfolders (with driveId from env)...');
      console.log('   Drive ID:', parentFolderId);
      try {
        const driveResponse = await drive.files.list({
          q: `'${folderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
          fields: 'files(id, name)',
          supportsAllDrives: true,
          includeItemsFromAllDrives: true,
          corpora: 'drive',
          driveId: parentFolderId,
        });
        
        const driveFolders = driveResponse.data.files || [];
        console.log(`   Found ${driveFolders.length} folders with driveId:`);
        driveFolders.forEach(f => console.log(`   - ${f.name} (${f.id})`));
      } catch (error: any) {
        console.log('   ❌ Error with driveId:', error.message);
      }
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    if (error.response?.data) {
      console.error('API Error:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

checkCC22FolderContents().catch(console.error);
