import { google } from 'googleapis';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load .env from backend directory
dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config({ path: path.join(__dirname, '.env.local') });

async function checkCC10DriveFolder() {
  try {
    // Google Drive APIの認証（サービスアカウントファイルから読み込み）
    const serviceAccountPath = path.join(__dirname, 'google-service-account.json');
    const credentials = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf-8'));
    
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/drive.readonly'],
    });
    
    const drive = google.drive({ version: 'v3', auth });
    
    // CC10のフォルダID
    const folderId = '1ZOz7sF48fzNrrh3pIWXFIv_KfNE8GE7j';
    
    console.log('🔍 Checking CC10 Drive folder...\n');
    console.log('Folder ID:', folderId);
    console.log('Folder URL: https://drive.google.com/drive/folders/' + folderId);
    console.log('');
    
    // フォルダのメタデータを取得
    const folderMetadata = await drive.files.get({
      fileId: folderId,
      fields: 'id, name',
    });
    console.log('📁 Folder Name:', folderMetadata.data.name);
    console.log('');
    
    // サブフォルダを確認
    console.log('📂 Checking for subfolders...');
    const subfoldersResponse = await drive.files.list({
      q: `'${folderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: 'files(id, name)',
    });
    
    const subfolders = subfoldersResponse.data.files || [];
    
    if (subfolders.length === 0) {
      console.log('  No subfolders found');
    } else {
      console.log(`  Found ${subfolders.length} subfolders:`);
      for (const subfolder of subfolders) {
        console.log(`    - ${subfolder.name} (${subfolder.id})`);
      }
    }
    console.log('');
    
    // athome公開フォルダを検索
    console.log('🔍 Searching for "athome公開" folder...');
    const athomeFolder = subfolders.find(f => f.name === 'athome公開');
    if (athomeFolder) {
      console.log('  ✅ Found "athome公開" folder:', athomeFolder.id);
      
      // athome公開フォルダの画像を取得
      const athomeImagesResponse = await drive.files.list({
        q: `'${athomeFolder.id}' in parents and (mimeType contains 'image/') and trashed=false`,
        fields: 'files(id, name)',
        orderBy: 'name',
      });
      const athomeImages = athomeImagesResponse.data.files || [];
      console.log(`  📷 Images in "athome公開": ${athomeImages.length}`);
      if (athomeImages.length > 0) {
        console.log('  First 5 images:');
        athomeImages.slice(0, 5).forEach((img, idx) => {
          console.log(`    ${idx + 1}. ${img.name}`);
        });
      }
    } else {
      console.log('  ❌ "athome公開" folder not found');
    }
    console.log('');
    
    // athome作成フォルダを検索
    console.log('🔍 Searching for "athome作成" folder...');
    const athomeSakuseiFolder = subfolders.find(f => f.name === 'athome作成');
    if (athomeSakuseiFolder) {
      console.log('  ✅ Found "athome作成" folder:', athomeSakuseiFolder.id);
      
      // athome作成フォルダの画像を取得
      const athomeSakuseiImagesResponse = await drive.files.list({
        q: `'${athomeSakuseiFolder.id}' in parents and (mimeType contains 'image/') and trashed=false`,
        fields: 'files(id, name)',
        orderBy: 'name',
      });
      const athomeSakuseiImages = athomeSakuseiImagesResponse.data.files || [];
      console.log(`  📷 Images in "athome作成": ${athomeSakuseiImages.length}`);
      if (athomeSakuseiImages.length > 0) {
        console.log('  First 5 images:');
        athomeSakuseiImages.slice(0, 5).forEach((img, idx) => {
          console.log(`    ${idx + 1}. ${img.name}`);
        });
      }
    } else {
      console.log('  ❌ "athome作成" folder not found');
    }
    console.log('');
    
    // 親フォルダの画像を確認
    console.log('📷 Checking images in parent folder...');
    const parentImagesResponse = await drive.files.list({
      q: `'${folderId}' in parents and (mimeType contains 'image/') and trashed=false`,
      fields: 'files(id, name)',
      orderBy: 'name',
    });
    const parentImages = parentImagesResponse.data.files || [];
    console.log(`  Found ${parentImages.length} images in parent folder`);
    if (parentImages.length > 0) {
      console.log('  First 5 images:');
      parentImages.slice(0, 5).forEach((img, idx) => {
        console.log(`    ${idx + 1}. ${img.name}`);
      });
    }
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }
}

checkCC10DriveFolder();
