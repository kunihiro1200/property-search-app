/**
 * Google Driveフォルダの詳細情報を確認
 */

import { google } from 'googleapis';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

async function checkDriveType() {
  console.log('=== Google Drive Folder Type Check ===\n');
  
  const parentFolderId = process.env.GOOGLE_DRIVE_PARENT_FOLDER_ID;
  console.log('Folder ID:', parentFolderId);
  
  const keyPath = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json';
  const absolutePath = path.resolve(__dirname, keyPath);
  const keyFile = JSON.parse(fs.readFileSync(absolutePath, 'utf8'));
  
  const auth = new google.auth.GoogleAuth({
    credentials: keyFile,
    scopes: ['https://www.googleapis.com/auth/drive'],
  });
  
  const authClient = await auth.getClient();
  const drive = google.drive({ version: 'v3', auth: authClient as any });
  
  // フォルダの詳細情報を取得
  try {
    const folderInfo = await drive.files.get({
      fileId: parentFolderId!,
      fields: 'id, name, mimeType, driveId, owners, permissions, shared',
      supportsAllDrives: true,
    });
    
    console.log('\n📁 Folder Details:');
    console.log('   Name:', folderInfo.data.name);
    console.log('   ID:', folderInfo.data.id);
    console.log('   Type:', folderInfo.data.mimeType);
    console.log('   Drive ID:', folderInfo.data.driveId || 'N/A (This is in My Drive, not a Shared Drive)');
    console.log('   Shared:', folderInfo.data.shared);
    
    if (folderInfo.data.owners) {
      console.log('\n👤 Owners:');
      folderInfo.data.owners.forEach(owner => {
        console.log(`   - ${owner.displayName} (${owner.emailAddress})`);
      });
    }
    
    // 共有ドライブ一覧を取得
    console.log('\n📂 Available Shared Drives:');
    const drives = await drive.drives.list({
      pageSize: 10,
    });
    
    if (drives.data.drives && drives.data.drives.length > 0) {
      drives.data.drives.forEach(d => {
        console.log(`   - ${d.name} (ID: ${d.id})`);
      });
    } else {
      console.log('   No shared drives found or no access to shared drives');
    }
    
  } catch (error: any) {
    console.error('Error:', error.message);
  }
  
  console.log('\n=== Check Complete ===');
}

checkDriveType().catch(console.error);
