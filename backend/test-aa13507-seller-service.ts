import * as dotenv from 'dotenv';
import * as path from 'path';
import { SellerService } from './src/services/SellerService.supabase';
import { createClient } from '@supabase/supabase-js';

// .env.localを読み込む
dotenv.config({ path: path.join(__dirname, '.env.local') });

async function testAA13507SellerService() {
  console.log('🧪 AA13507のSellerServiceをテスト中...\n');

  try {
    // 1. まずSupabaseでIDを取得
    console.log('📋 ステップ1: AA13507のIDを取得...');
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );

    const { data: sellerData, error: fetchError } = await supabase
      .from('sellers')
      .select('id, seller_number')
      .eq('seller_number', 'AA13507')
      .single();

    if (fetchError || !sellerData) {
      console.log('❌ AA13507が見つかりません:', fetchError?.message);
      return;
    }

    console.log('✅ ID:', sellerData.id, '\n');

    // 2. SellerServiceで取得
    console.log('📋 ステップ2: SellerServiceで取得...');
    const sellerService = new SellerService();
    const seller = await sellerService.getSeller(sellerData.id);

    if (!seller) {
      console.log('❌ SellerServiceで取得できませんでした');
      return;
    }

    console.log('✅ 売主データを取得しました\n');

    // 3. データを確認
    console.log('📊 SellerServiceのレスポンス:');
    console.log('売主番号:', seller.sellerNumber);
    console.log('名前:', seller.name);
    console.log('電話担当（任意）:', seller.phoneContactPerson || '【空】');
    console.log('連絡取りやすい日、時間帯:', seller.preferredContactTime || '【空】');
    console.log('連絡方法:', seller.contactMethod || '【空】');
    console.log('');

    // 4. 判定
    if (seller.phoneContactPerson) {
      console.log('✅ phoneContactPersonが正しく返されています');
      console.log(`   値: "${seller.phoneContactPerson}"`);
    } else {
      console.log('❌ phoneContactPersonが返されていません');
    }

  } catch (error: any) {
    console.error('❌ エラー:', error.message);
    console.error('スタックトレース:', error.stack);
  }
}

testAA13507SellerService();
