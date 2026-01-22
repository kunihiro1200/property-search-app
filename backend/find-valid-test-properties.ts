/**
 * work_tasksとproperty_listingsの両方に存在する物件を検索
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function findValidTestProperties(): Promise<void> {
  try {
    console.log('work_tasksとproperty_listingsの両方に存在する物件を検索中...\n');
    
    // work_tasksから物件番号を取得（spreadsheet_urlがあるもの）
    const { data: workTasks, error: workTasksError } = await supabase
      .from('work_tasks')
      .select('property_number, spreadsheet_url')
      .not('spreadsheet_url', 'is', null)
      .limit(100);
    
    if (workTasksError || !workTasks) {
      console.error('work_tasks取得エラー:', workTasksError?.message);
      return;
    }
    
    const propertyNumbers = workTasks.map(t => t.property_number);
    
    // property_listingsから該当する物件を検索
    const { data: properties, error: propertiesError } = await supabase
      .from('property_listings')
      .select('id, property_number, property_type, storage_location')
      .in('property_number', propertyNumbers);
    
    if (propertiesError || !properties) {
      console.error('property_listings取得エラー:', propertiesError?.message);
      return;
    }
    
    console.log('='.repeat(80));
    console.log(`見つかった物件: ${properties.length}件`);
    console.log('='.repeat(80));
    console.log('');
    
    // 物件タイプ別に分類
    const byType: Record<string, any[]> = {};
    
    for (const property of properties) {
      const type = property.property_type;
      if (!byType[type]) {
        byType[type] = [];
      }
      byType[type].push(property);
    }
    
    // 各タイプから1件ずつ選択
    const selectedProperties: any[] = [];
    const targetTypes = ['土地', 'land', '戸建て', '戸建', 'detached_house', 'マンション', 'apartment'];
    
    for (const type of targetTypes) {
      if (byType[type] && byType[type].length > 0) {
        const property = byType[type][0];
        
        // 既に同じカテゴリの物件が選択されていないか確認
        const normalizedType = type.includes('land') || type === '土地' ? 'land' :
                              type.includes('detached') || type.includes('戸建') ? 'detached_house' :
                              type.includes('apartment') || type === 'マンション' ? 'apartment' : type;
        
        const alreadySelected = selectedProperties.some(p => {
          const pType = p.property_type.includes('land') || p.property_type === '土地' ? 'land' :
                       p.property_type.includes('detached') || p.property_type.includes('戸建') ? 'detached_house' :
                       p.property_type.includes('apartment') || p.property_type === 'マンション' ? 'apartment' : p.property_type;
          return pType === normalizedType;
        });
        
        if (!alreadySelected) {
          selectedProperties.push(property);
        }
      }
    }
    
    if (selectedProperties.length === 0) {
      console.log('❌ 該当する物件が見つかりませんでした');
      return;
    }
    
    console.log('テスト用物件（各タイプから1件）:\n');
    
    const propertyIds: string[] = [];
    
    for (const property of selectedProperties) {
      console.log(`物件タイプ: ${property.property_type}`);
      console.log(`  物件ID: ${property.id}`);
      console.log(`  物件番号: ${property.property_number}`);
      console.log(`  storage_location: ${property.storage_location ? '設定あり' : '設定なし'}`);
      
      // work_tasksからspreadsheet_urlを確認
      const workTask = workTasks.find(t => t.property_number === property.property_number);
      if (workTask) {
        console.log(`  work_tasks.spreadsheet_url: ✅ あり`);
        console.log(`  URL: ${workTask.spreadsheet_url.substring(0, 60)}...`);
      }
      
      console.log('');
      propertyIds.push(property.id);
    }
    
    if (propertyIds.length > 0) {
      console.log('='.repeat(80));
      console.log('診断スクリプト実行コマンド:');
      console.log('='.repeat(80));
      console.log(`\nバックエンド診断:`);
      console.log(`  cd backend`);
      console.log(`  npx ts-node diagnose-comments-display.ts ${propertyIds.join(' ')}`);
      console.log(`\nフロントエンド診断:`);
      console.log(`  ブラウザで frontend/diagnose-comments-display.html を開く`);
      console.log(`  物件IDフィールドに以下を入力:`);
      console.log(`  ${propertyIds.join(', ')}`);
      console.log('');
    }
    
  } catch (error: any) {
    console.error('エラーが発生しました:', error.message);
  }
}

findValidTestProperties();
