// 物件リストと業務依頼の状況確認
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

async function checkStatus() {
  console.log('=== 物件リストと業務依頼の状況確認 ===\n');

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    // 物件リスト (property_listings) の確認
    console.log('📊 物件リスト (property_listings) の確認...');
    const { count: propertyCount, error: propertyError } = await supabase
      .from('property_listings')
      .select('*', { count: 'exact', head: true });

    if (propertyError) {
      console.error('❌ 物件リストの取得エラー:', propertyError);
    } else {
      console.log(`✅ 物件数: ${propertyCount}件`);
      
      // サンプルデータを取得
      const { data: propertySamples } = await supabase
        .from('property_listings')
        .select('property_number, address, atbb_status')
        .limit(5);
      
      if (propertySamples && propertySamples.length > 0) {
        console.log('最初の5件のサンプル:');
        for (const prop of propertySamples) {
          console.log(`  - ${prop.property_number}: ${prop.address || '住所なし'} (${prop.atbb_status || '状態なし'})`);
        }
      }
    }

    console.log('');

    // 業務依頼 (work_tasks) の確認
    console.log('📊 業務依頼 (work_tasks) の確認...');
    const { count: workTaskCount, error: workTaskError } = await supabase
      .from('work_tasks')
      .select('*', { count: 'exact', head: true });

    if (workTaskError) {
      console.error('❌ 業務依頼の取得エラー:', workTaskError);
      console.log('エラー詳細:', JSON.stringify(workTaskError, null, 2));
    } else {
      console.log(`✅ 業務依頼数: ${workTaskCount}件`);
      
      // サンプルデータを取得
      const { data: workTaskSamples } = await supabase
        .from('work_tasks')
        .select('property_number, task_type, status')
        .limit(5);
      
      if (workTaskSamples && workTaskSamples.length > 0) {
        console.log('最初の5件のサンプル:');
        for (const task of workTaskSamples) {
          console.log(`  - ${task.property_number}: ${task.task_type || 'タイプなし'} (${task.status || '状態なし'})`);
        }
      } else {
        console.log('⚠️ 業務依頼データが見つかりません');
      }
    }

    console.log('');

    // 買主リスト (buyers) の確認
    console.log('📊 買主リスト (buyers) の確認...');
    const { count: buyerCount, error: buyerError } = await supabase
      .from('buyers')
      .select('*', { count: 'exact', head: true });

    if (buyerError) {
      console.error('❌ 買主リストの取得エラー:', buyerError);
    } else {
      console.log(`✅ 買主数: ${buyerCount}件`);
    }

    console.log('');
    console.log('=== サマリー ===');
    console.log(`物件: ${propertyCount || 0}件`);
    console.log(`業務依頼: ${workTaskCount || 0}件`);
    console.log(`買主: ${buyerCount || 0}件`);

  } catch (error: any) {
    console.error('❌ エラーが発生しました:', error.message);
  }
}

checkStatus();
