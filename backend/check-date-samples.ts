import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDateSamples() {
  console.log('🔍 日付フィールドのサンプルを確認中...\n');

  try {
    // Check records with dates that were likely year 2001
    const { data: sellers, error } = await supabase
      .from('sellers')
      .select('seller_number, inquiry_date, next_call_date')
      .not('inquiry_date', 'is', null)
      .order('seller_number')
      .limit(10);

    if (error) {
      console.error('❌ エラー:', error);
      return;
    }

    console.log('=== 最初の10件の日付フィールド ===\n');
    sellers?.forEach(seller => {
      console.log(`${seller.seller_number}:`);
      console.log(`  反響日付: ${seller.inquiry_date}`);
      console.log(`  次電日: ${seller.next_call_date}`);
    });

    // Check AA12903 specifically
    const { data: aa12903 } = await supabase
      .from('sellers')
      .select('seller_number, inquiry_date, next_call_date, status, inquiry_site, confidence')
      .eq('seller_number', 'AA12903')
      .single();

    if (aa12903) {
      console.log('\n=== AA12903 ===');
      console.log(`状況（当社）: "${aa12903.status}"`);
      console.log(`サイト: "${aa12903.inquiry_site}"`);
      console.log(`反響日付: "${aa12903.inquiry_date}"`);
      console.log(`確度: "${aa12903.confidence}"`);
      console.log(`次電日: "${aa12903.next_call_date}"`);
    }

  } catch (error) {
    console.error('❌ エラー:', error);
  }
}

checkDateSamples().catch(console.error);
