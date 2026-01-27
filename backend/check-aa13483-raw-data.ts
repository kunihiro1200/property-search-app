import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { decrypt } from './src/utils/encryption';

// .env.localファイルのパスを解決
const envPath = path.resolve(__dirname, '.env.local');
dotenv.config({ path: envPath });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ 環境変数が設定されていません');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkAA13483RawData() {
  console.log('=== AA13483 生データ確認 ===\n');

  try {
    // データベースからAA13483を取得
    const { data: seller, error } = await supabase
      .from('sellers')
      .select('seller_number, name, address, phone_number, email, updated_at')
      .eq('seller_number', 'AA13483')
      .single();

    if (error) {
      console.error('❌ エラー:', error);
      return;
    }

    if (!seller) {
      console.log('❌ AA13483が見つかりません');
      return;
    }

    console.log('📋 データベースの生データ:');
    console.log('  売主番号:', seller.seller_number);
    console.log('  氏名（生）:', seller.name);
    console.log('  住所（生）:', seller.address);
    console.log('  電話番号（生）:', seller.phone_number);
    console.log('  メールアドレス（生）:', seller.email);
    console.log('');

    // 復号化を試みる
    console.log('🔓 復号化後のデータ:');
    try {
      console.log('  氏名:', decrypt(seller.name || ''));
      console.log('  住所:', decrypt(seller.address || ''));
      console.log('  電話番号:', decrypt(seller.phone_number || ''));
      console.log('  メールアドレス:', decrypt(seller.email || ''));
    } catch (decryptError) {
      console.error('❌ 復号化エラー:', decryptError);
    }

    console.log('');
    console.log('📅 最終更新:', seller.updated_at);

  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
  }
}

checkAA13483RawData();
