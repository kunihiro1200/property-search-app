import dotenv from 'dotenv';
import path from 'path';
import { google } from 'googleapis';
import * as fs from 'fs';

// backend/.envを読み込む
dotenv.config({ path: path.resolve(__dirname, '.env') });

async function test() {
  console.log('🔍 Testing Google Drive API directly...');
  console.log('');
  
  // 環境変数チェック
  console.log('📋 Environment variables:');
  console.log('  GOOGLE_SERVICE_ACCOUNT_JSON:', process.env.GOOGLE_SERVICE_ACCOUNT_JSON ? `Set (${process.env.GOOGLE_SERVICE_ACCOUNT_JSON.length} chars)` : '❌ Not set');
  console.log('  GOOGLE_SERVICE_ACCOUNT_KEY_PATH:', process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || '❌ Not set');
  console.log('');
  
  try {
    // サービスアカウント認証を初期化
    let keyFile: any;
    
    if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
      console.log('📝 Loading service account from GOOGLE_SERVICE_ACCOUNT_JSON environment variable');
      keyFile = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
      console.log('✅ Successfully parsed GOOGLE_SERVICE_ACCOUNT_JSON');
    } else {
      const keyPath = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json';
      const absolutePath = path.resolve(__dirname, keyPath);
      
      if (!fs.existsSync(absolutePath)) {
        throw new Error(`Service account key file not found: ${absolutePath}`);
      }
      
      console.log('📝 Loading service account from file:', absolutePath);
      keyFile = JSON.parse(fs.readFileSync(absolutePath, 'utf8'));
    }
    
    const auth = new google.auth.GoogleAuth({
      credentials: keyFile,
      scopes: ['https://www.googleapis.com/auth/drive'],
    });
    
    console.log('✅ Google Auth initialized');
    console.log('');
    
    const authClient = await auth.getClient();
    const drive = google.drive({ version: 'v3', auth: authClient });
    
    console.log('✅ Google Drive client initialized');
    console.log('');
    
    // AA9743のフォルダIDを抽出
    const storageLocation = 'https://drive.google.com/drive/u/0/folders/1zIdVhba2rVMch69oDE-Eayjk4RV6-aQQ';
    const folderIdMatch = storageLocation.match(/\/folders\/([a-zA-Z0-9_-]+)/);
    const folderId = folderIdMatch ? folderIdMatch[1] : null;
    
    if (!folderId) {
      throw new Error('Could not extract folder ID from storage location');
    }
    
    console.log('📂 Folder ID:', folderId);
    console.log('');
    
    // まずフォルダ自体にアクセスできるか確認
    console.log('🔍 Checking folder access...');
    try {
      const folderInfo = await drive.files.get({
        fileId: folderId,
        fields: 'id, name, mimeType, capabilities',
        supportsAllDrives: true,
      });
      
      console.log('✅ Folder accessible:');
      console.log('  Name:', folderInfo.data.name);
      console.log('  Type:', folderInfo.data.mimeType);
      console.log('  Capabilities:', folderInfo.data.capabilities);
      console.log('');
    } catch (folderError: any) {
      console.error('❌ Cannot access folder:', folderError.message);
      if (folderError.response?.data) {
        console.error('Error details:', JSON.stringify(folderError.response.data, null, 2));
      }
      throw folderError;
    }
    
    // フォルダ内のファイルを取得
    console.log('🔍 Listing files in folder...');
    const response = await drive.files.list({
      q: `'${folderId}' in parents and trashed = false`,
      fields: 'files(id, name, mimeType)',
      orderBy: 'name',
      pageSize: 100,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
      corpora: 'allDrives',
    });
    
    const files = response.data.files || [];
    console.log('');
    console.log('📊 Result:');
    console.log('  File count:', files.length);
    
    if (files.length > 0) {
      console.log('  Files:');
      files.forEach((file, index) => {
        const isFolder = file.mimeType === 'application/vnd.google-apps.folder';
        const icon = isFolder ? '📁' : '📄';
        console.log(`    ${index + 1}. ${icon} ${file.name} (${file.mimeType})`);
      });
    } else {
      console.log('  ⚠️ No files found');
    }
    
  } catch (error: any) {
    console.error('');
    console.error('❌ Error:', error.message);
    console.error('');
    if (error.response?.data) {
      console.error('API Error details:', JSON.stringify(error.response.data, null, 2));
    }
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

test();
