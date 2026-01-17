// 買主6648を安全に同期（長いフィールドを除外）
import { config } from 'dotenv';
import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';
import * as path from 'path';
import { BuyerColumnMapper } from './src/services/BuyerColumnMapper';

config();

const SPREADSHEET_ID = '1tI_iXaiLuWBggs5y0RH7qzkbHs9wnLLdRekAmjkhcLY';
const SHEET_NAME = '買主リスト';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

// 50文字を超える可能性のあるフィールドを除外
const FIELDS_TO_EXCLUDE = [
  'inquiry_hearing',
  'past_inquiry_comment_property',
  'past_latest_confidence',
  'past_viewing_properties',
  'past_personal_info',
  'past_desired_conditions',
  'pre_viewing_notes',
  'price_reduction_history',
  'viewing_result_follow_up',
  'latest_status',
  'special_notes',
  'viewing_survey_response',
  'message_to_assignee',
  'confirmation_to_assignee',
  'offer_comment',
  'offer_lost_comment',
  'key_info',
  'sale_reason',
  'viewing_notes',
  'viewing_inquiry_progress',
  'no_response_after_inquiry',
  'no_response_offer_exists',
  'no_property_inquiry_pinrich',
  'email_confirmation_mail',
  'minpaku_inquiry',
  'document_request_email_house',
  'document_request_email_land_no_permission',
  'document_request_email_land_permission',
  'viewing_reason',
  'family_composition',
  'must_have_points',
  'liked_points',
  'disliked_points',
  'purchase_obstacles',
  'closing',
  'preferred_contact_time',
  'next_action',
  'pre_approval',
  'viewing_survey_result',
  'b_customer_follow_up',
  'renovation_history',
  'other_property_hearing',
  'owned_home_hearing_inquiry',
  'owned_home_hearing_result',
  'valuation_not_needed_reason',
  'pre_viewing_hearing'
];

async function syncBuyer6648Safe() {
  try {
    console.log('=== 買主6648を安全に同期（長いフィールドを除外） ===\n');

    const auth = new google.auth.GoogleAuth({
      keyFile: path.join(__dirname, 'google-service-account.json'),
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    // ヘッダー取得
    console.log('1. ヘッダーを取得中...');
    const headerResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${SHEET_NAME}'!1:1`,
    });
    const headers = headerResponse.data.values?.[0] || [];
    console.log(`   ✓ ${headers.length}個のカラム\n`);

    // データ取得
    console.log('2. 買主6648のデータを取得中...');
    const dataResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${SHEET_NAME}'!A2:GZ`,
    });
    const rows = dataResponse.data.values || [];
    
    const buyerNumberIndex = headers.findIndex(h => h === '買主番号');
    const buyer6648Row = rows.find(row => row[buyerNumberIndex] === '6648');

    if (!buyer6648Row) {
      console.log('   ✗ 買主6648が見つかりません');
      return;
    }
    console.log('   ✓ 買主6648を発見\n');

    // マッピング
    console.log('3. データをマッピング中...');
    const mapper = new BuyerColumnMapper();
    const fullData = mapper.mapSpreadsheetToDatabase(headers, buyer6648Row);
    
    // 長いフィールドを除外
    const safeData: any = {};
    for (const [key, value] of Object.entries(fullData)) {
      if (!FIELDS_TO_EXCLUDE.includes(key)) {
        safeData[key] = value;
      }
    }
    
    console.log('   マッピング結果（物件詳細フィールド）:');
    console.log(`   - buyer_number: "${safeData.buyer_number}"`);
    console.log(`   - name: "${safeData.name}"`);
    console.log(`   - property_number: "${safeData.property_number}"`);
    console.log(`   - display_address: "${safeData.display_address}"`);
    console.log(`   - price: "${safeData.price}"`);
    console.log(`   - property_address: "${safeData.property_address}"`);
    console.log(`   - building_name_price: "${safeData.building_name_price}"`);
    console.log(`\n   除外したフィールド数: ${FIELDS_TO_EXCLUDE.length}`);
    console.log('');

    // データベースに挿入
    console.log('4. データベースに挿入中...');
    const { data: inserted, error } = await supabase
      .from('buyers')
      .upsert(safeData, { onConflict: 'buyer_number' })
      .select();

    if (error) {
      console.log(`   ✗ エラー: ${error.message}`);
      console.log(`   詳細: ${JSON.stringify(error, null, 2)}`);
    } else {
      console.log(`   ✓ 成功！`);
      if (inserted && inserted.length > 0) {
        console.log(`   ID: ${inserted[0].id}`);
      }
    }

  } catch (error: any) {
    console.error('\nエラー:', error.message);
  }
}

syncBuyer6648Safe();
