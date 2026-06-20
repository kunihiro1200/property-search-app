import dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';

// .envファイルのパスを明示的に指定
dotenv.config({ path: path.join(__dirname, '.env') });

async function testInquirySyncWithJST() {
  console.log('🧪 問合せ同期テスト（JST変換あり）\n');

  const supabaseUrl = process.env.SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // pending状態の問合せを取得（最大5件）
    const { data: pendingInquiries, error: fetchError } = await supabase
      .from('property_inquiries')
      .select('*')
      .eq('sheet_sync_status', 'pending')
      .order('created_at', { ascending: true })
      .limit(5);

    if (fetchError) {
      console.error('❌ データベースエラー:', fetchError);
      return;
    }

    if (!pendingInquiries || pendingInquiries.length === 0) {
      console.log('✅ 同期待ちの問合せはありません');
      console.log('\n📊 最新の問合せを確認します...\n');

      // 最新の問合せを5件取得
      const { data: latestInquiries } = await supabase
        .from('property_inquiries')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      if (latestInquiries && latestInquiries.length > 0) {
        latestInquiries.forEach((inquiry, index) => {
          console.log(`--- 問合せ ${index + 1} ---`);
          console.log(`名前: ${inquiry.name}`);
          console.log(`同期状態: ${inquiry.sheet_sync_status}`);
          console.log(`作成日時 (UTC): ${inquiry.created_at}`);
          
          // JST変換
          const utcDate = new Date(inquiry.created_at);
          const jstDate = new Date(utcDate.getTime() + 9 * 60 * 60 * 1000);
          const jstDateString = jstDate.toISOString().replace('T', ' ').substring(0, 19);
          console.log(`作成日時 (JST): ${jstDateString}`);
          console.log('');
        });
      }
      return;
    }

    console.log(`📊 同期待ちの問合せ: ${pendingInquiries.length} 件\n`);

    // GoogleSheetsClientを初期化
    const sheetsClient = new GoogleSheetsClient({
      spreadsheetId: process.env.GOOGLE_SHEETS_BUYER_SPREADSHEET_ID!,
      sheetName: process.env.GOOGLE_SHEETS_BUYER_SHEET_NAME || '買主リスト',
      serviceAccountKeyPath: './google-service-account.json',
    });

    await sheetsClient.authenticate();
    console.log('✅ Google Sheets認証成功\n');

    // 最大買主番号を取得（データベースから）
    const { data: latestInquiry } = await supabase
      .from('property_inquiries')
      .select('buyer_number')
      .not('buyer_number', 'is', null)
      .order('buyer_number', { ascending: false })
      .limit(1)
      .single();

    let nextBuyerNumber = latestInquiry?.buyer_number ? latestInquiry.buyer_number + 1 : 1;
    console.log(`📊 次の買主番号: ${nextBuyerNumber}\n`);

    // 各問合せを同期
    let syncedCount = 0;
    let failedCount = 0;

    for (const inquiry of pendingInquiries) {
      try {
        console.log(`🔄 同期中: ${inquiry.name} (${inquiry.email})`);
        console.log(`  作成日時 (UTC): ${inquiry.created_at}`);

        // 電話番号を正規化
        const normalizedPhone = inquiry.phone.replace(/[^0-9]/g, '');

        // 現在時刻をJST（日本時間）で取得
        const nowUtc = new Date(inquiry.created_at);
        const jstDate = new Date(nowUtc.getTime() + 9 * 60 * 60 * 1000);
        const jstDateString = jstDate.toISOString().replace('T', ' ').substring(0, 19);
        
        console.log(`  作成日時 (JST): ${jstDateString}`);

        // スプレッドシートに追加
        const rowData = {
          '買主番号': nextBuyerNumber.toString(),
          '作成日時': jstDateString, // JST変換済み
          '●氏名・会社名': inquiry.name,
          '●問合時ヒアリング': inquiry.message,
          '●電話番号\n（ハイフン不要）': normalizedPhone,
          '●メアド': inquiry.email,
          '●問合せ元': 'いふう独自サイト',
          '物件番号': inquiry.property_number || '',
          '【問合メール】電話対応': '未',
        };

        await sheetsClient.appendRow(rowData);

        // データベースを更新
        await supabase
          .from('property_inquiries')
          .update({
            sheet_sync_status: 'synced',
            buyer_number: nextBuyerNumber
          })
          .eq('id', inquiry.id);

        console.log(`  ✅ 成功 (買主番号: ${nextBuyerNumber})\n`);
        syncedCount++;
        nextBuyerNumber++;

      } catch (error: any) {
        console.error(`  ❌ 失敗: ${error.message}\n`);

        // 失敗をデータベースに記録
        await supabase
          .from('property_inquiries')
          .update({
            sheet_sync_status: 'failed',
            sync_retry_count: (inquiry.sync_retry_count || 0) + 1
          })
          .eq('id', inquiry.id);

        failedCount++;
      }
    }

    console.log('📊 結果:');
    console.log(`  成功: ${syncedCount} 件`);
    console.log(`  失敗: ${failedCount} 件`);

  } catch (error: any) {
    console.error('❌ エラー:', error.message);
    if (error.stack) {
      console.error('スタックトレース:', error.stack);
    }
  }
}

testInquirySyncWithJST();
