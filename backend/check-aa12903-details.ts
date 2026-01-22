import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';
import { decrypt } from './src/utils/encryption';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAA12903Details() {
  console.log('🔍 AA12903のデータを確認中...\n');

  try {
    // データベースから取得
    console.log('📊 データベースから取得中...');
    const { data: dbSeller, error: dbError } = await supabase
      .from('sellers')
      .select('*')
      .eq('seller_number', 'AA12903')
      .single();

    if (dbError || !dbSeller) {
      console.error('❌ データベースエラー:', dbError);
      return;
    }

    console.log('\n=== データベースのデータ ===');
    console.log(`売主番号: ${dbSeller.seller_number}`);
    console.log(`名前: ${dbSeller.name ? decrypt(dbSeller.name) : 'null'}`);
    console.log(`状況（当社）: "${dbSeller.status}"`);
    console.log(`サイト: "${dbSeller.inquiry_site}"`);
    console.log(`反響日付: "${dbSeller.inquiry_date}"`);
    console.log(`確度: "${dbSeller.confidence}"`);
    console.log(`次電日: "${dbSeller.next_call_date}"`);
    console.log(`契約年月: "${dbSeller.contract_year_month}"`);
    console.log(`競合名: "${dbSeller.competitor_name}"`);
    console.log(`競合名、理由: "${dbSeller.competitor_name_and_reason}"`);
    console.log(`専任・他決要因: "${dbSeller.exclusive_other_decision_factor}"`);

    // スプレッドシートから取得
    console.log('\n📊 スプレッドシートから取得中...');
    const sheetsConfig = {
      spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID!,
      sheetName: process.env.GOOGLE_SHEETS_SHEET_NAME || '売主リスト',
      serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH!,
    };
    
    const sheetsClient = new GoogleSheetsClient(sheetsConfig);
    await sheetsClient.authenticate();

    const allRows = await sheetsClient.readAll();
    const sheetRow = allRows.find(row => row['売主番号'] === 'AA12903');

    if (!sheetRow) {
      console.error('❌ スプレッドシートにAA12903が見つかりません');
      return;
    }

    console.log('\n=== スプレッドシートのデータ ===');
    console.log(`売主番号: ${sheetRow['売主番号']}`);
    console.log(`名前: "${sheetRow['名前(漢字のみ）']}"`);
    console.log(`状況（当社）: "${sheetRow['状況（当社）']}"`);
    console.log(`サイト: "${sheetRow['サイト']}"`);
    console.log(`反響日付: "${sheetRow['反響日付']}"`);
    console.log(`確度: "${sheetRow['確度']}"`);
    console.log(`次電日: "${sheetRow['次電日']}"`);
    console.log(`契約年月 他決は分かった時点: "${sheetRow['契約年月 他決は分かった時点']}"`);
    console.log(`競合名: "${sheetRow['競合名']}"`);
    console.log(`競合名、理由（他決、専任）: "${sheetRow['競合名、理由\n（他決、専任）']}"`);
    console.log(`専任・他決要因: "${sheetRow['専任・他決要因']}"`);

    // 差分を表示
    console.log('\n=== 差分 ===');
    if (dbSeller.status !== sheetRow['状況（当社）']) {
      console.log(`❌ 状況（当社）: DB="${dbSeller.status}" vs スプシ="${sheetRow['状況（当社）']}"`);
    } else {
      console.log(`✅ 状況（当社）: 一致`);
    }

    if (dbSeller.inquiry_site !== sheetRow['サイト']) {
      console.log(`❌ サイト: DB="${dbSeller.inquiry_site}" vs スプシ="${sheetRow['サイト']}"`);
    } else {
      console.log(`✅ サイト: 一致`);
    }

    if (dbSeller.inquiry_date !== sheetRow['反響日付']) {
      console.log(`❌ 反響日付: DB="${dbSeller.inquiry_date}" vs スプシ="${sheetRow['反響日付']}"`);
    } else {
      console.log(`✅ 反響日付: 一致`);
    }

    if (dbSeller.confidence !== sheetRow['確度']) {
      console.log(`❌ 確度: DB="${dbSeller.confidence}" vs スプシ="${sheetRow['確度']}"`);
    } else {
      console.log(`✅ 確度: 一致`);
    }

    if (dbSeller.next_call_date !== sheetRow['次電日']) {
      console.log(`❌ 次電日: DB="${dbSeller.next_call_date}" vs スプシ="${sheetRow['次電日']}"`);
    } else {
      console.log(`✅ 次電日: 一致`);
    }

  } catch (error) {
    console.error('❌ エラー:', error);
  }
}

checkAA12903Details().catch(console.error);
