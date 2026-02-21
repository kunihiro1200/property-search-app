/**
 * 全物件のsidebar_statusを計算して更新するスクリプト
 */
import { createClient } from '@supabase/supabase-js';
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';
import * as dotenv from 'dotenv';

// .envファイルを読み込み
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// PropertyListingSyncServiceから必要なメソッドをコピー
function lookupGyomuList(
  propertyNumber: string,
  gyomuListData: any[],
  columnName: string
): any {
  const row = gyomuListData.find(r => r['物件番号'] === propertyNumber);
  return row ? row[columnName] : null;
}

function isDateBeforeOrToday(dateValue: any): boolean {
  if (!dateValue) return false;
  const date = parseDate(dateValue);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date <= today;
}

function isDateBeforeYesterday(dateValue: any): boolean {
  if (!dateValue) return false;
  const date = parseDate(dateValue);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);
  return date <= yesterday;
}

function parseDate(dateValue: any): Date {
  // シリアル値の場合（数値）
  if (typeof dateValue === 'number') {
    const excelEpoch = new Date(1899, 11, 30);
    return new Date(excelEpoch.getTime() + dateValue * 86400000);
  }

  // 文字列の場合
  return new Date(dateValue);
}

function getAssigneeStatus(assignee: string): string {
  const mapping = loadStaffMapping();
  return mapping[assignee] || '専任・公開中';
}

function loadStaffMapping(): Record<string, string> {
  return {
    '山本': 'Y専任公開中',
    '生野': '生・専任公開中',
    '久': '久・専任公開中',
    '裏': 'U専任公開中',
    '林': '林・専任公開中',
    '国広': 'K専任公開中',
    '木村': 'R専任公開中',
    '角井': 'I専任公開中',
  };
}

function calculateSidebarStatus(row: any, gyomuListData: any[]): string {
  const propertyNumber = String(row['物件番号'] || '');
  const atbbStatus = String(row['atbb成約済み/非公開'] || '');

  // ① 未報告（最優先）
  const reportDate = row['報告日'];
  if (reportDate && isDateBeforeOrToday(reportDate)) {
    const assignee = row['報告担当_override'] || row['報告担当'] || '';
    return assignee ? `未報告 ${assignee}` : '未報告';
  }

  // ② 未完了
  if (row['確認'] === '未') {
    return '未完了';
  }

  // ③ 非公開予定（確認後）
  if (row['一般媒介非公開（仮）'] === '非公開予定') {
    return '非公開予定（確認後）';
  }

  // ④ 一般媒介の掲載確認未
  if (row['１社掲載'] === '未確認') {
    return '一般媒介の掲載確認未';
  }

  // ⑤ 本日公開予定
  if (atbbStatus.includes('公開前')) {
    const scheduledDate = lookupGyomuList(propertyNumber, gyomuListData, '公開予定日');
    if (scheduledDate && isDateBeforeOrToday(scheduledDate)) {
      return '本日公開予定';
    }
  }

  // ⑥ SUUMO / レインズ登録必要
  if (atbbStatus === '一般・公開中' || atbbStatus === '専任・公開中') {
    const scheduledDate = lookupGyomuList(propertyNumber, gyomuListData, '公開予定日');
    const suumoUrl = row['Suumo URL'];
    const suumoRegistration = row['Suumo登録'];

    if (scheduledDate &&
        isDateBeforeYesterday(scheduledDate) &&
        !suumoUrl &&
        suumoRegistration !== 'S不要') {
      return atbbStatus === '一般・公開中'
        ? 'SUUMO URL　要登録'
        : 'レインズ登録＋SUUMO登録';
    }
  }

  // ⑦ 買付申込み（内覧なし）２
  const kaitsukeStatus = row['買付'];
  if (
    (kaitsukeStatus === '専任片手' && atbbStatus === '専任・公開中') ||
    (kaitsukeStatus === '一般他決' && atbbStatus === '一般・公開中') ||
    (kaitsukeStatus === '専任両手' && atbbStatus === '専任・公開中') ||
    (kaitsukeStatus === '一般両手' && atbbStatus === '一般・公開中') ||
    (kaitsukeStatus === '一般片手' && atbbStatus === '一般・公開中')
  ) {
    return '買付申込み（内覧なし）２';
  }

  // ⑧ 公開前情報
  if (atbbStatus === '一般・公開前' || atbbStatus === '専任・公開前') {
    return '公開前情報';
  }

  // ⑨ 非公開（配信メールのみ）
  if (atbbStatus === '非公開（配信メールのみ）') {
    return '非公開（配信メールのみ）';
  }

  // ⑩ 一般公開中物件
  if (atbbStatus === '一般・公開中') {
    return '一般公開中物件';
  }

  // ⑪ 専任・公開中（担当別）
  if (atbbStatus === '専任・公開中') {
    const assignee = row['担当名（営業）'];
    return getAssigneeStatus(assignee);
  }

  // ⑫ それ以外
  return '';
}

