import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// 環境変数を読み込み
dotenv.config({ path: '.env' });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkPropertyTypeSync() {
  console.log('業務リストのproperty_type同期状況を確認中...\n');

  try {
    // AA12495のデータを取得
    const { data, error } = await supabase
      .from('work_tasks')
      .select('property_number, property_type, property_address, seller_name')
      .eq('property_number', 'AA12495')
      .single();

    if (error) {
      console.error('エラー:', error.message);
      return;
    }

    if (!data) {
      console.log('AA12495のデータが見つかりません');
      return;
    }

    console.log('=== AA12495のデータ ===');
    console.log('物件番号:', data.property_number);
    console.log('種別:', data.property_type || '(空)');
    console.log('物件所在:', data.property_address || '(空)');
    console.log('売主:', data.seller_name || '(空)');
    console.log('');

    if (!data.property_type) {
      console.log('⚠️ property_typeが空です。スプレッドシートから同期する必要があります。');
    } else {
      console.log('✅ property_typeが正しく同期されています。');
    }

  } catch (error) {
    console.error('予期しないエラー:', error);
  }
}

checkPropertyTypeSync();
