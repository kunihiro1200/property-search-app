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

async function syncAllMissingStorageLocations() {
  console.log('🔧 storage_locationが未設定の全物件を一括同期中...\n');
  
  try {
    // 1. storage_locationが未設定の物件を取得
    console.log('=== 1. 未設定物件を取得中 ===');
    const { data: properties, error: fetchError } = await supabase
      .from('property_listings')
      .select('id, property_number, storage_location, created_at')
      .is('storage_location', null)
      .order('created_at', { ascending: false });
    
    if (fetchError) {
      console.error('❌ エラー:', fetchError);
      return;
    }
    
    if (!properties || properties.length === 0) {
      console.log('✅ 全ての物件にstorage_locationが設定されています！');
      return;
    }
    
    console.log(`⚠️ ${properties.length}件の物件でstorage_locationが未設定です`);
    console.log(`   最新: ${properties[0].property_number} (${properties[0].created_at})`);
    console.log(`   最古: ${properties[properties.length - 1].property_number} (${properties[properties.length - 1].created_at})\n`);
    
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
    let errorCount = 0;
    
    // バッチ処理（10件ずつ）
    const batchSize = 10;
    for (let i = 0; i < properties.length; i += batchSize) {
      const batch = properties.slice(i, i + batchSize);
      
      console.log(`📦 バッチ ${Math.floor(i / batchSize) + 1}/${Math.ceil(properties.length / batchSize)} (${batch.length}件)`);
      
      for (const property of batch) {
        const propertyNumber = property.property_number;
        
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
              console.log(`  ❌ ${propertyNumber}: DB更新エラー`);
              errorCount++;
            } else {
              console.log(`  ✅ ${propertyNumber}`);
              successCount++;
            }
          } else {
            console.log(`  ⚠️ ${propertyNumber}: フォルダ未発見`);
            notFoundCount++;
          }
          
          // API制限を避けるため少し待機
          await new Promise(resolve => setTimeout(resolve, 100));
          
        } catch (error: any) {
          console.log(`  ❌ ${propertyNumber}: ${error.message}`);
          errorCount++;
        }
      }
      
      console.log('');
    }
    
    // 4. 結果サマリー
    console.log('=== 4. 結果サマリー ===');
    console.log(`✅ 設定成功: ${successCount}件`);
    console.log(`⚠️ フォルダ未発見: ${notFoundCount}件`);
    console.log(`❌ エラー: ${errorCount}件`);
    console.log(`📊 合計: ${properties.length}件`);
    
    const successRate = ((successCount / properties.length) * 100).toFixed(1);
    console.log(`\n📈 成功率: ${successRate}%`);
    
    if (successCount > 0) {
      console.log('\n✅ 公開物件サイトで画像が表示されるようになりました！');
    }
    
    if (notFoundCount > 0) {
      console.log(`\n💡 ${notFoundCount}件の物件はGoogle Driveにフォルダが存在しません`);
      console.log('   以下の理由が考えられます:');
      console.log('   1. フォルダがまだ作成されていない');
      console.log('   2. フォルダ名が物件番号と異なる');
      console.log('   3. サービスアカウントに閲覧権限がない');
    }
    
  } catch (error: any) {
    console.error('❌ エラー:', error.message);
    console.error(error);
  }
}

syncAllMissingStorageLocations().catch(console.error);
