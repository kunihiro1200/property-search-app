import { google } from 'googleapis';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// backend/.envファイルを読み込む
dotenv.config({ path: path.resolve(__dirname, '.env') });

async function searchBB16Folder() {
  console.log('🔍 Google DriveでBB16フォルダを検索中...\n');
  
  try {
    // サービスアカウント認証
    let keyFile: any;
    
    if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
      keyFile = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
    } else {
      const keyPath = path.resolve(__dirname, 'google-service-account.json');
      if (!fs.existsSync(keyPath)) {
        console.error('❌ google-service-account.jsonが見つかりません');
        return;
      }
      keyFile = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
    }
    
    const auth = new google.auth.GoogleAuth({
      credentials: keyFile,
      scopes: ['https://www.googleapis.com/auth/drive'],
    });
    
    const authClient = await auth.getClient();
    const drive = google.drive({ version: 'v3', auth: authClient });
    
    // BB16フォルダを検索
    console.log('📁 マイドライブを検索中...');
    const myDriveResponse = await drive.files.list({
      q: `name contains 'BB16' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
      fields: 'files(id, name, parents)',
      corpora: 'user',
      pageSize: 20,
    });
    
    let files = myDriveResponse.data.files || [];
    
    if (files.length === 0) {
      console.log('📁 共有ドライブを検索中...');
      const sharedDriveResponse = await drive.files.list({
        q: `name contains 'BB16' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
        fields: 'files(id, name, parents)',
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
        corpora: 'allDrives',
        pageSize: 20,
      });
      
      files = sharedDriveResponse.data.files || [];
    }
    
    if (files.length > 0) {
      console.log(`✅ ${files.length}個のフォルダが見つかりました:\n`);
      
      files.forEach((file, index) => {
        console.log(`[${index + 1}] ${file.name}`);
        console.log(`    ID: ${file.id}`);
        console.log(`    URL: https://drive.google.com/drive/folders/${file.id}`);
        console.log('');
      });
      
      // 最初のフォルダの詳細を確認
      const folderId = files[0].id!;
      console.log(`\n📂 「${files[0].name}」の内容を確認中...\n`);
      
      // サブフォルダを取得
      const subfoldersResponse = await drive.files.list({
        q: `'${folderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
        fields: 'files(id, name)',
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
        corpora: 'allDrives',
      });
      
      const subfolders = subfoldersResponse.data.files || [];
      
      if (subfolders.length > 0) {
        console.log(`✅ ${subfolders.length}個のサブフォルダ:`);
        subfolders.forEach((folder) => {
          const isPublic = folder.name?.includes('公開');
          const icon = isPublic ? '🌟' : '📁';
          console.log(`  ${icon} ${folder.name}`);
        });
      } else {
        console.log('📁 サブフォルダなし');
      }
      
      // 画像ファイルを取得
      const imagesResponse = await drive.files.list({
        q: `'${folderId}' in parents and trashed = false and (mimeType contains 'image/')`,
        fields: 'files(id, name, mimeType)',
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
        corpora: 'allDrives',
        pageSize: 10,
      });
      
      const images = imagesResponse.data.files || [];
      
      if (images.length > 0) {
        console.log(`\n🖼️ ${images.length}枚の画像:`);
        images.forEach((img, index) => {
          console.log(`  ${index + 1}. ${img.name}`);
        });
      } else {
        console.log('\n❌ 画像ファイルなし');
      }
      
    } else {
      console.log('❌ BB16フォルダが見つかりませんでした');
    }
    
  } catch (error: any) {
    console.error('❌ エラー:', error.message);
    console.error(error);
  }
}

searchBB16Folder().catch(console.error);
