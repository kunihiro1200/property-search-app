/**
 * スプレッドシートURL設定確認スクリプト
 * 
 * 公開物件のスプレッドシートURL設定状況を確認します
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// 環境変数を読み込み
dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkSpreadsheetUrls(): Promise<void> {
  try {
    console.log('スプレッドシートURL設定状況を確認中...\n');
    
    // 公開物件の統計を取得
    const { data: properties, error } = await supabase
      .from('property_listings')
      .select('property_type, storage_location');
    
    if (error) {
      console.error('データ取得エラー:', error.message);
      return;
    }
    
    console.log('='.repeat(80));
    console.log('公開物件のスプレッドシートURL設定状況');
    console.log('='.repeat(80));
    console.log('');
    
    // 物件タイプ別に集計
    const stats: Record<string, { total: number; withUrl: number }> = {};
    
    for (const property of properties || []) {
      const type = property.property_type;
      if (!stats[type]) {
        stats[type] = { total: 0, withUrl: 0 };
      }
      stats[type].total++;
      if (property.storage_location && property.storage_location.includes('/spreadsheets/d/')) {
        stats[type].withUrl++;
      }
    }
    
    let totalPublic = 0;
    let totalWithUrl = 0;
    
    for (const [type, stat] of Object.entries(stats)) {
      totalPublic += stat.total;
      totalWithUrl += stat.withUrl;
      
      console.log(`${type}:`);
      console.log(`  総数: ${stat.total}`);
      console.log(`  スプレッドシートURL: ${stat.withUrl} (${Math.round(stat.withUrl / stat.total * 100)}%)`);
      console.log('');
    }
    
    console.log('='.repeat(80));
    console.log(`総計: ${totalPublic}件の公開物件のうち、${totalWithUrl}件（${Math.round(totalWithUrl / totalPublic * 100)}%）にスプレッドシートURLが設定されています`);
    console.log('='.repeat(80));
    console.log('');
    
    // サンプル物件を表示（各タイプから1件ずつ）
    console.log('='.repeat(80));
    console.log('サンプル物件（各タイプから1件）');
    console.log('='.repeat(80));
    console.log('');
    
    const propertyTypes = ['土地', '戸建て', 'マンション'];
    
    for (const type of propertyTypes) {
      const { data: samples } = await supabase
        .from('property_listings')
        .select('id, property_number, property_type, storage_location')
        .eq('property_type', type)
        .limit(1);
      
      if (samples && samples.length > 0) {
        const sample = samples[0];
        console.log(`${type}:`);
        console.log(`  物件ID: ${sample.id}`);
        console.log(`  物件番号: ${sample.property_number}`);
        console.log(`  storage_location: ${sample.storage_location || 'なし'}`);
        
        // スプレッドシートURLの判定
        const hasSpreadsheetUrl = sample.storage_location && sample.storage_location.includes('/spreadsheets/d/');
        
        console.log(`  スプレッドシートURL: ${hasSpreadsheetUrl ? '✅ あり' : '❌ なし'}`);
        console.log('');
      } else {
        console.log(`${type}: サンプル物件が見つかりませんでした\n`);
      }
    }
    
    // 推奨事項
    console.log('='.repeat(80));
    console.log('推奨事項');
    console.log('='.repeat(80));
    console.log('');
    
    if (totalWithUrl < totalPublic) {
      console.log('⚠️  一部の公開物件にスプレッドシートURLが設定されていません');
      console.log('');
      console.log('対応方法:');
      console.log('  1. property_listings.storage_locationにスプレッドシートURLを設定');
      console.log('  2. または、work_tasks.spreadsheet_urlにスプレッドシートURLを設定');
      console.log('');
      console.log('スプレッドシートURLがない物件では、お気に入り文言とアピールポイントが表示されません。');
    } else {
      console.log('✅ すべての公開物件にスプレッドシートURLが設定されています');
    }
    
  } catch (error: any) {
    console.error('エラーが発生しました:', error.message);
  }
}

// 実行
checkSpreadsheetUrls();

