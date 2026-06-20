import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// backend/.envファイルを読み込む
dotenv.config({ path: path.resolve(__dirname, '.env') });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function investigateAA8695() {
  console.log('🔍 AA8695物件の画像表示問題を調査中...\n');
  
  // 1. データベースの情報を確認
  console.log('=== 1. データベース情報 ===');
  const { data: property, error: dbError } = await supabase
    .from('property_listings')
    .select('id, property_number, storage_location, site_display, created_at, updated_at')
    .eq('property_number', 'AA8695')
    .single();
  
  if (dbError) {
    console.error('❌ エラー:', dbError);
    return;
  }
  
  if (!property) {
    console.log('❌ AA8695物件が見つかりません');
    return;
  }
  
  console.log('✅ 物件情報:');
  console.log(`  物件番号: ${property.property_number}`);
  console.log(`  ID: ${property.id}`);
  console.log(`  格納先: ${property.storage_location || '未設定'}`);
  console.log(`  サイト表示: ${property.site_display || '未設定'}`);
  console.log(`  作成日: ${property.created_at}`);
  console.log(`  更新日: ${property.updated_at}`);
  
  // 2. Google Driveでフォルダを検索
  console.log('\n=== 2. Google Driveでフォルダを検索 ===');
  
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
    
    // AA8695フォルダを検索
    console.log('📁 マイドライブを検索中...');
    const myDriveResponse = await drive.files.list({
      q: `name contains 'AA8695' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
      fields: 'files(id, name, parents)',
      corpora: 'user',
      pageSize: 20,
    });
    
    let files = myDriveResponse.data.files || [];
    
    if (files.length === 0) {
      console.log('📁 共有ドライブを検索中...');
      const sharedDriveResponse = await drive.files.list({
        q: `name contains 'AA8695' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
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
      const folderName = files[0].name!;
      console.log(`\n📂 「${folderName}」の内容を確認中...\n`);
      
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
        
        // athome公開フォルダを探す
        const athomeFolder = subfolders.find(f => f.name?.includes('athome') && f.name?.includes('公開'));
        const atbbFolder = subfolders.find(f => f.name?.includes('atbb') && f.name?.includes('公開'));
        
        if (athomeFolder) {
          console.log(`\n✅ 「athome公開」フォルダ発見: ${athomeFolder.name}`);
          
          // athome公開フォルダ内の画像を確認
          const athomeImagesResponse = await drive.files.list({
            q: `'${athomeFolder.id}' in parents and trashed = false and (mimeType contains 'image/')`,
            fields: 'files(id, name, mimeType)',
            supportsAllDrives: true,
            includeItemsFromAllDrives: true,
            corpora: 'allDrives',
            pageSize: 10,
          });
          
          const athomeImages = athomeImagesResponse.data.files || [];
          console.log(`   画像数: ${athomeImages.length}枚`);
          
          if (athomeImages.length > 0) {
            athomeImages.slice(0, 3).forEach((img, index) => {
              console.log(`   ${index + 1}. ${img.name}`);
            });
          }
        } else if (atbbFolder) {
          console.log(`\n✅ 「atbb公開」フォルダ発見: ${atbbFolder.name}`);
        } else {
          console.log('\n⚠️ 公開フォルダなし（親フォルダから画像を取得）');
        }
      } else {
        console.log('📁 サブフォルダなし');
      }
      
      // 親フォルダ内の画像を確認
      const imagesResponse = await drive.files.list({
        q: `'${folderId}' in parents and trashed = false and (mimeType contains 'image/')`,
        fields: 'files(id, name, mimeType)',
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
        corpora: 'allDrives',
        pageSize: 10,
      });
      
      const images = imagesResponse.data.files || [];
      
      console.log(`\n🖼️ 親フォルダ内の画像: ${images.length}枚`);
      if (images.length > 0) {
        images.slice(0, 3).forEach((img, index) => {
          console.log(`  ${index + 1}. ${img.name}`);
        });
      }
      
      // 3. 診断結果
      console.log('\n=== 3. 診断結果 ===');
      
      if (!property.storage_location) {
        console.log('❌ 問題: storage_locationが未設定');
        console.log('✅ 解決策: storage_locationを設定する');
        console.log(`   推奨URL: https://drive.google.com/drive/folders/${folderId}`);
      } else if (property.storage_location !== `https://drive.google.com/drive/folders/${folderId}`) {
        console.log('⚠️ 問題: storage_locationが異なるフォルダを指している');
        console.log(`   現在: ${property.storage_location}`);
        console.log(`   正しいURL: https://drive.google.com/drive/folders/${folderId}`);
      } else {
        console.log('✅ storage_locationは正しく設定されています');
        
        if (subfolders.length === 0 && images.length === 0) {
          console.log('❌ 問題: フォルダ内に画像がありません');
        } else {
          console.log('✅ フォルダ内に画像があります');
          console.log('💡 キャッシュをクリアすると表示される可能性があります');
        }
      }
      
    } else {
      console.log('❌ AA8695フォルダが見つかりませんでした');
      console.log('\n💡 考えられる理由:');
      console.log('  1. フォルダ名が「AA8695」を含んでいない');
      console.log('  2. フォルダがまだ作成されていない');
      console.log('  3. サービスアカウントに閲覧権限がない');
    }
    
  } catch (error: any) {
    console.error('❌ エラー:', error.message);
    console.error(error);
  }
}

investigateAA8695().catch(console.error);
