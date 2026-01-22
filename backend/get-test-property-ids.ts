/**
 * テスト用物件ID取得スクリプト
 * 
 * 各物件タイプ（土地、戸建て、マンション）から1件ずつ物件IDを取得します
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// 環境変数を読み込み
dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function getTestPropertyIds(): Promise<void> {
  try {
    console.log('テスト用物件IDを取得中...\n');
    
    // 各物件タイプから1件ずつ取得
    const propertyTypes = [
      { type: '土地', english: 'land' },
      { type: '戸建て', english: 'detached_house' },
      { type: 'マンション', english: 'apartment' }
    ];
    
    const propertyIds: string[] = [];
    
    for (const { type, english } of propertyTypes) {
      const { data, error } = await supabase
        .from('property_listings')
        .select('id, property_number, property_type, storage_location')
        .in('property_type', [type, english])
        .limit(1);
      
      if (error) {
        console.error(`${type}の取得エラー:`, error.message);
        continue;
      }
      
      if (data && data.length > 0) {
        const property = data[0];
        propertyIds.push(property.id);
        
        console.log(`${type}:`);
        console.log(`  物件ID: ${property.id}`);
        console.log(`  物件番号: ${property.property_number}`);
        console.log(`  物件タイプ: ${property.property_type}`);
        console.log(`  格納先URL: ${property.storage_location ? '設定あり' : '設定なし'}`);
        console.log('');
      } else {
        console.log(`${type}: 物件が見つかりませんでした\n`);
      }
    }
    
    if (propertyIds.length > 0) {
      console.log('='.repeat(60));
      console.log('診断スクリプト実行コマンド:');
      console.log('='.repeat(60));
      console.log(`\nバックエンド診断:`);
      console.log(`  cd backend`);
      console.log(`  TEST_PROPERTY_IDS="${propertyIds.join(',')}" npx ts-node diagnose-comments-display.ts`);
      console.log(`\nまたは:`);
      console.log(`  cd backend`);
      console.log(`  npx ts-node diagnose-comments-display.ts ${propertyIds.join(' ')}`);
      console.log(`\nフロントエンド診断:`);
      console.log(`  ブラウザで frontend/diagnose-comments-display.html を開く`);
      console.log(`  物件IDフィールドに以下を入力:`);
      console.log(`  ${propertyIds.join(', ')}`);
      console.log('');
    } else {
      console.log('⚠️  テスト用の物件が見つかりませんでした');
    }
    
  } catch (error: any) {
    console.error('エラーが発生しました:', error.message);
  }
}

// 実行
getTestPropertyIds();

