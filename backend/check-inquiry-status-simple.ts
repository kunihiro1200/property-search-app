import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkInquiryStatus() {
  console.log('📊 最新の問合せ状態を確認中...\n');

  try {
    const { data, error } = await supabase
      .from('property_inquiries')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) {
      console.error('❌ エラー:', error);
      return;
    }

    if (!data || data.length === 0) {
      console.log('❌ 問合せが見つかりません');
      return;
    }

    console.log(`✅ 最新の問合せ ${data.length} 件:\n`);

    data.forEach((inquiry, index) => {
      console.log(`${index + 1}. ${inquiry.name} (${inquiry.email})`);
      console.log(`   状態: ${inquiry.sheet_sync_status}`);
      console.log(`   買主番号: ${inquiry.buyer_number || '未設定'}`);
      console.log(`   作成日時: ${inquiry.created_at}`);
      console.log(`   物件番号: ${inquiry.property_number || '未設定'}`);
      console.log('');
    });

  } catch (error: any) {
    console.error('❌ エラー:', error.message);
  }
}

checkInquiryStatus();
