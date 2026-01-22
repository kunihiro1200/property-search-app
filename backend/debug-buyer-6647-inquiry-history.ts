import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// 明示的に.envファイルのパスを指定
dotenv.config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function debugBuyer6647InquiryHistory() {
  console.log('=== 買主6647の問合せ履歴デバッグ ===\n');

  // 1. 買主6647の基本情報を取得（buyer_numberで検索）
  const { data: buyers, error: buyerError } = await supabase
    .from('buyers')
    .select('*')
    .eq('buyer_number', '6647');

  if (buyerError || !buyers || buyers.length === 0) {
    console.error('買主6647の取得エラー:', buyerError || '買主が見つかりません');
    return;
  }

  const buyer = buyers[0];
  console.log('買主6647の基本情報:');
  console.log('- ID:', buyer.id);
  console.log('- 買主番号:', buyer.buyer_number);
  console.log('- 名前:', buyer.name);
  console.log('- メール:', buyer.email);
  console.log('- 電話:', buyer.phone_number);
  console.log('\n');

  // 2. 同じメールアドレスを持つ全ての買主を取得
  if (buyer.email) {
    const { data: duplicateBuyers, error: dupError } = await supabase
      .from('buyers')
      .select('id, buyer_number, name, email, phone_number, property_number, inquiry_date, inquiry_source, latest_status')
      .eq('email', buyer.email)
      .order('id', { ascending: true });

    if (dupError) {
      console.error('重複買主の取得エラー:', dupError);
    } else {
      console.log(`同じメールアドレス(${buyer.email})を持つ買主:`, duplicateBuyers.length, '件');
      duplicateBuyers.forEach((b, index) => {
        console.log(`\n${index + 1}. 買主ID: ${b.id}, 買主番号: ${b.buyer_number}`);
        console.log('   名前:', b.name);
        console.log('   物件番号:', b.property_number);
        console.log('   問合せ日:', b.inquiry_date);
        console.log('   問合せ元:', b.inquiry_source);
        console.log('   最新状況:', b.latest_status?.substring(0, 50));
      });
      console.log('\n');
    }
  }

  // 3. 同じ電話番号を持つ全ての買主を取得
  if (buyer.phone_number) {
    const { data: duplicateByPhone, error: phoneError } = await supabase
      .from('buyers')
      .select('id, buyer_number, name, email, phone_number, property_number, inquiry_date, inquiry_source, latest_status')
      .eq('phone_number', buyer.phone_number)
      .order('id', { ascending: true });

    if (phoneError) {
      console.error('電話番号での重複買主の取得エラー:', phoneError);
    } else {
      console.log(`同じ電話番号(${buyer.phone_number})を持つ買主:`, duplicateByPhone.length, '件');
      duplicateByPhone.forEach((b, index) => {
        console.log(`\n${index + 1}. 買主ID: ${b.id}, 買主番号: ${b.buyer_number}`);
        console.log('   名前:', b.name);
        console.log('   メール:', b.email);
        console.log('   物件番号:', b.property_number);
        console.log('   問合せ日:', b.inquiry_date);
        console.log('   問合せ元:', b.inquiry_source);
        console.log('   最新状況:', b.latest_status?.substring(0, 50));
      });
      console.log('\n');
    }
  }

  // 4. email_historyテーブルを確認
  const { data: emailHistory, error: emailError } = await supabase
    .from('email_history')
    .select('*')
    .eq('buyer_id', buyer.id)
    .order('sent_at', { ascending: false });

  if (emailError) {
    console.error('メール履歴の取得エラー:', emailError);
  } else {
    console.log('買主6647のメール送信履歴:', emailHistory.length, '件');
    emailHistory.forEach((email, index) => {
      console.log(`\n${index + 1}. メールID: ${email.id}`);
      console.log('   物件番号:', email.property_number);
      console.log('   送信日時:', email.sent_at);
      console.log('   件名:', email.subject);
      console.log('   送信者:', email.sent_by);
    });
    console.log('\n');
  }

  // 5. 買主6648の情報を確認（buyer_numberで検索）
  const { data: buyers6648, error: buyer6648Error } = await supabase
    .from('buyers')
    .select('*')
    .eq('buyer_number', '6648');

  if (buyer6648Error || !buyers6648 || buyers6648.length === 0) {
    console.error('買主6648の取得エラー:', buyer6648Error || '買主が見つかりません');
  } else {
    const buyer6648 = buyers6648[0];
    console.log('買主6648の基本情報:');
    console.log('- ID:', buyer6648.id);
    console.log('- 買主番号:', buyer6648.buyer_number);
    console.log('- 名前:', buyer6648.name);
    console.log('- メール:', buyer6648.email);
    console.log('- 電話:', buyer6648.phone_number);
    console.log('- 物件番号:', buyer6648.property_number);
    console.log('- 問合せ日:', buyer6648.inquiry_date);
    console.log('- 問合せ元:', buyer6648.inquiry_source);
    console.log('\n');
  }
}

debugBuyer6647InquiryHistory().catch(console.error);
