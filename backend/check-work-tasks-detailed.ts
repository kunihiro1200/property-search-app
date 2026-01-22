// 業務依頼の詳細確認
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

async function checkWorkTasks() {
  console.log('=== 業務依頼の詳細確認 ===\n');

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    // 1. 件数確認
    const { count, error: countError } = await supabase
      .from('work_tasks')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('❌ エラー:', countError);
      return;
    }

    console.log(`✅ 業務依頼数: ${count}件\n`);

    // 2. サンプルデータを取得（最初の10件）
    const { data: samples, error: samplesError } = await supabase
      .from('work_tasks')
      .select('*')
      .limit(10);

    if (samplesError) {
      console.error('❌ サンプルデータ取得エラー:', samplesError);
      return;
    }

    if (!samples || samples.length === 0) {
      console.log('⚠️ サンプルデータが見つかりません');
      return;
    }

    console.log('📊 最初の10件のサンプル:\n');
    for (const task of samples) {
      console.log(`物件番号: ${task.property_number || 'なし'}`);
      console.log(`  タスクタイプ: ${task.task_type || 'なし'}`);
      console.log(`  ステータス: ${task.status || 'なし'}`);
      console.log(`  担当者: ${task.assignee || 'なし'}`);
      console.log(`  作成日: ${task.created_at || 'なし'}`);
      console.log('');
    }

    // 3. テーブルスキーマを確認
    console.log('=== テーブルスキーマ確認 ===\n');
    if (samples.length > 0) {
      const firstTask = samples[0];
      console.log('カラム一覧:');
      for (const key of Object.keys(firstTask)) {
        console.log(`  - ${key}: ${typeof firstTask[key]}`);
      }
    }

  } catch (error: any) {
    console.error('❌ エラーが発生しました:', error.message);
  }
}

checkWorkTasks();
