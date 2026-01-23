import dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';

// .envファイルのパスを明示的に指定
dotenv.config({ path: path.join(__dirname, '.env') });

async function retryFailedInquirySync() {
  console.log('🔄 失敗した問合せを再同期中...\n');

  const supabaseUrl = process.env.SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // 同期失敗の問合せを取得
    const { data: failedInquiries, error } = await supabase
      .from('property_inquiries')
      .select('*')
      .eq('sheet_sync_status', 'failed')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ データベースエラー:', error);
      return;
    }

    if (!failedInquiries || failedInquiries.length === 0) {
      console.log('✅ 同期失敗の問合せはありません');
      return;
    }

    console.log(`📊 同期失敗の問合せ: ${failedInquiries.length} 件\n`);

    // GoogleSheetsClientを初期化
    const sheetsClient = new GoogleSheetsClient({
      spreadsheetId: process.env.GOOGLE_SHEETS_BUYER_SPREADSHEET_ID!,
      sheetName: process.env.GOOGLE_SHEETS_BUYER_SHEET_NAME || '買主リスト',
      serviceAccountKeyPath: './google-service-account.json',
    });

    await sheetsClient.authenticate();
    console.log('✅ Google Sheets認証成功\n');

    // 買主番号を採番するために全行を取得
    const allRows = await sheetsClient.readAll();
    const columnEValues = allRows
      .map(row => row['買主番号'])
      .filter(value => value !== null && value !== undefined)
      .map(value => String(value));

    let maxNumber = columnEValues.length > 0
      ? Math.max(...columnEValues.map(v => parseInt(v) || 0))
      : 0;

    console.log(`📊 現在の最大買主番号: ${maxNumber}\n`);

    // 各問合せを同期
    let successCount = 0;
    let failCount = 0;

    for (const inquiry of failedInquiries) {
      try {
        console.log(`🔄 同期中: ${inquiry.name} (${inquiry.email})`);

        // 買主番号を採番
        maxNumber++;
        const buyerNumber = maxNumber;

        // 物件番号を取得
        let propertyNumber = null;
        if (inquiry.property_id) {
          const { data: property } = await supabase
            .from('property_listings')
            .select('property_number')
            .eq('id', inquiry.property_id)
            .single();

          if (property) {
            propertyNumber = property.property_number;
          }
        }

        // 電話番号を正規化
        const normalizedPhone = inquiry.phone.replace(/[^0-9]/g, '');

        // 現在時刻をJST（日本時間）で取得
        const nowUtc = new Date(inquiry.created_at);
        const jstDate = new Date(nowUtc.getTime() + 9 * 60 * 60 * 1000);
        const jstDateString = jstDate.toISOString().replace('T', ' ').substring(0, 19);

        // 受付日（今日の日付、YYYY/MM/DD形式）
        const receptionDate = jstDate.toISOString().substring(0, 10).replace(/-/g, '/');

        // スプレッドシートに追加
        const rowData = {
          '買主番号': buyerNumber.toString(),
          '作成日時': jstDateString, // JST変換済み
          '●氏名・会社名': inquiry.name,
          '●問合時ヒアリング': inquiry.message,
          '●電話番号\n（ハイフン不要）': normalizedPhone,
          '受付日': receptionDate,
          '●メアド': inquiry.email,
          '●問合せ元': 'いふう独自サイト',
          '物件番号': propertyNumber || '',
          '【問合メール】電話対応': '未',
        };

        await sheetsClient.appendRow(rowData);

        // 同期成功をデータベースに記録
        await supabase
          .from('property_inquiries')
          .update({ sheet_sync_status: 'synced' })
          .eq('id', inquiry.id);

        console.log(`  ✅ 成功 (買主番号: ${buyerNumber})`);
        successCount++;
      } catch (error: any) {
        console.error(`  ❌ 失敗: ${error.message}`);
        failCount++;
      }

      console.log('');
    }

    console.log('📊 結果:');
    console.log(`  成功: ${successCount} 件`);
    console.log(`  失敗: ${failCount} 件`);
  } catch (error: any) {
    console.error('❌ エラー:', error.message);
    if (error.stack) {
      console.error('スタックトレース:', error.stack);
    }
  }
}

retryFailedInquirySync();
