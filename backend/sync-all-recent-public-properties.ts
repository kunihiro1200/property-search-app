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

async function syncAllRecentPublicProperties() {
  console.log('🔧 2026-01-14以降に追加された公開中の物件のstorage_locationを一括設定中...\n');
  
  try {
    // 1. データベースから公開中の物件を取得（2026-01-14以降、storage_location未設定）
    console.log('=== 1. 公開中の物件を取得中 ===');
    console.log('条件:');
    console.log('  - created_at >= 2026-01-14');
    console.log('  - atbb_status に「公開中」「公開前」「非公開（配信メールのみ）」のいずれかが含まれる');
    console.log('  - storage_location IS NULL');
    console.log('');
    
    // ✅ 公開中の物件の正しい定義（3つの条件のいずれか）
    const { data: properties, error: fetchError } = await supabase
      .from('property_listings')
      .select('id, property_number, storage_location, atbb_status, created_at')
      .gte('created_at', '2026-01-14T00:00:00Z')
      .is('storage_location', null)
      .or(
        'atbb_status.ilike.%公開中%,' +
        'atbb_status.ilike.%公開前%,' +
        'atbb_status.ilike.%非公開（配信メールのみ）%'
      )
      .order('property_number');
    
    if (fetchError) {
      console.error('❌ エラー:', fetchError);
      return;
    }
    
    if (!properties || properties.length === 0) {
      console.log('✅ 全ての公開中の物件にstorage_locationが設定されています');
      return;
    }
    
    console.log(`✅ ${properties.length}件の公開中の物件が見つかりました\n`);
    
    // 物件番号を表示
    console.log('対象物件:');
    properties.forEach((prop, index) => {
      console.log(`  ${index + 1}. ${prop.property_number} (${prop.atbb_status})`);
    });
    console.log('');
    
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
    
    // 3. 各物件のフォルダを検索して設定
    console.log('=== 3. 各物件のフォルダを検索 ===\n');
    
    let successCount = 0;
    let notFoundCount = 0;
    const notFoundProperties: string[] = [];
    
    for (const property of properties) {
      const propertyNumber = property.property_number;
      
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
            successCount++;
          }
        } else {
          console.log(`  ❌ ${propertyNumber}: フォルダが見つかりません`);
          notFoundCount++;
          notFoundProperties.push(propertyNumber);
        }
        
        // API制限を避けるため少し待機
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error: any) {
        console.log(`  ❌ ${propertyNumber}: エラー - ${error.message}`);
        notFoundCount++;
        notFoundProperties.push(propertyNumber);
      }
    }
    
    // 4. 結果サマリー
    console.log('\n=== 4. 結果サマリー ===');
    console.log(`✅ 設定成功: ${successCount}件`);
    console.log(`❌ フォルダ未発見: ${notFoundCount}件`);
    console.log(`📊 合計: ${properties.length}件`);
    
    if (notFoundCount > 0) {
      console.log('\n❌ フォルダが見つからなかった物件:');
      notFoundProperties.forEach((prop, index) => {
        console.log(`  ${index + 1}. ${prop}`);
      });
    }
    
    if (successCount > 0) {
      console.log('\n✅ 公開物件サイトで画像が表示されるようになりました！');
    }
    
  } catch (error: any) {
    console.error('❌ エラー:', error.message);
    console.error(error);
  }
}

syncAllRecentPublicProperties().catch(console.error);
