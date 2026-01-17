/**
 * 全案件の状況（売主）フィールドの同期状態を確認するスクリプト
 * 
 * 目的:
 * 1. スプレッドシートに状況（売主）が設定されているが、DBに反映されていない案件を特定
 * 2. 問題の規模を把握
 * 3. 根本原因を分析
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

interface MismatchRecord {
  sellerNumber: string;
  sheetValue: string;
  dbValue: string | null;
  sellerId: string;
  propertyId: string;
}

async function checkAllSellerSituationSync() {
  console.log('=== 全案件の状況（売主）同期状態確認 ===\n');
  console.log('開始時刻:', new Date().toISOString());

  // 1. スプレッドシートから全データを取得
  console.log('\n【1. スプレッドシートからデータ取得】');
  let sheetData: any[] = [];
  
  try {
    const sheetsConfig = {
      spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID!,
      sheetName: process.env.GOOGLE_SHEETS_SHEET_NAME || '売主リスト',
      serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json',
    };
    
    const sheetsClient = new GoogleSheetsClient(sheetsConfig);
    await sheetsClient.authenticate();
    
    sheetData = await sheetsClient.readAll();
    console.log(`スプレッドシート行数: ${sheetData.length}`);
  } catch (error: any) {
    console.error('スプレッドシート取得エラー:', error.message);
    return;
  }

  // 2. 状況（売主）が設定されている行を抽出
  const rowsWithSituation = sheetData.filter(row => {
    const situation = row['状況（売主）'];
    return situation && String(situation).trim() !== '';
  });
  console.log(`状況（売主）が設定されている行数: ${rowsWithSituation.length}`);

  // 3. DBから全売主と物件を取得
  console.log('\n【2. DBからデータ取得】');
  const { data: sellers, error: sellersError } = await supabase
    .from('sellers')
    .select('id, seller_number');

  if (sellersError) {
    console.error('売主取得エラー:', sellersError.message);
    return;
  }
  console.log(`DB売主数: ${sellers?.length || 0}`);

  // 売主番号→IDのマップを作成
  const sellerMap = new Map<string, string>();
  sellers?.forEach(s => {
    sellerMap.set(s.seller_number, s.id);
  });

  // 4. 全物件を取得
  const { data: properties, error: propsError } = await supabase
    .from('properties')
    .select('id, seller_id, seller_situation');

  if (propsError) {
    console.error('物件取得エラー:', propsError.message);
    return;
  }
  console.log(`DB物件数: ${properties?.length || 0}`);

  // seller_id→物件のマップを作成
  const propertyMap = new Map<string, any>();
  properties?.forEach(p => {
    propertyMap.set(p.seller_id, p);
  });

  // 5. 不一致を検出
  console.log('\n【3. 不一致検出】');
  const mismatches: MismatchRecord[] = [];
  const noProperty: string[] = [];
  const noSeller: string[] = [];

  for (const row of rowsWithSituation) {
    const sellerNumber = row['売主番号'];
    const sheetSituation = String(row['状況（売主）']).trim();
    
    if (!sellerNumber) continue;

    const sellerId = sellerMap.get(sellerNumber);
    if (!sellerId) {
      noSeller.push(sellerNumber);
      continue;
    }

    const property = propertyMap.get(sellerId);
    if (!property) {
      noProperty.push(sellerNumber);
      continue;
    }

    const dbSituation = property.seller_situation;
    
    // 不一致をチェック
    if (sheetSituation !== dbSituation) {
      mismatches.push({
        sellerNumber,
        sheetValue: sheetSituation,
        dbValue: dbSituation,
        sellerId,
        propertyId: property.id,
      });
    }
  }

  // 6. 結果を表示
  console.log('\n=== 結果サマリー ===');
  console.log(`スプレッドシートで状況（売主）が設定されている案件: ${rowsWithSituation.length}件`);
  console.log(`DBに売主が存在しない案件: ${noSeller.length}件`);
  console.log(`DBに物件が存在しない案件: ${noProperty.length}件`);
  console.log(`状況（売主）が不一致の案件: ${mismatches.length}件`);

  if (mismatches.length > 0) {
    console.log('\n=== 不一致の詳細（最大50件表示） ===');
    const displayMismatches = mismatches.slice(0, 50);
    displayMismatches.forEach((m, i) => {
      console.log(`${i + 1}. ${m.sellerNumber}: シート="${m.sheetValue}" / DB="${m.dbValue || '未設定'}"`);
    });

    if (mismatches.length > 50) {
      console.log(`... 他 ${mismatches.length - 50}件`);
    }
  }

  if (noProperty.length > 0 && noProperty.length <= 20) {
    console.log('\n=== 物件が存在しない案件 ===');
    noProperty.forEach(sn => console.log(`  - ${sn}`));
  }

  // 7. 統計情報
  console.log('\n=== 統計情報 ===');
  const situationCounts: Record<string, number> = {};
  rowsWithSituation.forEach(row => {
    const situation = String(row['状況（売主）']).trim();
    situationCounts[situation] = (situationCounts[situation] || 0) + 1;
  });
  console.log('スプレッドシートの状況（売主）の分布:');
  Object.entries(situationCounts).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => {
    console.log(`  ${k}: ${v}件`);
  });

  // 8. 修正が必要な案件のリストを返す
  console.log('\n終了時刻:', new Date().toISOString());
  
  return {
    mismatches,
    noProperty,
    noSeller,
    total: rowsWithSituation.length,
  };
}

checkAllSellerSituationSync().catch(console.error);
