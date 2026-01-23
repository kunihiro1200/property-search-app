import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import path from 'path';

// .envファイルのパスを明示的に指定
dotenv.config({ path: path.join(__dirname, '.env') });

async function checkInquirySyncStatus() {
  console.log('🔍 問合せの同期状態を確認中...\n');

  const supabaseUrl = process.env.SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // 最新の問合せを10件取得
    const { data: inquiries, error } = await supabase
      .from('property_inquiries')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('❌ データベースエラー:', error);
      return;
    }

    if (!inquiries || inquiries.length === 0) {
      console.log('❌ 問合せデータが見つかりません');
      return;
    }

    console.log(`✅ 最新の問合せ ${inquiries.length} 件:\n`);

    inquiries.forEach((inquiry, index) => {
      console.log(`--- 問合せ ${index + 1} ---`);
      console.log(`ID: ${inquiry.id}`);
      console.log(`名前: ${inquiry.name}`);
      console.log(`メール: ${inquiry.email}`);
      console.log(`電話: ${inquiry.phone}`);
      console.log(`物件ID: ${inquiry.property_id || '(なし)'}`);
      console.log(`同期状態: ${inquiry.sheet_sync_status || '(未設定)'}`);
      console.log(`再試行回数: ${inquiry.sync_retry_count || 0}`);
      console.log(`作成日時: ${inquiry.created_at}`);
      console.log('');
    });

    // 同期失敗の問合せを確認
    const failedInquiries = inquiries.filter(
      (i) => i.sheet_sync_status === 'failed'
    );

    if (failedInquiries.length > 0) {
      console.log(`⚠️ 同期失敗: ${failedInquiries.length} 件`);
      failedInquiries.forEach((inquiry) => {
        console.log(`  - ${inquiry.name} (${inquiry.created_at})`);
      });
    }

    // 同期待ちの問合せを確認
    const pendingInquiries = inquiries.filter(
      (i) => i.sheet_sync_status === 'pending'
    );

    if (pendingInquiries.length > 0) {
      console.log(`⏳ 同期待ち: ${pendingInquiries.length} 件`);
      pendingInquiries.forEach((inquiry) => {
        console.log(`  - ${inquiry.name} (${inquiry.created_at})`);
      });
    }

    // 同期成功の問合せを確認
    const syncedInquiries = inquiries.filter(
      (i) => i.sheet_sync_status === 'synced'
    );

    if (syncedInquiries.length > 0) {
      console.log(`✅ 同期成功: ${syncedInquiries.length} 件`);
    }
  } catch (error: any) {
    console.error('❌ エラー:', error.message);
  }
}

checkInquirySyncStatus();
