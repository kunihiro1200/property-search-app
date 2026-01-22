/**
 * スタッフ管理スプレッドシートからemployeesテーブルにスタッフデータを同期
 */
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface StaffRow {
  'スタッフID': string;
  'イニシャル': string;
  '名字': string;
  '姓名': string;
  'メアド': string;
  'Chat webhook': string;
  '電話番号': string;
  '有効': string;
  '通常': string;
  [key: string]: any;
}

async function syncStaffFromSpreadsheet() {
  console.log('🔄 スタッフ管理スプレッドシートから同期開始...\n');

  const spreadsheetId = '19yAuVYQRm-_zhjYX7M7zjiGbnBibkG77Mpz93sN1xxs';
  const sheetName = 'スタッフ';

  const sheetsClient = new GoogleSheetsClient({
    spreadsheetId,
    sheetName,
    serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json',
  });

  await sheetsClient.authenticate();

  // データを取得
  console.log('📊 スプレッドシートからデータを取得中...');
  const range = `${sheetName}!A2:T1000`; // ヘッダー行をスキップ
  const response = await sheetsClient['sheets'].spreadsheets.values.get({
    spreadsheetId,
    range,
  });

  const rows = response.data.values || [];
  console.log(`✅ ${rows.length} 行のデータを取得しました\n`);

  // ヘッダー行を取得
  const headers = await sheetsClient.getHeaders();

  let syncedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  for (const row of rows) {
    try {
      // 行データをオブジェクトに変換
      const staffData: any = {};
      headers.forEach((header, index) => {
        staffData[header] = row[index] || '';
      });

      const staffRow = staffData as StaffRow;

      // 必須フィールドのチェック
      if (!staffRow['イニシャル'] || !staffRow['姓名']) {
        console.log(`⏭️  スキップ: イニシャルまたは姓名が空です`);
        skippedCount++;
        continue;
      }

      // 「通常」フラグがTRUEのスタッフのみを同期
      const isActive = staffRow['通常'] === 'TRUE' || staffRow['通常'] === 'true';
      if (!isActive) {
        console.log(`⏭️  スキップ: ${staffRow['姓名']} (通常フラグがfalse)`);
        skippedCount++;
        continue;
      }

      // employeesテーブルに挿入/更新
      const employeeData = {
        email: staffRow['メアド'] || null,
        name: staffRow['姓名'],
        initials: staffRow['イニシャル'],
        is_active: true,
        role: 'staff', // デフォルトロール
      };

      console.log(`📝 同期中: ${employeeData.name} (${employeeData.initials})`);

      // メールアドレスがある場合はメールで検索、ない場合はイニシャルで検索
      let existingEmployee = null;
      if (employeeData.email) {
        const { data } = await supabase
          .from('employees')
          .select('*')
          .eq('email', employeeData.email)
          .single();
        existingEmployee = data;
      }

      if (!existingEmployee && employeeData.initials) {
        const { data } = await supabase
          .from('employees')
          .select('*')
          .eq('initials', employeeData.initials)
          .single();
        existingEmployee = data;
      }

      if (existingEmployee) {
        // 更新
        const { error } = await supabase
          .from('employees')
          .update(employeeData)
          .eq('id', existingEmployee.id);

        if (error) {
          console.error(`❌ 更新エラー: ${employeeData.name}`, error.message);
          errorCount++;
        } else {
          console.log(`✅ 更新完了: ${employeeData.name}`);
          syncedCount++;
        }
      } else {
        // 新規挿入
        const { error } = await supabase
          .from('employees')
          .insert(employeeData);

        if (error) {
          console.error(`❌ 挿入エラー: ${employeeData.name}`, error.message);
          errorCount++;
        } else {
          console.log(`✅ 挿入完了: ${employeeData.name}`);
          syncedCount++;
        }
      }
    } catch (error: any) {
      console.error(`❌ エラー:`, error.message);
      errorCount++;
    }
  }

  console.log('\n📊 同期結果:');
  console.log(`  ✅ 同期成功: ${syncedCount} 件`);
  console.log(`  ⏭️  スキップ: ${skippedCount} 件`);
  console.log(`  ❌ エラー: ${errorCount} 件`);

  // 最終確認
  const { data: allEmployees, error } = await supabase
    .from('employees')
    .select('*')
    .eq('is_active', true)
    .order('name');

  if (error) {
    console.error('❌ 従業員一覧の取得エラー:', error.message);
  } else {
    console.log(`\n👥 アクティブなスタッフ: ${allEmployees?.length || 0} 人`);
    allEmployees?.forEach((emp: any) => {
      console.log(`  - ${emp.name} (${emp.initials}) - ${emp.email || 'メールなし'}`);
    });
  }
}

syncStaffFromSpreadsheet().catch(console.error);
