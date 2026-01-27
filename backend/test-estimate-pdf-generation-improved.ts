/**
 * 改善された概算書PDF生成のテスト
 * 
 * 実行方法:
 * npx ts-node test-estimate-pdf-generation-improved.ts
 */

import { PropertyService } from './src/services/PropertyService';

async function testEstimatePdfGeneration() {
  console.log('='.repeat(80));
  console.log('概算書PDF生成テスト（改善版）');
  console.log('='.repeat(80));
  console.log();

  const propertyService = new PropertyService();
  
  // テスト用の物件番号（実際の物件番号に置き換えてください）
  const testPropertyNumbers = [
    'AA13447',  // 既知の物件番号
    // 他の物件番号を追加できます
  ];

  for (const propertyNumber of testPropertyNumbers) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`物件番号: ${propertyNumber}`);
    console.log('='.repeat(80));
    
    const startTime = Date.now();
    
    try {
      console.log(`\n[${new Date().toISOString()}] PDF生成開始...`);
      
      const pdfUrl = await propertyService.generateEstimatePdf(propertyNumber);
      
      const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(2);
      
      console.log(`\n✅ 成功！`);
      console.log(`PDF URL: ${pdfUrl}`);
      console.log(`所要時間: ${elapsedTime}秒`);
      
      // URLの構造を確認
      if (pdfUrl.includes('spreadsheets')) {
        console.log(`\n📄 PDF URL構造:`);
        console.log(`  - スプレッドシートID: ${pdfUrl.match(/\/d\/([^\/]+)/)?.[1]}`);
        console.log(`  - シートID (gid): ${pdfUrl.match(/gid=(\d+)/)?.[1]}`);
        console.log(`  - ファイル名: ${decodeURIComponent(pdfUrl.match(/title=([^&]+)/)?.[1] || '')}`);
      }
      
    } catch (error: any) {
      const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(2);
      
      console.error(`\n❌ 失敗`);
      console.error(`エラーメッセージ: ${error.message}`);
      console.error(`所要時間: ${elapsedTime}秒`);
      
      if (error.stack) {
        console.error(`\nスタックトレース:`);
        console.error(error.stack);
      }
    }
  }
  
  console.log(`\n${'='.repeat(80)}`);
  console.log('テスト完了');
  console.log('='.repeat(80));
}

// 実行
testEstimatePdfGeneration().catch(console.error);
