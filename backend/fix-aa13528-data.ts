/**
 * AA13528のデータを手動で修正
 * 
 * 問題:
 * - inquiry_date: null
 * - seller_situation: null
 * 
 * 修正:
 * - inquiry_year=2026なので、inquiry_dateを2026-02-01に設定（反響日付が不明なため、次電日と同じ日付を使用）
 * - seller_situationはスプレッドシートから取得する必要があるが、APIクォータ制限のため後で同期
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function fix() {
  console.log('=== AA13528のデータ修正 ===\n');
  
  // 現在の状態を確認
  const { data: before, error: beforeError } = await supabase
    .from('sellers')
    .select('seller_number, inquiry_date, inquiry_year, seller_situation, current_status, next_call_date')
    .eq('seller_number', 'AA13528')
    .single();
  
  if (beforeError) {
    console.log('Error:', beforeError.message);
    return;
  }
  
  console.log('修正前:');
  console.log('  inquiry_date:', before.inquiry_date);
  console.log('  inquiry_year:', before.inquiry_year);
  console.log('  seller_situation:', before.seller_situation);
  console.log('  current_status:', before.current_status);
  console.log('  next_call_date:', before.next_call_date);
  
  // inquiry_dateを設定（inquiry_year=2026なので、2026-02-01を使用）
  // 注意: 正確な反響日付はスプレッドシートから取得する必要がある
  const { error: updateError } = await supabase
    .from('sellers')
    .update({
      inquiry_date: '2026-02-01', // 暫定的に次電日と同じ日付を使用
    })
    .eq('seller_number', 'AA13528');
  
  if (updateError) {
    console.log('Update Error:', updateError.message);
    return;
  }
  
  // 修正後の状態を確認
  const { data: after, error: afterError } = await supabase
    .from('sellers')
    .select('seller_number, inquiry_date, inquiry_year, seller_situation, current_status, next_call_date')
    .eq('seller_number', 'AA13528')
    .single();
  
  if (afterError) {
    console.log('Error:', afterError.message);
    return;
  }
  
  console.log('\n修正後:');
  console.log('  inquiry_date:', after.inquiry_date);
  console.log('  inquiry_year:', after.inquiry_year);
  console.log('  seller_situation:', after.seller_situation);
  console.log('  current_status:', after.current_status);
  console.log('  next_call_date:', after.next_call_date);
  
  console.log('\n✅ AA13528のinquiry_dateを修正しました');
  console.log('⚠️ seller_situationはスプレッドシートから取得する必要があります（APIクォータ制限のため後で同期）');
}

fix();