async function syncAllSidebarStatus() {
  console.log('🔄 Starting sidebar status sync for all properties...\n');

  try {
    // 1. 物件リストスプレッドシートを読み取り
    console.log('📋 Reading property list spreadsheet...');
    const propertyListSpreadsheetId = process.env.PROPERTY_LIST_SPREADSHEET_ID;
    const propertyListSheetName = process.env.PROPERTY_LIST_SHEET_NAME || '物件';

    if (!propertyListSpreadsheetId) {
      throw new Error('PROPERTY_LIST_SPREADSHEET_ID not configured');
    }

    const propertyListClient = new GoogleSheetsClient({
      spreadsheetId: propertyListSpreadsheetId,
      sheetName: propertyListSheetName,
      serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json',
    });
    await propertyListClient.authenticate();
    const propertyListData = await propertyListClient.readAll();
    console.log(`✅ Fetched ${propertyListData.length} rows from property list`);

    // 2. 業務依頼シートを読み取り
    console.log('📋 Reading gyomu list spreadsheet...');
    const gyomuListSpreadsheetId = process.env.GYOMU_LIST_SPREADSHEET_ID;
    const gyomuListSheetName = process.env.GYOMU_LIST_SHEET_NAME || '業務依頼';

    let gyomuListData: any[] = [];
    if (gyomuListSpreadsheetId) {
      const gyomuListClient = new GoogleSheetsClient({
        spreadsheetId: gyomuListSpreadsheetId,
        sheetName: gyomuListSheetName,
        serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json',
      });
      await gyomuListClient.authenticate();
      gyomuListData = await gyomuListClient.readAll();
      console.log(`✅ Fetched ${gyomuListData.length} rows from gyomu list`);
    } else {
      console.warn('⚠️ GYOMU_LIST_SPREADSHEET_ID not configured, some statuses may be incomplete');
    }

    // 3. 各物件のステータスを計算してDBに保存
    console.log('\n🔄 Calculating and updating sidebar status...');
    let updated = 0;
    let failed = 0;

    for (const row of propertyListData) {
      const propertyNumber = String(row['物件番号'] || '').trim();
      if (!propertyNumber) continue;

      try {
        // ステータスを計算
        const sidebarStatus = calculateSidebarStatus(row, gyomuListData);

        // DBに保存
        const { error } = await supabase
          .from('property_listings')
          .update({
            sidebar_status: sidebarStatus,
            updated_at: new Date().toISOString()
          })
          .eq('property_number', propertyNumber);

        if (error) {
          console.error(`❌ [${propertyNumber}] Failed to update:`, error.message);
          failed++;
        } else {
          updated++;
          if (updated % 100 === 0) {
            console.log(`  Progress: ${updated} properties updated...`);
          }
        }
      } catch (error: any) {
        console.error(`❌ [${propertyNumber}] Error:`, error.message);
        failed++;
      }
    }

    console.log('\n📊 Sync Summary:');
    console.log(`  Total: ${propertyListData.length}`);
    console.log(`  Updated: ${updated}`);
    console.log(`  Failed: ${failed}`);

  } catch (error: any) {
    console.error('❌ Sync failed:', error.message);
    throw error;
  }
}

syncAllSidebarStatus()
  .then(() => {
    console.log('\n✅ Sync complete');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
