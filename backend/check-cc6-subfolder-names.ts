import dotenv from 'dotenv';
import { GoogleDriveService } from './src/services/GoogleDriveService';

dotenv.config();

async function checkCC6SubfolderNames() {
  console.log('=== CC6サブフォルダ名確認 ===\n');

  const parentFolderId = '1r3L1toOTgFPXBCutMuT8r1rdaVocwPAX';
  console.log('親フォルダID:', parentFolderId);
  console.log('');

  const driveService = new GoogleDriveService();

  try {
    console.log('📂 サブフォルダを取得中...\n');
    
    // Google Drive APIで直接サブフォルダを取得
    const response = await driveService['drive'].files.list({
      q: `'${parentFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: 'files(id, name)',
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });

    const folders = response.data.files || [];

    console.log(`見つかったサブフォルダ: ${folders.length}個\n`);

    if (folders.length > 0) {
      folders.forEach((folder, index) => {
        console.log(`${index + 1}. フォルダ名: "${folder.name}"`);
        console.log(`   - ID: ${folder.id}`);
        console.log(`   - 文字数: ${folder.name?.length}`);
        console.log(`   - 16進数: ${Buffer.from(folder.name || '', 'utf8').toString('hex')}`);
        
        // athome公開で始まるかチェック
        if (folder.name?.startsWith('athome公開')) {
          console.log(`   ✅ "athome公開"で始まる`);
        } else if (folder.name?.includes('athome')) {
          console.log(`   ⚠️ "athome"を含むが、"athome公開"で始まらない`);
        }
        console.log('');
      });
    } else {
      console.log('❌ サブフォルダが見つかりませんでした');
    }
  } catch (error: any) {
    console.error('❌ エラー:', error.message);
    console.error('スタック:', error.stack);
  }
}

checkCC6SubfolderNames().catch(console.error);
