import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';

async function searchCC10Folder() {
  try {
    // Google Drive APIの認証
    const serviceAccountPath = path.join(__dirname, 'google-service-account.json');
    const credentials = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf-8'));
    
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/drive.readonly'],
    });
    
    const drive = google.drive({ version: 'v3', auth });
    
    console.log('🔍 Searching for CC10 folder in Google Drive...\n');
    
    // CC10フォルダを検索
    const response = await drive.files.list({
      q: "name contains 'CC10' and mimeType='application/vnd.google-apps.folder' and trashed=false",
      fields: 'files(id, name, parents)',
      orderBy: 'name',
    });
    
    const folders = response.data.files || [];
    
    if (folders.length === 0) {
      console.log('❌ No folders found with "CC10" in the name');
      return;
    }
    
    console.log(`✅ Found ${folders.length} folders with "CC10" in the name:\n`);
    
    for (const folder of folders) {
      console.log(`📁 Folder: ${folder.name}`);
      console.log(`   ID: ${folder.id}`);
      console.log(`   URL: https://drive.google.com/drive/folders/${folder.id}`);
      
      // サブフォルダを確認
      const subfoldersResponse = await drive.files.list({
        q: `'${folder.id}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
        fields: 'files(id, name)',
      });
      const subfolders = subfoldersResponse.data.files || [];
      
      if (subfolders.length > 0) {
        console.log(`   Subfolders:`);
        for (const subfolder of subfolders) {
          console.log(`     - ${subfolder.name}`);
        }
      }
      
      // 画像を確認
      const imagesResponse = await drive.files.list({
        q: `'${folder.id}' in parents and (mimeType contains 'image/') and trashed=false`,
        fields: 'files(id, name)',
        pageSize: 5,
      });
      const images = imagesResponse.data.files || [];
      
      if (images.length > 0) {
        console.log(`   Images (first 5):`);
        for (const image of images) {
          console.log(`     - ${image.name}`);
        }
      } else {
        console.log(`   No images in parent folder`);
      }
      
      console.log('');
    }
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }
}

searchCC10Folder();
