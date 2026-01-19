import dotenv from 'dotenv';
import { google } from 'googleapis';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

async function checkCC22Subfolder() {
  console.log('🔍 Checking CC22 subfolder contents...\n');

  // サービスアカウント認証
  const keyPath = path.resolve(__dirname, './google-service-account.json');
  const keyFile = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
  
  const auth = new google.auth.GoogleAuth({
    credentials: keyFile,
    scopes: ['https://www.googleapis.com/auth/drive'],
  });
  
  const authClient = await auth.getClient();
  const drive = google.drive({ version: 'v3', auth: authClient });

  const subfolderId = '1jD9rK5Rti80jWT8US5ilTX31EuxqWI1t'; // 徳島2丁目1期1号棟
  
  console.log('📂 Subfolder ID:', subfolderId);
  console.log('📂 Subfolder Name: 徳島2丁目1期1号棟');
  console.log('');

  try {
    // サブフォルダ内のフォルダを取得
    console.log('📋 Listing folders in subfolder...');
    const response = await drive.files.list({
      q: `'${subfolderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
      fields: 'files(id, name)',
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
      corpora: 'allDrives',
    });
    
    const folders = response.data.files || [];
    console.log(`✅ Found ${folders.length} folders:`);
    folders.forEach(f => console.log(`   - ${f.name} (${f.id})`));
    console.log('');

    // 「athome公開」フォルダを探す
    const athomeFolder = folders.find(f => f.name?.includes('athome') || f.name?.includes('公開'));
    
    if (athomeFolder) {
      console.log('🎯 Found athome folder:', athomeFolder.name);
      console.log('   ID:', athomeFolder.id);
      console.log('');

      // athome公開フォルダ内の画像を取得
      console.log('📸 Listing images in athome folder...');
      const imagesResponse = await drive.files.list({
        q: `'${athomeFolder.id}' in parents and (mimeType contains 'image/') and trashed = false`,
        fields: 'files(id, name, mimeType)',
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
        corpora: 'allDrives',
        orderBy: 'name',
      });
      
      const images = imagesResponse.data.files || [];
      console.log(`✅ Found ${images.length} images:`);
      images.slice(0, 5).forEach(img => console.log(`   - ${img.name}`));
      if (images.length > 5) {
        console.log(`   ... and ${images.length - 5} more`);
      }
    } else {
      console.log('❌ No athome folder found');
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    if (error.response?.data) {
      console.error('API Error:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

checkCC22Subfolder().catch(console.error);
