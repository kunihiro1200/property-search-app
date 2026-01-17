// お気に入り文言をスプレッドシートからproperty_detailsテーブルに同期するスクリプト
import dotenv from 'dotenv';
import { PropertyListingService } from './src/services/PropertyListingService';
import { PropertyDetailsService } from './src/services/PropertyDetailsService';
import { FavoriteCommentService } from './src/services/FavoriteCommentService';

// 環境変数を読み込む
dotenv.config();

// コマンドライン引数を解析
interface ScriptOptions {
  force: boolean;          // 既存データを上書き
  dryRun: boolean;         // 実際には保存しない
  limit: number | null;    // 処理する物件数を制限
  offset: number;          // スキップする物件数
  propertyNumber: string | null; // 特定の物件のみ処理
}

function parseArgs(): ScriptOptions {
  const args = process.argv.slice(2);
  const options: ScriptOptions = {
    force: false,
    dryRun: false,
    limit: null,
    offset: 0,
    propertyNumber: null
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--force') {
      options.force = true;
    } else if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--limit' && i + 1 < args.length) {
      options.limit = parseInt(args[i + 1], 10);
      i++;
    } else if (arg === '--offset' && i + 1 < args.length) {
      options.offset = parseInt(args[i + 1], 10);
      i++;
    } else if (arg === '--property-number' && i + 1 < args.length) {
      options.propertyNumber = args[i + 1];
      i++;
    }
  }

  return options;
}

// 公開中物件のATBB状態リスト
const PUBLIC_ATBB_STATUSES = [
  '一般・公開中',
  '専任・公開中',
  '非公開（配信メールのみ）'
];

async function syncFavoriteComments() {
  const options = parseArgs();
  
  console.log('🚀 Starting favorite comment sync...\n');
  console.log('📋 Options:');
  console.log(`   Force: ${options.force}`);
  console.log(`   Dry Run: ${options.dryRun}`);
  console.log(`   Limit: ${options.limit || 'None'}`);
  console.log(`   Offset: ${options.offset}`);
  console.log(`   Property Number: ${options.propertyNumber || 'All'}\n`);
  
  if (options.dryRun) {
    console.log('⚠️ DRY RUN MODE - No data will be saved\n');
  }
  
  const propertyListingService = new PropertyListingService();
  const propertyDetailsService = new PropertyDetailsService();
  const favoriteCommentService = new FavoriteCommentService();
  
  try {
    let properties: any[] = [];
    
    // 特定の物件のみ処理する場合
    if (options.propertyNumber) {
      console.log(`📦 Fetching property ${options.propertyNumber}...`);
      const property = await propertyListingService.getByPropertyNumber(options.propertyNumber);
      
      if (!property) {
        console.error(`❌ Property ${options.propertyNumber} not found`);
        process.exit(1);
      }
      
      properties = [property];
    } else {
      // 公開中物件を取得
      console.log('📦 Fetching public properties...');
      
      const limit = options.limit || 1000;
      const { data, total } = await propertyListingService.getAll({
        limit,
        offset: options.offset,
        orderBy: 'created_at',
        orderDirection: 'desc'
      });
      
      // 公開中物件のみフィルタリング
      properties = data.filter(p => 
        p.atbb_status && PUBLIC_ATBB_STATUSES.includes(p.atbb_status)
      );
      
      console.log(`📊 Found ${properties.length} public properties (out of ${total} total, offset: ${options.offset})\n`);
    }
    
    // 統計情報
    let totalProcessed = 0;
    let totalSuccess = 0;
    let totalSkipped = 0;
    let totalFailed = 0;
    let totalNoData = 0;
    
    // 各物件を処理
    for (const property of properties) {
      try {
        console.log(`\n📝 Processing ${property.property_number} (${property.property_type})...`);
        
        // 既存データをチェック
        if (!options.force) {
          const existing = await propertyDetailsService.getPropertyDetails(property.property_number);
          
          if (existing.favorite_comment) {
            console.log(`   ⏭️ Skipped (already has favorite_comment)`);
            totalSkipped++;
            totalProcessed++;
            continue;
          }
        }
        
        // お気に入り文言を取得
        console.log(`   🔍 Fetching favorite comment from spreadsheet...`);
        const result = await favoriteCommentService.getFavoriteComment(property.id);
        
        if (!result.comment) {
          console.log(`   ⚠️ No favorite comment found`);
          totalNoData++;
          totalProcessed++;
          continue;
        }
        
        console.log(`   ✅ Found: "${result.comment.substring(0, 50)}${result.comment.length > 50 ? '...' : ''}"`);
        
        // データベースに保存
        if (!options.dryRun) {
          const success = await propertyDetailsService.upsertPropertyDetails(
            property.property_number,
            { favorite_comment: result.comment }
          );
          
          if (success) {
            console.log(`   💾 Saved to database`);
            totalSuccess++;
          } else {
            console.log(`   ❌ Failed to save to database`);
            totalFailed++;
          }
        } else {
          console.log(`   💾 Would save to database (dry run)`);
          totalSuccess++;
        }
        
        totalProcessed++;
        
        // Google Sheets APIのレート制限を考慮（200ms待機）
        await new Promise(resolve => setTimeout(resolve, 200));
        
      } catch (error: any) {
        console.error(`   ❌ Error processing ${property.property_number}:`, error.message);
        totalFailed++;
        totalProcessed++;
      }
    }
    
    // サマリーレポート
    console.log('\n\n' + '='.repeat(60));
    console.log('📊 SUMMARY REPORT');
    console.log('='.repeat(60));
    console.log(`Total Processed: ${totalProcessed}`);
    console.log(`✅ 成功: ${totalSuccess}件`);
    console.log(`⏭️ スキップ: ${totalSkipped}件`);
    console.log(`⚠️ データなし: ${totalNoData}件`);
    console.log(`❌ 失敗: ${totalFailed}件`);
    console.log('='.repeat(60));
    
    if (options.dryRun) {
      console.log('\n⚠️ This was a DRY RUN - no data was actually saved');
    }
    
    console.log('\n✅ Sync complete!');
    
  } catch (error: any) {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

// スクリプト実行
syncFavoriteComments();
