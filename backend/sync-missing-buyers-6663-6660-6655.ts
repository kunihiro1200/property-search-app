/**
 * 買主番号 6663, 6660, 6655 を同期するスクリプト
 */
import { createClient } from '@supabase/supabase-js';
import { google } from 'googleapis';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

dotenv.config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function getGoogleSheetsClient() {
  const auth = new google.auth.GoogleAuth({
    keyFile: path.join(__dirname, 'google-service-account.json'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
  return google.sheets({ version: 'v4', auth });
}

async function syncMissingBuyers() {
  const targetBuyerNos = ['6663', '6660', '6655'];
  
  console.log('='.repeat(60));
  console.log('買主番号 6663, 6660, 6655 を同期');
  console.log('='.repeat(60));
  
  try {
    const sheets = await getGoogleSheetsClient();
    const spreadsheetId = process.env.GOOGLE_SHEETS_BUYER_SPREADSHEET_ID;
    
    // 全データを取得
    const dataResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: '買主リスト!A1:BZ10000',
    });
    const allRows = dataResponse.data.values || [];
    const dataRows = allRows.slice(1);
    
    console.log(`\n総データ行数: ${dataRows.length}`);
    
    for (const targetNo of targetBuyerNos) {
      console.log(`\n--- 買主番号 ${targetNo} を処理中 ---`);
      
      // スプレッドシートから該当行を探す
      let foundRow: string[] | null = null;
      let rowIndex = -1;
      
      for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i];
        const buyerNo = String(row[4] || '').trim(); // E列
        
        if (buyerNo === targetNo) {
          foundRow = row;
          rowIndex = i + 2; // 1-indexed + header
          break;
        }
      }
      
      if (!foundRow) {
        console.log(`  スプレッドシートに見つかりません`);
        continue;
      }
      
      console.log(`  スプレッドシート行 ${rowIndex} で発見`);
      
      // データベースに既に存在するか確認
      const { data: existing } = await supabase
        .from('buyers')
        .select('id')
        .eq('buyer_number', targetNo)
        .single();
      
      if (existing) {
        console.log(`  既にデータベースに存在します (id: ${existing.id})`);
        continue;
      }
      
      // 新しい買主データを作成（正しいカラム名を使用）
      const buyerData: Record<string, any> = {
        id: uuidv4(),
        is_deleted: foundRow[0] || null,           // A列: 削除
        created_datetime: foundRow[1] || null,     // B列: 作成日時
        initial_assignee: foundRow[2] || null,     // C列: 初動担当
        buyer_id: foundRow[3] || null,             // D列: 買主ID
        buyer_number: foundRow[4] || null,         // E列: 買主番号
        reception_date: foundRow[5] || null,       // F列: 受付日
        name: foundRow[6] || null,                 // G列: 氏名
        building_name_price: foundRow[7] || null,  // H列: 建物名/価格
        latest_viewing_date: foundRow[8] || null,  // I列: 内覧日
        desired_timing: foundRow[9] || null,       // J列: 希望時期
        follow_up_assignee: foundRow[10] || null,  // K列: 後続担当
        re_inquiry_viewing: foundRow[11] || null,  // L列: 再問合
        inquiry_hearing: foundRow[12] || null,     // M列: 問合時ヒアリング
        viewing_result_follow_up: foundRow[13] || null, // N列: 内覧結果
        inquiry_confidence: foundRow[14] || null,  // O列: 問合時確度
        latest_status: foundRow[15] || null,       // P列: 最新状況
        distribution_type: foundRow[16] || null,   // Q列: 配信種別
        next_call_date: foundRow[17] || null,      // R列: 次電日
        pinrich: foundRow[18] || null,             // S列: Pinrich
        desired_area: foundRow[19] || null,        // T列: エリア
        desired_property_type: foundRow[20] || null, // U列: 希望種別
        post_viewing_seller_contact: foundRow[21] || null, // V列: 内覧後売主連絡
        desired_building_age: foundRow[22] || null, // W列: 築年数
        desired_floor_plan: foundRow[23] || null,  // X列: 間取り
        hot_spring_required: foundRow[24] || null, // Y列: 温泉あり
        parking_spaces: foundRow[25] || null,      // Z列: P台数
        monthly_parking_ok: foundRow[26] || null,  // AA列
        garden_required: foundRow[27] || null,     // AB列
        good_view_required: foundRow[28] || null,  // AC列
        pet_allowed_required: foundRow[29] || null, // AD列
        high_floor_required: foundRow[30] || null, // AE列
        corner_room_required: foundRow[31] || null, // AF列
        viewing_sheet: foundRow[32] || null,       // AG列
        line_id: foundRow[33] || null,             // AH列
        nickname: foundRow[34] || null,            // AI列
        phone_number: foundRow[35] || null,        // AJ列: 電話番号
        email: foundRow[36] || null,               // AK列: メアド
        inquiry_source: foundRow[37] || null,      // AL列: 問合せ元
        current_residence: foundRow[38] || null,   // AM列
        athome_url: foundRow[39] || null,          // AN列
        past_viewing_1: foundRow[40] || null,      // AO列
        past_viewing_2: foundRow[41] || null,      // AP列
        past_viewing_3: foundRow[42] || null,      // AQ列
        campaign_date: foundRow[43] || null,       // AR列
        phone_duplicate_count: foundRow[44] || null, // AS列
        property_number: foundRow[45] || null,     // AT列: 物件番号
        property_assignee: foundRow[46] || null,   // AU列
        last_synced_at: new Date().toISOString(),
      };
      
      console.log(`  データ準備完了:`);
      console.log(`    buyer_id: ${buyerData.buyer_id}`);
      console.log(`    buyer_number: ${buyerData.buyer_number}`);
      console.log(`    name: ${buyerData.name}`);
      console.log(`    email: ${buyerData.email}`);
      console.log(`    phone_number: ${buyerData.phone_number}`);
      console.log(`    property_number: ${buyerData.property_number}`);
      console.log(`    initial_assignee: ${buyerData.initial_assignee}`);
      
      // データベースに挿入
      const { error: insertError } = await supabase
        .from('buyers')
        .insert(buyerData);
      
      if (insertError) {
        console.log(`  ❌ 挿入エラー: ${insertError.message}`);
        console.log(`     詳細: ${JSON.stringify(insertError)}`);
      } else {
        console.log(`  ✓ 同期成功!`);
      }
    }
    
    // 確認
    console.log('\n' + '='.repeat(60));
    console.log('【同期後の確認】');
    
    for (const targetNo of targetBuyerNos) {
      const { data: buyer } = await supabase
        .from('buyers')
        .select('id, buyer_id, buyer_number, name, email, phone_number, property_number')
        .eq('buyer_number', targetNo)
        .single();
      
      if (buyer) {
        console.log(`\n✓ 買主番号 ${targetNo}: 同期済み`);
        console.log(`  id: ${buyer.id}`);
        console.log(`  buyer_id: ${buyer.buyer_id}`);
        console.log(`  name: ${buyer.name}`);
      } else {
        console.log(`\n✗ 買主番号 ${targetNo}: 同期されていません`);
      }
    }
    
  } catch (error) {
    console.error('エラー:', error);
  }
}

syncMissingBuyers().catch(console.error);
