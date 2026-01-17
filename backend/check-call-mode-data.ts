import { createClient } from '@supabase/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkCallModeData(sellerNumber: string) {
  console.log(`\n🔍 Checking call mode data for seller: ${sellerNumber}\n`);

  try {
    // Get seller data
    const { data: seller, error } = await supabase
      .from('sellers')
      .select('*')
      .eq('seller_number', sellerNumber)
      .single();

    if (error) {
      console.error('❌ Error fetching seller:', error);
      return;
    }

    if (!seller) {
      console.log('❌ Seller not found');
      return;
    }

    console.log('✅ Seller found:', seller.seller_number);
    console.log('\n📋 Call Mode Fields:\n');

    // 基本情報
    console.log('=== 基本情報 ===');
    console.log('売主番号:', seller.seller_number);
    console.log('氏名:', seller.name);
    console.log('電話番号:', seller.phone);
    console.log('住所:', seller.address);

    // 問い合わせ情報
    console.log('\n=== 問い合わせ情報 ===');
    console.log('問い合わせ日:', seller.inquiry_date);
    console.log('問い合わせ経路:', seller.inquiry_source);
    console.log('問い合わせ媒体:', seller.inquiry_medium);
    console.log('問い合わせ内容:', seller.inquiry_content);

    // 物件情報
    console.log('\n=== 物件情報 ===');
    console.log('物件種別:', seller.property_type);
    console.log('土地面積:', seller.land_area);
    console.log('建物面積:', seller.building_area);
    console.log('築年数:', seller.building_age);
    console.log('間取り:', seller.floor_plan);

    // 訪問予約情報
    console.log('\n=== 訪問予約情報 ===');
    console.log('訪問予定日:', seller.visit_date);
    console.log('訪問予定時刻:', seller.visit_time);
    console.log('営担:', seller.visit_assignee);
    console.log('訪問査定取得者:', seller.visit_valuation_acquirer);
    console.log('予約日:', seller.appointment_date);
    console.log('予約メモ:', seller.appointment_notes);

    // 査定情報
    console.log('\n=== 査定情報 ===');
    console.log('査定額:', seller.valuation_amount);
    console.log('査定日:', seller.valuation_date);
    console.log('査定担当者:', seller.valuation_assignee);

    // その他
    console.log('\n=== その他 ===');
    console.log('ステータス:', seller.status);
    console.log('売却理由:', seller.sale_reason);
    console.log('希望時期:', seller.desired_timing);
    console.log('売却希望価格:', seller.desired_price);
    console.log('備考:', seller.notes);

    // Check for null/empty fields
    console.log('\n⚠️ Empty Fields:');
    const emptyFields = [];
    for (const [key, value] of Object.entries(seller)) {
      if (value === null || value === '' || value === undefined) {
        emptyFields.push(key);
      }
    }
    
    if (emptyFields.length > 0) {
      console.log(emptyFields.join(', '));
    } else {
      console.log('None - all fields have values');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Get seller number from command line argument
const sellerNumber = process.argv[2];

if (!sellerNumber) {
  console.log('Usage: npx ts-node check-call-mode-data.ts <seller_number>');
  console.log('Example: npx ts-node check-call-mode-data.ts AA12903');
  process.exit(1);
}

checkCallModeData(sellerNumber);
