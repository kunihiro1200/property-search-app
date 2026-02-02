import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// .envファイルを読み込む
dotenv.config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkAA13530DB() {
  console.log('=== AA13530のデータベース状況を確認 ===\n');

  // データベースから取得
  const { data: seller, error } = await supabase
    .from('sellers')
    .select('*')
    .eq('seller_number', 'AA13530')
    .single();

  if (error) {
    console.error('❌ エラー:', error);
    return;
  }

  if (!seller) {
    console.log('❌ AA13530が見つかりません');
    return;
  }

  console.log('📊 データベースの状態:');
  console.log('売主番号:', seller.seller_number);
  console.log('コメント:', seller.comments || '(空)');
  console.log('コメントの長さ:', seller.comments ? seller.comments.length : 0);
  console.log('更新日時:', seller.updated_at);
  console.log('作成日時:', seller.created_at);
  console.log('');
  
  // 最近の更新履歴を確認
  console.log('📋 最近の更新履歴を確認中...');
  
  const { data: activities, error: activitiesError } = await supabase
    .from('activities')
    .select('*')
    .eq('seller_id', seller.id)
    .order('created_at', { ascending: false })
    .limit(5);
  
  if (activitiesError) {
    console.error('❌ アクティビティ取得エラー:', activitiesError);
  } else if (activities && activities.length > 0) {
    console.log('');
    console.log('最近のアクティビティ:');
    activities.forEach((activity, index) => {
      console.log(`${index + 1}. ${activity.activity_type} - ${activity.created_at}`);
      if (activity.details) {
        console.log(`   詳細: ${activity.details}`);
      }
    });
  } else {
    console.log('アクティビティなし');
  }
  
  console.log('');
  console.log('=== 結論 ===');
  if (!seller.comments || seller.comments.trim() === '') {
    console.log('❌ データベースのコメントが空です');
    console.log('');
    console.log('考えられる原因:');
    console.log('1. スプレッドシートからデータベースへの同期が実行されていない');
    console.log('2. スプレッドシートのコメントが空');
    console.log('3. 同期処理でコメント列がスキップされている');
    console.log('');
    console.log('次のステップ:');
    console.log('1. スプレッドシートを直接確認してコメントがあるか確認');
    console.log('2. 手動同期を実行: npx ts-node backend/sync-aa13530-manual.ts');
  } else {
    console.log('✅ データベースにコメントが存在します');
    console.log('コメント内容:', seller.comments);
  }
}

checkAA13530DB().catch(console.error);
