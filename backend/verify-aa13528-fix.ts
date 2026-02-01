/**
 * AA13528の修正を確認するスクリプト
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '.env.local') });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function main() {
  console.log('🔍 AA13528の修正を確認します...\n');

  const { data, error } = await supabase
    .from('sellers')
    .select('seller_number, current_status, inquiry_date, inquiry_year, status')
    .eq('seller_number', 'AA13528')
    .single();

  if (error) {
    console.error('❌ エラー:', error.message);
    return;
  }

  console.log('📊 AA13528のデータベース状態:');
  console.log('  seller_number:', data.seller_number);
  console.log('  current_status (状況売主):', data.current_status);
  console.log('  inquiry_date (反響日付):', data.inquiry_date);
  console.log('  inquiry_year (反響年):', data.inquiry_year);
  console.log('  status (状況当社):', data.status);
  
  // 確認
  console.log('\n✅ 確認結果:');
  console.log('  current_status が設定されている:', data.current_status ? '✅' : '❌');
  console.log('  inquiry_date が設定されている:', data.inquiry_date ? '✅' : '❌');
}

main().catch(console.error);
