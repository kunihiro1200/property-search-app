/**
 * バッチ処理で物件リスト同期を実行（300件目から）
 */

async function runBatchSync() {
  const baseUrl = 'https://property-site-frontend-kappa.vercel.app';
  const batchSize = 100;
  let startIndex = 300; // 300件目から開始
  let totalProcessed = 0;
  let totalAdded = 0;
  let totalUpdated = 0;
  let totalFailed = 0;
  
  console.log('🔄 Starting batch sync from index 300...');
  console.log(`📊 Batch size: ${batchSize}`);
  console.log('');
  
  while (true) {
    console.log(`📦 Processing batch: ${startIndex}-${startIndex + batchSize}`);
    
    try {
      const url = `${baseUrl}/api/cron/sync-property-listings?batchSize=${batchSize}&startIndex=${startIndex}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        console.error(`❌ HTTP error: ${response.status} ${response.statusText}`);
        break;
      }
      
      const result = await response.json();
      
      console.log(`✅ Batch completed:`, {
        processed: result.totalProcessed,
        added: result.successfullyAdded,
        updated: result.successfullyUpdated,
        failed: result.failed,
        duration: result.duration,
      });
      
      totalProcessed += result.totalProcessed;
      totalAdded += result.successfullyAdded;
      totalUpdated += result.successfullyUpdated;
      totalFailed += result.failed;
      
      // 処理した件数が0の場合、全件処理完了
      if (result.totalProcessed === 0) {
        console.log('');
        console.log('🎉 All batches completed!');
        break;
      }
      
      // 次のバッチへ
      startIndex = result.nextStartIndex;
      
      // 1秒待機（API制限対策）
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error: any) {
      console.error(`❌ Error in batch ${startIndex}:`, error.message);
      break;
    }
  }
  
  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('📊 Total Summary:');
  console.log(`   Total processed: ${totalProcessed}`);
  console.log(`   ✅ Added: ${totalAdded}`);
  console.log(`   ✅ Updated: ${totalUpdated}`);
  console.log(`   ❌ Failed: ${totalFailed}`);
  console.log('═══════════════════════════════════════════════════════════');
}

runBatchSync().catch(console.error);
