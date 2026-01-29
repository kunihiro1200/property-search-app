import { google } from 'googleapis';
import * as dotenv from 'dotenv';
import * as path from 'path';

// backend/.envファイルを読み込む
dotenv.config({ path: path.resolve(__dirname, '.env') });

async function checkAA5095DriveFolder() {
  console.log('🔍 Checking AA5095 Google Drive folder...\n');

  // Google Drive APIクライアントを初期化
  const auth = new google.auth.GoogleAuth({
    keyFile: path.resolve(__dirname, 'google-service-account.json'),
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],
  });

  const drive = google.drive({ version: 'v3', auth });

  // AA5095のフォルダID
  const folderId = '1PYRjogOl7HWyIrpckXgteejZaFM0xKwo';

  try {
    // フォルダ内のファイル一覧を取得
    const response = await drive.files.list({
      q: `'${folderId}' in parents and trashed=false`,
      fields: 'files(id, name, mimeType, webViewLink, webContentLink)',
      orderBy: 'name',
    });

    const files = response.data.files || [];

    console.log(`📁 Folder ID: ${folderId}`);
    console.log(`📊 Total files: ${files.length}\n`);

    if (files.length === 0) {
      console.log('⚠️ No files found in this folder');
      console.log('   → This is why images are not displayed');
      return;
    }

    console.log('📋 Files in folder:');
    files.forEach((file, index) => {
      console.log(`  ${index + 1}. ${file.name}`);
      console.log(`     Type: ${file.mimeType}`);
      console.log(`     ID: ${file.id}`);
      console.log('');
    });

    // 画像ファイルのみをカウント
    const imageFiles = files.filter(file => 
      file.mimeType?.startsWith('image/')
    );

    console.log(`🖼️ Image files: ${imageFiles.length}`);
    
    if (imageFiles.length === 0) {
      console.log('⚠️ No image files found in this folder');
      console.log('   → This is why images are not displayed');
    }

  } catch (error: any) {
    console.error('❌ Error accessing Google Drive:', error.message);
    if (error.code === 404) {
      console.log('⚠️ Folder not found or no access permission');
    }
  }
}

checkAA5095DriveFolder().catch(console.error);
