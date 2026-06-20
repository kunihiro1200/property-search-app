import { GoogleDriveService } from './src/services/GoogleDriveService';

async function investigateFolderStructure() {
  console.log('=== CC6の親フォルダ構造を調査 ===\n');

  const parentFolderId = '1kXmrhesqayVV-i4zF8DznLK99tcCCauP';
  const wrongFolderId = '1r3L1toOTgFPXBCutMuT8r1rdaVocwPAX'; // ふじが丘西１丁目
  const correctFolderId = '16p4voX2h3oqxWRnsaczu_ax85s_Je_NK'; // athome公開
  
  console.log('親フォルダID:', parentFolderId);
  console.log('親フォルダURL:', `https://drive.google.com/drive/folders/${parentFolderId}`);
  console.log('');

  const driveService = new GoogleDriveService();

  try {
    // 親フォルダ内のサブフォルダ一覧を取得
    console.log('サブフォルダを取得中...\n');
    const subfolders = await driveService.listSubfolders(parentFolderId);
    
    console.log(`✅ サブフォルダ数: ${subfolders.length}\n`);
    
    console.log('サブフォルダ一覧:');
    subfolders.forEach((folder: any, index: number) => {
      const isWrong = folder.id === wrongFolderId;
      const isCorrect = folder.id === correctFolderId;
      
      let marker = '';
      if (isWrong) marker = ' ❌ (間違って取得されているフォルダ)';
      if (isCorrect) marker = ' ✅ (正しいathome公開フォルダ)';
      
      console.log(`${index + 1}. ${folder.name}${marker}`);
      console.log(`   ID: ${folder.id}`);
      
      // athome公開を含むか確認
      if (folder.name.includes('athome公開') || folder.name.includes('athome')) {
        console.log(`   ⭐ "athome"を含むフォルダ名`);
      }
      
      console.log('');
    });
    
    // athome公開フォルダを検索
    console.log('=== athome公開フォルダの検索ロジックをテスト ===\n');
    
    // パターン1: "athome公開"で始まるフォルダを検索
    const athomePublicFolder = subfolders.find((folder: any) => 
      folder.name.startsWith('athome公開')
    );
    
    if (athomePublicFolder) {
      console.log('✅ パターン1（"athome公開"で始まる）: 見つかりました');
      console.log(`   フォルダ名: ${athomePublicFolder.name}`);
      console.log(`   フォルダID: ${athomePublicFolder.id}`);
      console.log(`   正しいフォルダ: ${athomePublicFolder.id === correctFolderId ? 'はい' : 'いいえ'}`);
    } else {
      console.log('❌ パターン1（"athome公開"で始まる）: 見つかりませんでした');
    }
    
    console.log('');
    
    // パターン2: "athome"を含むフォルダを検索
    const athomeFolder = subfolders.find((folder: any) => 
      folder.name.includes('athome')
    );
    
    if (athomeFolder) {
      console.log('✅ パターン2（"athome"を含む）: 見つかりました');
      console.log(`   フォルダ名: ${athomeFolder.name}`);
      console.log(`   フォルダID: ${athomeFolder.id}`);
      console.log(`   正しいフォルダ: ${athomeFolder.id === correctFolderId ? 'はい' : 'いいえ'}`);
    } else {
      console.log('❌ パターン2（"athome"を含む）: 見つかりませんでした');
    }
    
    console.log('');
    
    // 現在のGoogleDriveServiceのfindFolderByNameメソッドをテスト
    console.log('=== GoogleDriveService.findFolderByName()をテスト ===\n');
    
    const foundFolderId = await driveService.findFolderByName(parentFolderId, 'athome公開', true);
    
    if (foundFolderId) {
      console.log('✅ findFolderByName()で見つかりました');
      console.log(`   フォルダID: ${foundFolderId}`);
      console.log(`   正しいフォルダ: ${foundFolderId === correctFolderId ? 'はい' : 'いいえ'}`);
      
      if (foundFolderId !== correctFolderId) {
        console.log(`   ❌ 間違ったフォルダが返されています！`);
        
        // 間違ったフォルダの名前を確認
        const wrongFolder = subfolders.find((f: any) => f.id === foundFolderId);
        if (wrongFolder) {
          console.log(`   間違ったフォルダ名: ${wrongFolder.name}`);
        }
      }
    } else {
      console.log('❌ findFolderByName()で見つかりませんでした');
    }
    
  } catch (error: any) {
    console.error('❌ エラー:', error.message);
    console.error('詳細:', error);
  }
}

investigateFolderStructure().catch(console.error);
