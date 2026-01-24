import dotenv from 'dotenv';
import { google } from 'googleapis';
import * as fs from 'fs';

dotenv.config();

async function listCC6Subfolders() {
  console.log('=== CC6サブフォルダ一覧 ===\n');

  const parentFolderId = '1r3L1toOTgFPXBCutMuT8r1rdaVocwPAX';
  console.log('親フォルダID:', parentFolderId);
  console.log('');

  try {
    // サービスアカウントで認証
    const serviceAccountPath = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json';
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

    const auth = new google.auth.GoogleAuth({
      credentials: serviceAccount,
      scopes: ['https://www.googleapis.com/auth/drive.readonly'],
    });

    const drive = google.drive({ version: 'v3', auth });

    console.log('📂 サブフォルダを取得中...\n');

    const response = await drive.files.list({
      q: `'${parentFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: 'files(id, name)',
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });

    const folders = response.data.files || [];

    console.log(`見つかったサブフォルダ: ${folders.length}個\n`);

    if (folders.length > 0) {
      folders.forEach((folder, index) => {
        const name = folder.name || '';
        console.log(`${index + 1}. フォルダ名: "${name}"`);
        console.log(`   - ID: ${folder.id}`);
        console.log(`   - 文字数: ${name.length}`);
        
        // 各文字のコードポイントを表示
        const codePoints = Array.from(name).map(char => 
          `${char}(U+${char.codePointAt(0)?.toString(16).toUpperCase().padStart(4, '0')})`
        ).join(' ');
        console.log(`   - 文字詳細: ${codePoints}`);
        
        // athome公開で始まるかチェック
        if (name.startsWith('athome公開')) {
          console.log(`   ✅ "athome公開"で始まる`);
        } else if (name.includes('athome')) {
          console.log(`   ⚠️ "athome"を含むが、"athome公開"で始まらない`);
        } else if (name.includes('公開')) {
          console.log(`   ⚠️ "公開"を含むが、"athome公開"で始まらない`);
        }
        console.log('');
      });

      // athome公開フォルダを探す
      const athomeFolder = folders.find(f => f.name?.startsWith('athome公開'));
      if (athomeFolder) {
        console.log('✅ athome公開フォルダが見つかりました:');
        console.log(`   - フォルダ名: "${athomeFolder.name}"`);
        console.log(`   - フォルダID: ${athomeFolder.id}`);
        console.log('');

        // このフォルダ内の画像を確認
        console.log('📷 athome公開フォルダ内の画像を確認中...\n');
        const imagesResponse = await drive.files.list({
          q: `'${athomeFolder.id}' in parents and (mimeType contains 'image/' or name contains '.jpg' or name contains '.png') and trashed=false`,
          fields: 'files(id, name, mimeType, size)',
          supportsAllDrives: true,
          includeItemsFromAllDrives: true,
          pageSize: 50,
        });

        const images = imagesResponse.data.files || [];
        console.log(`画像数: ${images.length}枚\n`);

        if (images.length > 0) {
          images.slice(0, 10).forEach((img, index) => {
            console.log(`${index + 1}. ${img.name}`);
            console.log(`   - ID: ${img.id}`);
            console.log(`   - サイズ: ${((img.size as any) / 1024 / 1024).toFixed(2)} MB`);
          });
          if (images.length > 10) {
            console.log(`   ... 他 ${images.length - 10}枚`);
          }
        }
      } else {
        console.log('❌ athome公開フォルダが見つかりませんでした');
      }
    } else {
      console.log('❌ サブフォルダが見つかりませんでした');
      console.log('');
      console.log('📝 考えられる原因:');
      console.log('1. フォルダが空');
      console.log('2. サービスアカウントに権限がない');
      console.log('3. フォルダIDが間違っている');
    }
  } catch (error: any) {
    console.error('❌ エラー:', error.message);
    if (error.response) {
      console.error('レスポンス:', error.response.data);
    }
  }
}

listCC6Subfolders().catch(console.error);
