import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAA2022Sync() {
  console.log('物件AA2022の同期状況を確認中...\n');

  // データベースからAA2022のデータを取得
  const { data: workTask, error } = await supabase
    .from('work_tasks')
    .select('*')
    .eq('property_number', 'AA2022')
    .single();

  if (error) {
    console.error('エラー:', error.message);
    return;
  }

  if (!workTask) {
    console.log('物件AA2022が見つかりません');
    return;
  }

  console.log('=== 物件AA2022のデータ ===\n');
  console.log('物件番号:', workTask.property_number);
  console.log('物件所在:', workTask.property_address);
  console.log('売主:', workTask.seller_name);
  console.log('\n=== 契約決済タブのフィールド ===\n');
  
  // 契約決済タブの主要フィールドを確認
  const fields = [
    { label: '売買契約締め日', field: 'sales_contract_deadline' },
    { label: '売買契約備考', field: 'sales_contract_notes' },
    { label: '売買資料ドライブ', field: 'sales_materials_drive' },
    { label: '契約形態', field: 'contract_type' },
    { label: '重説・契約書入力納期', field: 'contract_input_deadline' },
    { label: '依頼前に確認', field: 'pre_request_check' },
    { label: 'コメント（売買契約）', field: 'sales_contract_comment' },
    { label: '広瀬さんへ依頼（売買契約関連）', field: 'hirose_request_sales' },
    { label: 'CWへ依頼（売買契約関連）', field: 'cw_request_sales' },
    { label: '社員が契約書作成', field: 'employee_contract_creation' },
    { label: '作業内容', field: 'work_content' },
    { label: '作業完了コメント', field: 'work_completed_comment' },
    { label: '廣瀬さんへ完了チャット（売買関連）', field: 'hirose_completed_chat_sales' },
    { label: 'CWへ完了チャット（売買関連）', field: 'cw_completed_chat_sales' },
    { label: '完了コメント（売買関連）', field: 'completed_comment_sales' },
    { label: '製本予定日', field: 'binding_scheduled_date' },
    { label: '製本完了', field: 'binding_completed' },
    { label: '売・支払方法', field: 'seller_payment_method' },
    { label: '買・支払方法', field: 'buyer_payment_method' },
    { label: '仲介手数料（売）', field: 'brokerage_fee_seller' },
    { label: '仲介手数料（買）', field: 'brokerage_fee_buyer' },
    { label: '売買価格', field: 'sales_price' },
    { label: 'キャンペーン', field: 'campaign' },
    { label: '減額理由他', field: 'discount_reason_other' },
    { label: '紹介チラシ渡し', field: 'referral_flyer_given' },
    { label: '口コミ（売主）', field: 'review_seller' },
    { label: '口コミ（買主）', field: 'review_buyer' },
    { label: '他コメント', field: 'other_comments' },
    { label: '決済完了チャット', field: 'settlement_completed_chat' },
    { label: '台帳作成済み', field: 'ledger_created' },
    { label: '入金確認（売）', field: 'payment_confirmed_seller' },
    { label: '入金確認（買）', field: 'payment_confirmed_buyer' },
    { label: '経理確認済み', field: 'accounting_confirmed' },
    { label: '国広とチャット', field: 'kunihiro_chat' },
    { label: '山本へチャット送信', field: 'yamamoto_chat' },
    { label: '裏へチャット送信', field: 'ura_chat' },
    { label: '角井へチャット送信', field: 'kadoi_chat' },
  ];

  fields.forEach(({ label, field }) => {
    const value = workTask[field];
    const status = value ? '✅' : '❌';
    console.log(`${status} ${label}: ${value || '(空)'}`);
  });

  console.log('\n=== 同期されていないフィールド ===\n');
  const emptyFields = fields.filter(({ field }) => !workTask[field]);
  if (emptyFields.length === 0) {
    console.log('全てのフィールドが同期されています！');
  } else {
    emptyFields.forEach(({ label, field }) => {
      console.log(`- ${label} (${field})`);
    });
  }
}

checkAA2022Sync().catch(console.error);
