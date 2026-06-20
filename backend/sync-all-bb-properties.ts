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

async function syncAllBBProperties() {
  console.log('🔧 全てのBB物件のstorage_locationを設定中...\n');
  
  try {
    // 1. データベースから全てのBB物件を取得
    console.log('=== 1. BB物件を取得中 ===');
    const { data: bbProperties, error: fetchError } = await supabase
      .from('property_listings')
      .select('id, property_number, storage_location')
      .ilike('property_number', 'BB%')
      .order('property_number');
    
    if (fetchError) {
      console.error('❌ エラー:', fetchError);
      return;
    }
    
    if (!bbProperties || bbProperties.length === 0) {
      console.log('❌ BB物件が見つかりません');
      return;
    }
    
    console.log(`✅ ${bbProperties.length}件のBB物件が見つかりました\n`);
    
    // 2. Google Drive認証
    console.log('=== 2. Google Drive認証 ===');
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
    console.log('✅ Google Drive認証成功\n');
    
    // 3. 各BB物件のフォルダを検索して設定
    console.log('=== 3. 各BB物件のフォルダを検索 ===\n');
    
    let successCount = 0;
    let notFoundCount = 0;
    let alreadySetCount = 0;
    
    for (const property of bbProperties) {
      const propertyNumber = property.property_number;
      
      // 既に設定済みの場合はスキップ
      if (property.storage_location) {
        console.log(`⏭️  ${propertyNumber}: 既に設定済み`);
        alreadySetCount++;
        continue;
      }
      
      console.log(`🔍 ${propertyNumber}: フォルダを検索中...`);
      
      try {
        // マイドライブを検索
        const myDriveResponse = await drive.files.list({
          q: `name contains '${propertyNumber}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
          fields: 'files(id, name)',
          corpora: 'user',
          pageSize: 5,
        });
        
        let files = myDriveResponse.data.files || [];
        
        // マイドライブで見つからなければ共有ドライブを検索
        if (files.length === 0) {
          const sharedDriveResponse = await drive.files.list({
            q: `name contains '${propertyNumber}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
            fields: 'files(id, name)',
            supportsAllDrives: true,
            includeItemsFromAllDrives: true,
            corpora: 'allDrives',
            pageSize: 5,
          });
          
          files = sharedDriveResponse.data.files || [];
        }
        
        if (files.length > 0) {
          // 物件番号で始まるフォルダを優先
          let matchingFolder = files.find(f => f.name?.startsWith(propertyNumber));
          
          // 見つからなければ物件番号を含むフォルダを使用
          if (!matchingFolder) {
            matchingFolder = files[0];
          }
          
          const folderId = matchingFolder.id!;
          const folderUrl = `https://drive.google.com/drive/folders/${folderId}`;
          
          // データベースを更新
          const { error: updateError } = await supabase
            .from('property_listings')
            .update({
              storage_location: folderUrl,
              updated_at: new Date().toISOString(),
            })
            .eq('property_number', propertyNumber);
          
          if (updateError) {
            console.log(`  ❌ ${propertyNumber}: データベース更新エラー - ${updateError.message}`);
          } else {
            console.log(`  ✅ ${propertyNumber}: ${matchingFolder.name}`);
            console.log(`     ${folderUrl}`);
            successCount++;
          }
        } else {
          console.log(`  ❌ ${propertyNumber}: フォルダが見つかりません`);
          notFoundCount++;
        }
        
        // API制限を避けるため少し待機
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error: any) {
        console.log(`  ❌ ${propertyNumber}: エラー - ${error.message}`);
        notFoundCount++;
      }
    }
    
    // 4. 結果サマリー
    console.log('\n=== 4. 結果サマリー ===');
    console.log(`✅ 設定成功: ${successCount}件`);
    console.log(`⏭️  既に設定済み: ${alreadySetCount}件`);
    console.log(`❌ フォルダ未発見: ${notFoundCount}件`);
    console.log(`📊 合計: ${bbProperties.length}件`);
    
    if (successCount > 0) {
      console.log('\n✅ 公開物件サイトで画像が表示されるようになりました！');
    }
    
  } catch (error: any) {
    console.error('❌ エラー:', error.message);
    console.error(error);
  }
}

syncAllBBProperties().catch(console.error);
