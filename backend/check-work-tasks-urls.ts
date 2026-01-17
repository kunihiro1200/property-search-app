/**
 * work_tasksテーブルのspreadsheet_url設定確認スクリプト
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkWorkTasksUrls(): Promise<void> {
  try {
    console.log('work_tasksテーブルのspreadsheet_url設定状況を確認中...\n');
    
    // サンプルデータを取得
    const { data: tasks, error } = await supabase
      .from('work_tasks')
      .select('property_number, spreadsheet_url')
      .limit(20);
    
    if (error) {
      console.error('エラー:', error.message);
      return;
    }
    
    if (!tasks || tasks.length === 0) {
      console.log('work_tasksテーブルにデータがありません');
      return;
    }
    
    let withUrl = 0;
    let withoutUrl = 0;
    
    console.log('='.repeat(80));
    console.log('サンプルデータ（最初の20件）');
    console.log('='.repeat(80));
    console.log('');
    
    for (const task of tasks) {
      console.log(`物件番号: ${task.property_number}`);
      
      if (task.spreadsheet_url) {
        withUrl++;
        console.log(`  spreadsheet_url: ✅ 設定あり`);
        console.log(`  URL: ${task.spreadsheet_url.substring(0, 60)}...`);
      } else {
        withoutUrl++;
        console.log(`  spreadsheet_url: ❌ 設定なし`);
      }
      console.log('');
    }
    
    console.log('='.repeat(80));
    console.log(`サマリー（サンプル20件中）`);
    console.log('='.repeat(80));
    console.log(`spreadsheet_url設定あり: ${withUrl}件`);
    console.log(`spreadsheet_url設定なし: ${withoutUrl}件`);
    console.log('');
    
    // 全体の統計を取得
    const { count: totalCount } = await supabase
      .from('work_tasks')
      .select('*', { count: 'exact', head: true });
    
    const { count: withUrlCount } = await supabase
      .from('work_tasks')
      .select('*', { count: 'exact', head: true })
      .not('spreadsheet_url', 'is', null);
    
    console.log('='.repeat(80));
    console.log('全体統計');
    console.log('='.repeat(80));
    console.log(`総work_tasks数: ${totalCount}件`);
    console.log(`spreadsheet_url設定あり: ${withUrlCount}件 (${Math.round((withUrlCount || 0) / (totalCount || 1) * 100)}%)`);
    console.log(`spreadsheet_url設定なし: ${(totalCount || 0) - (withUrlCount || 0)}件`);
    console.log('');
    
  } catch (error: any) {
    console.error('エラーが発生しました:', error.message);
  }
}

checkWorkTasksUrls();
